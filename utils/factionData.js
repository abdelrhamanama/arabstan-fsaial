const { levels: priestLevels } = require('./achievements');
const { getFactionLevels } = require('./factionAchievements');

const factionData = {
  priests: {
    name: 'الكهنة',
    field: 'blessings',
    unit: 'بركة',
    levels: priestLevels,
    leaderboardKey: 'priests',
  },
  warriors: {
    name: 'المحاربين',
    field: 'points',
    unit: 'ضربة',
    levels: getFactionLevels('warriors'),
    leaderboardKey: 'warriors',
  },
  mages: {
    name: 'السحرة',
    field: 'points',
    unit: 'تعويذة',
    levels: getFactionLevels('mages'),
    leaderboardKey: 'mages',
  },
};

function getFactionData(factionKey) {
  return factionData[factionKey];
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
  syncLevelAchievements,
};