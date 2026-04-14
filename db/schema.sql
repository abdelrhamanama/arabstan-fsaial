-- Users table (unified for all factions)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE,
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Priests data
CREATE TABLE IF NOT EXISTS priests_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  blessings INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Warriors data
CREATE TABLE IF NOT EXISTS warriors_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mages data
CREATE TABLE IF NOT EXISTS mages_users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievements (unified)
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  faction VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(200) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, faction, achievement_name)
);

-- Cooldowns
CREATE TABLE IF NOT EXISTS cooldowns (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  faction VARCHAR(50) NOT NULL,
  cooldown_until BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, faction)
);

-- Command logs
CREATE TABLE IF NOT EXISTS command_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  username VARCHAR(100),
  command_name VARCHAR(100) NOT NULL,
  command_args TEXT,
  guild_id VARCHAR(32),
  guild_name VARCHAR(200),
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Admin actions audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(32) NOT NULL,
  target_user_id VARCHAR(32) NOT NULL,
  faction VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  amount INT,
  manual_achievement VARCHAR(200),
  before_points INT,
  after_points INT,
  before_achievements TEXT,
  after_achievements TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_priests_user_id ON priests_users(user_id);
CREATE INDEX IF NOT EXISTS idx_warriors_user_id ON warriors_users(user_id);
CREATE INDEX IF NOT EXISTS idx_mages_user_id ON mages_users(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_cooldowns_user_id ON cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_user_id ON command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
