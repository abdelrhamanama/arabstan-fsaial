const factionLevels = {
  warriors: [
    { level: 1, required: 100, achievement: '🛡️ القاتل الصامت', title: 'مبتدئ' },
    { level: 2, required: 200, achievement: '⚔️ سيف الظلام', title: 'متقدم' },
    { level: 3, required: 300, achievement: '🔥 قاتل الظلال', title: 'محترف' },
    { level: 4, required: 500, achievement: '👑 سهم الموت الطائر', title: 'قائد' },
    { level: 5, required: 800, achievement: '🌟 أسطورة الصحراء الخالدة', title: 'أسطوري' },
  ],
  mages: [
    { level: 1, required: 100, achievement: '🔮 ساحر الشفق الأبدي', title: 'مبتدئ' },
    { level: 2, required: 200, achievement: '✨ الساحر المتقدم', title: 'متقدم' },
    { level: 3, required: 300, achievement: '🌙 حامل تعويذة النجوم', title: 'محترف' },
    { level: 4, required: 500, achievement: '🧙 حارس العوالم المظلمة', title: 'سيد' },
    { level: 5, required: 800, achievement: '🌟 أستاذ الفنون السحرية', title: 'أسطوري' },
  ],
};

function getFactionLevels(faction) {
  return factionLevels[faction] || [];
}

function getFactionLevelInfo(points, faction) {
  const levels = getFactionLevels(faction);
  let currentLevel = 0;
  let currentTitle = 'بدون لقب';
  let nextLevel = levels[0] || null;

  for (const lvl of levels) {
    if (points >= lvl.required) {
      currentLevel = lvl.level;
      currentTitle = lvl.title;
      nextLevel = levels[lvl.level] || null;
    } else {
      if (currentLevel === 0) nextLevel = lvl;
      break;
    }
  }

  const remaining = nextLevel ? nextLevel.required - points : 0;
  const progressMax = nextLevel
    ? nextLevel.required - (currentLevel > 0 ? levels[currentLevel - 1].required : 0)
    : 0;
  const progressCurrent = nextLevel
    ? points - (currentLevel > 0 ? levels[currentLevel - 1].required : 0)
    : progressMax;
  const barLength = 10;
  const filled = nextLevel ? Math.round((progressCurrent / progressMax) * barLength) : barLength;
  const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  return {
    currentLevel,
    currentTitle,
    nextLevel,
    remaining,
    progressBar,
    progressCurrent,
    progressMax,
    maxed: nextLevel === null,
  };
}

function checkFactionAchievements(user, faction) {
  const levels = getFactionLevels(faction);
  let newAchievement = null;

  for (const lvl of levels) {
    if (user.points >= lvl.required && !user.achievements.includes(lvl.achievement)) {
      user.achievements.push(lvl.achievement);
      newAchievement = lvl.achievement;
    }
  }

  return newAchievement;
}

function syncFactionAchievementsWithLevels(points, achievements, faction) {
  const levels = getFactionLevels(faction);
  const newAchievements = [...achievements];
  let unlockedAchievements = [];

  for (const lvl of levels) {
    if (points >= lvl.required && !newAchievements.includes(lvl.achievement)) {
      newAchievements.push(lvl.achievement);
      unlockedAchievements.push(lvl.achievement);
    }
  }

  return { achievements: newAchievements, unlocked: unlockedAchievements };
}

module.exports = {
  factionLevels,
  getFactionLevels,
  getFactionLevelInfo,
  checkFactionAchievements,
  syncFactionAchievementsWithLevels,
};
