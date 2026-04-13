const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS command_logs (
        id              SERIAL PRIMARY KEY,
        user_id         VARCHAR(32)  NOT NULL,
        username        VARCHAR(100) NOT NULL,
        command_name    VARCHAR(100) NOT NULL,
        command_args    TEXT,
        guild_id        VARCHAR(32)  NOT NULL,
        guild_name      VARCHAR(200) NOT NULL,
        executed_at     TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Database initialized: command_logs table ready');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    throw err;
  }
}

// حماية إضافية لو الاتصال وقع
pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
});

module.exports = { pool, initDatabase };
