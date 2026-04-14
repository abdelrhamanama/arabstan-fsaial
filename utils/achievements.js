const levels = [
  { level: 1, required: 100,  achievement: '🌱 خادم النجوم',   title: 'مبتدئ'   },
  { level: 2, required: 200,  achievement: '⚡ كاهن النجوم',   title: 'متقدم'    },
  { level: 3, required: 300,  achievement: '🔥 حامل كتاب الأقدار',   title: 'محترف'    },
  { level: 4, required: 500,  achievement: '👑 سيد الطقوس القديمة',    title: 'كبير'     },
  { level: 5, required: 800,  achievement: '🌟 قائد الطقوس',  title: 'أسطوري'   },
];

function getLevelInfo(blessings) {
  let currentLevel = 0;
  let currentTitle = 'بدون لقب';
  let nextLevel = levels[0];

  for (const lvl of levels) {
    if (blessings >= lvl.required) {
      currentLevel = lvl.level;
      currentTitle = lvl.title;
      nextLevel = levels[lvl.level] || null;
    } else {
      if (currentLevel === 0) nextLevel = lvl;
      break;
    }
  }

  const remaining = nextLevel ? nextLevel.required - blessings : 0;
  const progressMax = nextLevel
    ? nextLevel.required - (currentLevel > 0 ? levels[currentLevel - 1].required : 0)
    : 0;
  const progressCurrent = nextLevel
    ? blessings - (currentLevel > 0 ? levels[currentLevel - 1].required : 0)
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

function checkAchievements(user) {
  let newAchievement = null;

  for (const lvl of levels) {
    if (user.blessings >= lvl.required && !user.achievements.includes(lvl.achievement)) {
      user.achievements.push(lvl.achievement);
      newAchievement = lvl.achievement;
    }
  }

  return newAchievement;
}

function syncAchievementsWithLevels(blessings, achievements) {
  const newAchievements = [...achievements];
  let unlockedAchievements = [];

  for (const lvl of levels) {
    if (blessings >= lvl.required && !newAchievements.includes(lvl.achievement)) {
      newAchievements.push(lvl.achievement);
      unlockedAchievements.push(lvl.achievement);
    }
  }

  return { achievements: newAchievements, unlocked: unlockedAchievements };
}

module.exports = { levels, getLevelInfo, checkAchievements, syncAchievementsWithLevels };
