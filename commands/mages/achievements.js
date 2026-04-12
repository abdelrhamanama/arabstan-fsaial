const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/database');
const { getFactionLevelInfo } = require('../../utils/factionAchievements');

const FACTION_KEY = 'mages';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('انجازات_الساحر')
    .setDescription('اعرض إنجازاتك كساحر ومستواك 🏆'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const existing = await getUser(userId, FACTION_KEY);

    if (!existing || existing.blessings === 0) {
      return interaction.reply({ content: '❌ لا تملك أي بيانات ساحر بعد. استخدم `/تعويذة` أولاً!', ephemeral: true });
    }

    // blessings column stores the numeric score for all factions
    const userData = { points: existing.blessings, achievements: existing.achievements };
    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(userData.points, 'mages');
    const achievements = userData.achievements && userData.achievements.length > 0
      ? userData.achievements.join('\n')
      : '*لا يوجد إنجازات بعد*';
    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];

    const embed = new EmbedBuilder()
      .setTitle('📜 إنجازات الساحر')
      .setColor(levelColor[currentLevel] || 0x9b59b6)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '📊 المستوى', value: currentLevel === 0 ? 'بدون مستوى' : `**${currentLevel}** — ${currentTitle}`, inline: true },
        { name: '🔮 التعاويذ', value: `**${userData.points}**`, inline: true },
        { name: '🏆 الإنجازات', value: achievements },
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: '🎯 للمستوى القادم',
        value: `\`${progressBar}\` متبقي **${remaining}** تعويذة`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟', value: 'وصلت للمستوى الأقصى!' });
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  },
};