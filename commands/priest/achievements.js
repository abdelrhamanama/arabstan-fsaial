const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/database');
const { getLevelInfo } = require('../../utils/achievements');

const FACTION_KEY = 'priests';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('انجازات_الكاهن')
    .setDescription('اعرض إنجازاتك ككاهن ومستواك 🏆'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const existing = await getUser(userId, FACTION_KEY);

    if (!existing || existing.blessings === 0) {
      return interaction.reply({ content: '❌ لا تملك أي بيانات بعد. استخدم `/بركة` أولاً!', ephemeral: true });
    }

    const userData = existing;
    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getLevelInfo(userData.blessings);
    const achievements = userData.achievements && userData.achievements.length > 0
      ? userData.achievements.join('\n')
      : '*لا يوجد إنجازات بعد*';
    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];

    const embed = new EmbedBuilder()
      .setTitle('📜 إنجازاتك')
      .setColor(levelColor[currentLevel] || 0x9966ff)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '📊 المستوى', value: currentLevel === 0 ? 'بدون مستوى' : `**${currentLevel}** — ${currentTitle}`, inline: true },
        { name: '🙏 البركات', value: `**${userData.blessings}**`, inline: true },
        { name: '🏆 الإنجازات', value: achievements },
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: '🎯 للمستوى القادم',
        value: `\`${progressBar}\` متبقي **${remaining}** بركة`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟', value: 'وصلت للمستوى الأقصى!' });
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  },
};