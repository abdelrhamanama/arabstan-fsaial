const { pool } = require('./connection');

// User operations
async function getUser(userId) {
  const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return result.rows[0];
}

async function createUser(userId, username) {
  const result = await pool.query(
    'INSERT INTO users (user_id, username) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET username = $2 RETURNING *',
    [userId, username]
  );
  return result.rows[0];
}

async function ensureUser(userId, username) {
  return await createUser(userId, username);
}

// Faction-specific operations
async function getFactionUser(userId, faction) {
  const table = `${faction}_users`;
  const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [userId]);
  return result.rows[0];
}

async function ensureFactionUser(userId, faction) {
  const table = `${faction}_users`;
  
  const result = await pool.query(
    `INSERT INTO ${table} (user_id) VALUES ($1) 
     ON CONFLICT (user_id) DO UPDATE SET user_id = $1 
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

async function getPoints(userId, faction) {
  const user = await getFactionUser(userId, faction);
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  return user ? user[pointField] : 0;
}

async function addPoints(userId, faction, amount) {
  const table = `${faction}_users`;
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  
  await ensureFactionUser(userId, faction);
  
  const result = await pool.query(
    `UPDATE ${table} SET ${pointField} = ${pointField} + $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return result.rows[0];
}

async function setPoints(userId, faction, amount) {
  const table = `${faction}_users`;
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  
  await ensureFactionUser(userId, faction);
  
  const result = await pool.query(
    `UPDATE ${table} SET ${pointField} = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *`,
    [amount, userId]
  );
  return result.rows[0];
}

// Achievement operations
async function getAchievements(userId, faction) {
  const result = await pool.query(
    'SELECT achievement_name FROM achievements WHERE user_id = $1 AND faction = $2 ORDER BY unlocked_at',
    [userId, faction]
  );
  return result.rows.map(row => row.achievement_name);
}

async function addAchievement(userId, faction, achievementName) {
  try {
    const result = await pool.query(
      'INSERT INTO achievements (user_id, faction, achievement_name) VALUES ($1, $2, $3) RETURNING *',
      [userId, faction, achievementName]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') return null; // Already exists
    throw err;
  }
}

async function hasAchievement(userId, faction, achievementName) {
  const result = await pool.query(
    'SELECT 1 FROM achievements WHERE user_id = $1 AND faction = $2 AND achievement_name = $3',
    [userId, faction, achievementName]
  );
  return result.rows.length > 0;
}

// Cooldown operations
async function getCooldown(userId, faction) {
  const result = await pool.query(
    'SELECT cooldown_until FROM cooldowns WHERE user_id = $1 AND faction = $2',
    [userId, faction]
  );
  return result.rows[0]?.cooldown_until || null;
}

async function setCooldown(userId, faction, cooldownUntil) {
  const result = await pool.query(
    `INSERT INTO cooldowns (user_id, faction, cooldown_until) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, faction) DO UPDATE SET cooldown_until = $3
     RETURNING *`,
    [userId, faction, cooldownUntil]
  );
  return result.rows[0];
}

async function isCooldownActive(userId, faction) {
  const cooldown = await getCooldown(userId, faction);
  return cooldown && Date.now() < cooldown;
}

// Logging operations
async function logCommand(userId, username, commandName, commandArgs, guildId, guildName) {
  const result = await pool.query(
    `INSERT INTO command_logs (user_id, username, command_name, command_args, guild_id, guild_name)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, username, commandName, commandArgs, guildId, guildName]
  );
  return result.rows[0];
}

async function logAdminAction(adminId, targetUserId, faction, operation, amount, manualAchievement, beforePoints, afterPoints, beforeAchievements, afterAchievements) {
  const result = await pool.query(
    `INSERT INTO admin_actions (admin_id, target_user_id, faction, operation, amount, manual_achievement, before_points, after_points, before_achievements, after_achievements)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [adminId, targetUserId, faction, operation, amount, manualAchievement, beforePoints, afterPoints, JSON.stringify(beforeAchievements), JSON.stringify(afterAchievements)]
  );
  return result.rows[0];
}

// Leaderboard operations
async function getLeaderboard(faction, limit = 10) {
  const table = `${faction}_users`;
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  
  const result = await pool.query(
    `SELECT user_id, ${pointField} as points FROM ${table} WHERE ${pointField} > 0 ORDER BY ${pointField} DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  getUser, createUser, ensureUser,
  getFactionUser, ensureFactionUser,
  getPoints, addPoints, setPoints,
  getAchievements, addAchievement, hasAchievement,
  getCooldown, setCooldown, isCooldownActive,
  logCommand, logAdminAction,
  getLeaderboard
};
