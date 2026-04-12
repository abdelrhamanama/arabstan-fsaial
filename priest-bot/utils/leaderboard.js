const { EmbedBuilder } = require('discord.js');
const path = require('path');
const { readData, writeData } = require('./dataManager');

const settingsPath = path.join(__dirname, '../data/settings.json');
const usersPath = path.join(__dirname, '../data/users.json');

const factionLeaderboards = {
  priests: {
    settingsPath,
    usersPath,
    title: '👑 ترتيب الكهنة',
    field: 'blessings',
    unit: 'بركة',
    totalLabel: 'إجمالي البركات',
    color: 'Purple',
  },
  warriors: {
    settingsPath: path.join(__dirname, '../data/warriors_settings.json'),
    usersPath: path.join(__dirname, '../data/warriors_users.json'),
    title: '⚔️ ترتيب المحاربين',
    field: 'points',
    unit: 'ضربة',
    totalLabel: 'إجمالي الضربات',
    color: 'Orange',
  },
  mages: {
    settingsPath: path.join(__dirname, '../data/mages_settings.json'),
    usersPath: path.join(__dirname, '../data/mages_users.json'),
    title: '🔮 ترتيب السحرة',
    field: 'points',
    unit: 'تعويذة',
    totalLabel: 'إجمالي التعاويذ',
    color: 'Purple',
  },
};

function getLeaderboardEmbed(users) {
  const sorted = Object.entries(users)
    .filter(([, u]) => u.blessings > 0)
    .sort((a, b) => b[1].blessings - a[1].blessings)
    .slice(0, 10);

  const medals = ['🥇', '🥈', '🥉'];

  const leaderboard = sorted.length
    ? sorted.map(([id, u], i) => {
        const medal = medals[i] || `**#${i + 1}**`;
        return `${medal} <@${id}> — ${u.blessings} بركة`;
      }).join('\n')
    : '*لا يوجد بيانات بعد*';

  const totalBlessings = sorted.reduce((sum, [, u]) => sum + u.blessings, 0);

  return new EmbedBuilder()
    .setTitle('👑 ترتيب الكهنة')
    .setDescription(leaderboard)
    .setFooter({ text: `إجمالي البركات: ${totalBlessings}` })
    .setColor('Purple')
    .setTimestamp();
}

async function updateLeaderboard(channel) {
  return updateFactionLeaderboard(channel, 'priests');
}

function getFactionLeaderboardEmbed(factionKey) {
  const leaderboardConfig = factionLeaderboards[factionKey];
  const users = readData(leaderboardConfig.usersPath);
  const sorted = Object.entries(users)
    .filter(([, u]) => (u[leaderboardConfig.field] || 0) > 0)
    .sort((a, b) => (b[1][leaderboardConfig.field] || 0) - (a[1][leaderboardConfig.field] || 0))
    .slice(0, 10);

  const medals = ['🥇', '🥈', '🥉'];

  const leaderboard = sorted.length
    ? sorted.map(([id, u], i) => {
        const medal = medals[i] || `**#${i + 1}**`;
        return `${medal} <@${id}> — ${u[leaderboardConfig.field] || 0} ${leaderboardConfig.unit}`;
      }).join('\n')
    : '*لا يوجد بيانات بعد*';

  const total = Object.values(users).reduce((sum, u) => sum + (u[leaderboardConfig.field] || 0), 0);

  return new EmbedBuilder()
    .setTitle(leaderboardConfig.title)
    .setDescription(leaderboard)
    .setFooter({ text: `${leaderboardConfig.totalLabel}: ${total}` })
    .setColor(leaderboardConfig.color)
    .setTimestamp();
}

async function updateFactionLeaderboard(channel, factionKey) {
  const leaderboardConfig = factionLeaderboards[factionKey];
  const settings = readData(leaderboardConfig.settingsPath);
  const embed = getFactionLeaderboardEmbed(factionKey);

  if (settings.leaderboardMessageId) {
    try {
      const msg = await channel.messages.fetch(settings.leaderboardMessageId);
      if (msg.author.id === channel.client.user.id) {
        await msg.edit({ embeds: [embed] });
        console.log(`✅ ${factionKey} leaderboard updated`);
        return;
      }
    } catch (_) {}
  }

  const newMsg = await channel.send({ embeds: [embed] });
  settings.leaderboardMessageId = newMsg.id;
  writeData(leaderboardConfig.settingsPath, settings);
  console.log(`📌 ${factionKey} leaderboard message sent, ID:`, newMsg.id);
}

module.exports = {
  getLeaderboardEmbed,
  updateLeaderboard,
  getFactionLeaderboardEmbed,
  updateFactionLeaderboard,
};
