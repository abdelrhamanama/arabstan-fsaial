const { Pool } = require('pg');

let pool = null;

/**
 * Initialize the PostgreSQL connection pool and create tables if they don't exist.
 */
async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Verify connectivity
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('✅ PostgreSQL connected successfully');
  } finally {
    client.release();
  }

  await createTables();
}

/**
 * Create all required tables if they do not already exist.
 */
async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL,
      faction       TEXT NOT NULL,
      blessings     INTEGER NOT NULL DEFAULT 0,
      achievements  TEXT[] NOT NULL DEFAULT '{}',
      created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, faction)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cooldowns (
      id             SERIAL PRIMARY KEY,
      user_id        TEXT NOT NULL,
      faction        TEXT NOT NULL,
      cooldown_until BIGINT NOT NULL DEFAULT 0,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, faction)
    );
  `);

  // Leaderboard message IDs (replaces the per-faction settings JSON files)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard_settings (
      faction                TEXT PRIMARY KEY,
      leaderboard_message_id TEXT,
      updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ Database tables verified/created');
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a user row. Returns null if the user doesn't exist yet.
 * @param {string} userId
 * @param {string} faction
 */
async function getUser(userId, faction) {
  const res = await pool.query(
    'SELECT * FROM users WHERE user_id = $1 AND faction = $2',
    [userId, faction]
  );
  return res.rows[0] || null;
}

/**
 * Insert or update a user's blessings/points and achievements.
 * @param {string} userId
 * @param {string} faction
 * @param {number} blessings  - the numeric score (blessings for priests, points for others)
 * @param {string[]} achievements
 */
async function updateUser(userId, faction, blessings, achievements) {
  await pool.query(
    `INSERT INTO users (user_id, faction, blessings, achievements, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, faction)
     DO UPDATE SET
       blessings    = EXCLUDED.blessings,
       achievements = EXCLUDED.achievements,
       updated_at   = NOW()`,
    [userId, faction, blessings, achievements]
  );
}

// ---------------------------------------------------------------------------
// Cooldown helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the cooldown timestamp (ms epoch) for a user. Returns 0 if none.
 * @param {string} userId
 * @param {string} faction
 * @returns {Promise<number>}
 */
async function getCooldown(userId, faction) {
  const res = await pool.query(
    'SELECT cooldown_until FROM cooldowns WHERE user_id = $1 AND faction = $2',
    [userId, faction]
  );
  if (!res.rows[0]) return 0;
  // pg returns BIGINT as string — convert to number
  return Number(res.rows[0].cooldown_until);
}

/**
 * Set (upsert) the cooldown for a user.
 * @param {string} userId
 * @param {string} faction
 * @param {number} cooldownTime - epoch ms when the cooldown expires
 */
async function setCooldown(userId, faction, cooldownTime) {
  await pool.query(
    `INSERT INTO cooldowns (user_id, faction, cooldown_until)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, faction)
     DO UPDATE SET cooldown_until = EXCLUDED.cooldown_until`,
    [userId, faction, cooldownTime]
  );
}

// ---------------------------------------------------------------------------
// Leaderboard helpers
// ---------------------------------------------------------------------------

/**
 * Return the top `limit` users for a faction, ordered by blessings descending.
 * @param {string} faction
 * @param {number} [limit=10]
 * @returns {Promise<Array<{user_id: string, blessings: number, achievements: string[]}>>}
 */
async function getLeaderboard(faction, limit = 10) {
  const res = await pool.query(
    `SELECT user_id, blessings, achievements
     FROM users
     WHERE faction = $1 AND blessings > 0
     ORDER BY blessings DESC
     LIMIT $2`,
    [faction, limit]
  );
  return res.rows;
}

/**
 * Return the sum of all blessings for a faction.
 * @param {string} faction
 * @returns {Promise<number>}
 */
async function getTotalBlessings(faction) {
  const res = await pool.query(
    'SELECT COALESCE(SUM(blessings), 0) AS total FROM users WHERE faction = $1',
    [faction]
  );
  return Number(res.rows[0].total);
}

// ---------------------------------------------------------------------------
// Leaderboard settings (replaces per-faction settings JSON files)
// ---------------------------------------------------------------------------

/**
 * Get the stored leaderboard message ID for a faction.
 * @param {string} faction
 * @returns {Promise<string|null>}
 */
async function getLeaderboardMessageId(faction) {
  const res = await pool.query(
    'SELECT leaderboard_message_id FROM leaderboard_settings WHERE faction = $1',
    [faction]
  );
  return res.rows[0]?.leaderboard_message_id || null;
}

/**
 * Persist the leaderboard message ID for a faction.
 * @param {string} faction
 * @param {string} messageId
 */
async function setLeaderboardMessageId(faction, messageId) {
  await pool.query(
    `INSERT INTO leaderboard_settings (faction, leaderboard_message_id, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (faction)
     DO UPDATE SET leaderboard_message_id = EXCLUDED.leaderboard_message_id, updated_at = NOW()`,
    [faction, messageId]
  );
}

// ---------------------------------------------------------------------------
// Audit log helpers
// ---------------------------------------------------------------------------

/**
 * Append an admin action to the audit_log table (created on first use).
 * @param {object} entry
 */
async function appendAuditLog(entry) {
  // Lazily create the table the first time it is needed
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id                  SERIAL PRIMARY KEY,
      admin_id            TEXT,
      target_user_id      TEXT,
      faction             TEXT,
      operation           TEXT,
      amount              INTEGER,
      manual_achievement  TEXT,
      before_points       INTEGER,
      after_points        INTEGER,
      before_achievements TEXT[],
      after_achievements  TEXT[],
      created_at          TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `INSERT INTO audit_log
       (admin_id, target_user_id, faction, operation, amount, manual_achievement,
        before_points, after_points, before_achievements, after_achievements)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      entry.adminId,
      entry.targetUserId,
      entry.faction,
      entry.operation,
      entry.amount ?? null,
      entry.manualAchievement ?? null,
      entry.beforePoints,
      entry.afterPoints,
      entry.beforeAchievements,
      entry.afterAchievements,
    ]
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Gracefully close the connection pool.
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 PostgreSQL connection pool closed');
  }
}

module.exports = {
  initDatabase,
  getUser,
  updateUser,
  getCooldown,
  setCooldown,
  getLeaderboard,
  getTotalBlessings,
  getLeaderboardMessageId,
  setLeaderboardMessageId,
  appendAuditLog,
  closeDatabase,
};
