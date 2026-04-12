const { EmbedBuilder } = require('discord.js');
const {
  getLeaderboard,
  getTotalBlessings,
  getLeaderboardMessageId,
  setLeaderboardMessageId,
} = require('./database');

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

/**
 * Build a leaderboard embed for a faction using live database data.
 * @param {string} factionKey
 * @returns {Promise<EmbedBuilder>}
 */
async function getFactionLeaderboardEmbed(factionKey) {
  const config = factionLeaderboards[factionKey];
  const rows = await getLeaderboard(factionKey, 10);
  const total = await getTotalBlessings(factionKey);

  const medals = ['🥇', '🥈', '🥉'];
  const leaderboard = rows.length
    ? rows
        .map((row, i) => {
          const medal = medals[i] || `**#${i + 1}**`;
          return `${medal} <@${row.user_id}> — ${row.blessings} ${config.unit}`;
        })
        .join('\n')
    : '*لا يوجد بيانات بعد*';

  return new EmbedBuilder()
    .setTitle(config.title)
    .setDescription(leaderboard)
    .setFooter({ text: `${config.totalLabel}: ${total}` })
    .setColor(config.color)
    .setTimestamp();
}

/**
 * Fetch the priests leaderboard embed (legacy helper kept for compatibility).
 * @returns {Promise<EmbedBuilder>}
 */
async function getLeaderboardEmbed() {
  return getFactionLeaderboardEmbed('priests');
}

/**
 * Update (or post) the pinned leaderboard message for a faction channel.
 * @param {import('discord.js').TextChannel} channel
 * @param {string} factionKey
 */
async function updateFactionLeaderboard(channel, factionKey) {
  const embed = await getFactionLeaderboardEmbed(factionKey);
  const storedMessageId = await getLeaderboardMessageId(factionKey);

  if (storedMessageId) {
    try {
      const msg = await channel.messages.fetch(storedMessageId);
      if (msg.author.id === channel.client.user.id) {
        await msg.edit({ embeds: [embed] });
        console.log(`✅ ${factionKey} leaderboard updated`);
        return;
      }
    } catch (_) {
      // Message was deleted or inaccessible — fall through to send a new one
    }
  }

  const newMsg = await channel.send({ embeds: [embed] });
  await setLeaderboardMessageId(factionKey, newMsg.id);
  console.log(`📌 ${factionKey} leaderboard message sent, ID:`, newMsg.id);
}

/**
 * Update the priests leaderboard (legacy helper kept for compatibility).
 * @param {import('discord.js').TextChannel} channel
 */
async function updateLeaderboard(channel) {
  return updateFactionLeaderboard(channel, 'priests');
}

module.exports = {
  getLeaderboardEmbed,
  updateLeaderboard,
  getFactionLeaderboardEmbed,
  updateFactionLeaderboard,
};

