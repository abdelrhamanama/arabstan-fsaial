const path = require('path');
const { levels: priestLevels } = require('./achievements');
const { getFactionLevels } = require('./factionAchievements');

const dataDir = path.join(__dirname, '../data');

const factionData = {
  priests: {
    name: 'الكهنة',
    usersPath: path.join(dataDir, 'users.json'),
    field: 'blessings',
    unit: 'بركة',
    levels: priestLevels,
    leaderboardKey: 'priests',
  },
  warriors: {
    name: 'المحاربين',
    usersPath: path.join(dataDir, 'warriors_users.json'),
    field: 'points',
    unit: 'ضربة',
    levels: getFactionLevels('warriors'),
    leaderboardKey: 'warriors',
  },
  mages: {
    name: 'السحرة',
    usersPath: path.join(dataDir, 'mages_users.json'),
    field: 'points',
    unit: 'تعويذة',
    levels: getFactionLevels('mages'),
    leaderboardKey: 'mages',
  },
};

function getFactionData(factionKey) {
  return factionData[factionKey];
}

function ensureFactionUser(users, userId, field) {
  if (!users[userId]) {
    users[userId] = { [field]: 0, achievements: [] };
  }

  if (typeof users[userId][field] !== 'number') {
    users[userId][field] = 0;
  }

  if (!Array.isArray(users[userId].achievements)) {
    users[userId].achievements = [];
  }

  return users[userId];
}

function syncLevelAchievements(user, factionConfig) {
  const unlocked = [];

  for (const level of factionConfig.levels) {
    if (user[factionConfig.field] >= level.required && !user.achievements.includes(level.achievement)) {
      user.achievements.push(level.achievement);
      unlocked.push(level.achievement);
    }
  }

  return unlocked;
}

module.exports = {
  getFactionData,
  ensureFactionUser,
  syncLevelAchievements,
};