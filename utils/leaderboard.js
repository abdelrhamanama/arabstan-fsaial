const { EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../db/queries');

const factionLeaderboards = {
  priests: {
    title: '👑 ترتيب الكهنة',
    unit: 'بركة',
    totalLabel: 'إجمالي البركات',
    color: 'Purple',
  },
  warriors: {
    title: '⚔️ ترتيب المحاربين',
    unit: 'ضربة',
    totalLabel: 'إجمالي الضربات',
    color: 'Orange',
  },
  mages: {
    title: '🔮 ترتيب السحرة',
    unit: 'تعويذة',
    totalLabel: 'إجمالي التعاويذ',
    color: 'Purple',
  },
};

async function getFactionLeaderboardEmbed(factionKey) {
  const leaderboardConfig = factionLeaderboards[factionKey];
  const leaderboard = await getLeaderboard(factionKey, 10);

  const medals = ['🥇', '🥈', '🥉'];

  const leaderboardText = leaderboard.length
    ? leaderboard.map((entry, i) => {
        const medal = medals[i] || `**#${i + 1}**`;
        return `${medal} <@${entry.user_id}> — ${entry.points} ${leaderboardConfig.unit}`;
      }).join('\n')
    : '*لا يوجد بيانات بعد*';

  const total = leaderboard.reduce((sum, entry) => sum + entry.points, 0);

  return new EmbedBuilder()
    .setTitle(leaderboardConfig.title)
    .setDescription(leaderboardText)
    .setFooter({ text: `${leaderboardConfig.totalLabel}: ${total}` })
    .setColor(leaderboardConfig.color)
    .setTimestamp();
}

async function updateFactionLeaderboard(channel, factionKey) {
  const embed = await getFactionLeaderboardEmbed(factionKey);

  // Try to find and update existing leaderboard message
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const leaderboardMsg = messages.find(msg => 
      msg.author.id === channel.client.user.id && 
      msg.embeds.length > 0 && 
      msg.embeds[0].title.includes(factionLeaderboards[factionKey].title)
    );

    if (leaderboardMsg) {
      await leaderboardMsg.edit({ embeds: [embed] });
      console.log(`✅ ${factionKey} leaderboard updated`);
      return;
    }
  } catch (err) {
    console.error(`Error updating leaderboard: ${err.message}`);
  }

  // Send new leaderboard message if not found
  const newMsg = await channel.send({ embeds: [embed] });
  console.log(`📌 ${factionKey} leaderboard message sent, ID:`, newMsg.id);
}

module.exports = {
  getFactionLeaderboardEmbed,
  updateFactionLeaderboard,
};
