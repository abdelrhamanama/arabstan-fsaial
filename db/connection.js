const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initDatabase() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Database initialized: all tables ready');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    throw err;
  }
}

pool.on('error', (err) => {
  console.error('❌ Unexpected DB error:', err);
});

module.exports = { pool, initDatabase };
