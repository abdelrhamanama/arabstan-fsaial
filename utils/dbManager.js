const {
  ensureUser, ensureFactionUser,
  getPoints, addPoints, setPoints,
  getAchievements, addAchievement, hasAchievement,
  getCooldown, setCooldown, isCooldownActive,
  logCommand, logAdminAction,
  getLeaderboard
} = require('../db/queries');

// Wrapper functions that mimic the old readData/writeData API
async function readFactionData(userId, faction) {
  await ensureUser(userId, 'Unknown');
  await ensureFactionUser(userId, faction);
  
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  const points = await getPoints(userId, faction);
  const achievements = await getAchievements(userId, faction);
  
  return {
    [pointField]: points,
    achievements: achievements
  };
}

async function writeFactionData(userId, faction, data) {
  const pointField = faction === 'priests' ? 'blessings' : 'points';
  
  if (data[pointField] !== undefined) {
    await setPoints(userId, faction, data[pointField]);
  }
  
  if (data.achievements && Array.isArray(data.achievements)) {
    for (const achievement of data.achievements) {
      const hasIt = await hasAchievement(userId, faction, achievement);
      if (!hasIt) {
        await addAchievement(userId, faction, achievement);
      }
    }
  }
}

module.exports = {
  readFactionData,
  writeFactionData,
  getPoints, addPoints, setPoints,
  getAchievements, addAchievement, hasAchievement,
  getCooldown, setCooldown, isCooldownActive,
  logCommand, logAdminAction,
  getLeaderboard
};
