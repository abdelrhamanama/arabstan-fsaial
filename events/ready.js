const config = require('../config/config');
const { updateFactionLeaderboard } = require('../utils/leaderboard');
const { startAutoBackup } = require('../utils/backup');
const { isConfiguredId, normalizeId } = require('../utils/factionAccess');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`🔥 Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);

    startAutoBackup(60);

    for (const [factionKey, faction] of Object.entries(config.factions)) {
      if (!isConfiguredId(faction.leaderboardChannel)) continue;

      try {
        const channel = await client.channels.fetch(normalizeId(faction.leaderboardChannel));
        if (channel) {
          await updateFactionLeaderboard(channel, factionKey);
          console.log(`✅ ${faction.name} leaderboard initialized on startup`);
        }
      } catch (err) {
        console.error(`❌ Failed to initialize ${faction.name} leaderboard:`, err.message);
      }
    }
  },
};
