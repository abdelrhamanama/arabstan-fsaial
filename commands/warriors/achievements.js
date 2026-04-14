const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readFactionData } = require('../../utils/dbManager');
const { getFactionLevelInfo } = require('../../utils/factionAchievements');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('انجازات_المحارب')
    .setDescription('اعرض إنجازاتك كمحارب ومستواك 🏆'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const userData = await readFactionData(userId, 'warriors');

    if (userData.points === 0) {
      return interaction.reply({ content: '❌ لا تملك أي بيانات محارب بعد. استخدم `/ضربة` أولاً!', ephemeral: true });
    }

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(userData.points, 'warriors');
    const achievements = userData.achievements && userData.achievements.length > 0
      ? userData.achievements.join('\n')
      : '*لا يوجد إنجازات بعد*';
    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];

    const embed = new EmbedBuilder()
      .setTitle('📜 إنجازات المحارب')
      .setColor(levelColor[currentLevel] || 0xe67e22)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '📊 المستوى', value: currentLevel === 0 ? 'بدون مستوى' : `**${currentLevel}** — ${currentTitle}`, inline: true },
        { name: '⚔️ الضربات', value: `**${userData.points}**`, inline: true },
        { name: '🏆 الإنجازات', value: achievements },
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: '🎯 للمستوى القادم',
        value: `\`${progressBar}\` متبقي **${remaining}** ضربة`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟', value: 'وصلت للمستوى الأقصى!' });
    }

    interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
