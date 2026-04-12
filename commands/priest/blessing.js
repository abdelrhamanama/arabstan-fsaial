const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/config');
const { getBlessingResult } = require('../../utils/random');
const { checkAchievements, getLevelInfo } = require('../../utils/achievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readData, writeData } = require('../../utils/dataManager');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.priests;
const usersPath = path.join(__dirname, '../../data/users.json');
const cooldownsPath = path.join(__dirname, '../../data/cooldowns.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('بركة')
    .setDescription('استخدم بركتك 🙏'),

  async execute(interaction) {
    if (isConfiguredId(faction.channel) && interaction.channelId !== normalizeId(faction.channel)) {
      return interaction.reply({ content: '❌ هذا الأمر يعمل في قناة البركة فقط!', ephemeral: true });
    }

    if (!memberHasAnyRole(interaction.member, faction.roles)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام البركة!', ephemeral: true });
    }

    const users = readData(usersPath);
    const cooldowns = readData(cooldownsPath);
    const userId = interaction.user.id;
    const now = Date.now();

    if (cooldowns[userId] && now < cooldowns[userId]) {
      const timeLeft = Math.ceil((cooldowns[userId] - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام البركة مرة أخرى.`,
        ephemeral: true,
      });
    }

    if (!users[userId]) {
      users[userId] = { blessings: 0, achievements: [] };
    }

    const result = getBlessingResult();
    let newAchievement = null;

    if (result.type === 'success') {
      users[userId].blessings += 1;
      newAchievement = checkAchievements(users[userId]);
    }

    writeData(usersPath, users);
    cooldowns[userId] = now + config.cooldownTime * 1000;
    writeData(cooldownsPath, cooldowns);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getLevelInfo(users[userId].blessings);

    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];
    const color = levelColor[currentLevel] || 0x9b59b6;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(result.type === 'success' ? '✅ بركة ناجحة!' : '❌ لم تُقبل البركة')
      .setDescription(result.text)
      .addFields(
        {
          name: '📊 مستواك الحالي',
          value: currentLevel === 0 ? '`لم تصل لأي مستوى بعد`' : `المستوى **${currentLevel}** — ${currentTitle}`,
          inline: true,
        },
        {
          name: '🙏 إجمالي البركات',
          value: `**${users[userId].blessings}** بركة`,
          inline: true,
        }
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: `🎯 المستوى القادم — ${nextLevel.title}`,
        value: `\`${progressBar}\`\nمتبقي **${remaining}** بركة للوصول للمستوى **${nextLevel.level}**`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟 أقصى مستوى!', value: 'وصلت للمستوى الأسطوري، أنت الأفضل!' });
    }

    embed.setFooter({ text: 'المستويات: 100 ⟶ 200 ⟶ 300 ⟶ 500 ⟶ 800' });

    // الرد يظهر بس للشخص اللي كتب الأمر
    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (newAchievement) {
      await interaction.channel.send(`🏆 <@${userId}> حصل على إنجاز جديد: **${newAchievement}**!`);
    }

    if (isConfiguredId(faction.leaderboardChannel)) {
      try {
        const leaderboardChannel = interaction.guild.channels.cache.get(normalizeId(faction.leaderboardChannel));
        if (leaderboardChannel) await updateFactionLeaderboard(leaderboardChannel, 'priests');
      } catch (err) {
        console.error('Leaderboard update error:', err.message);
      }
    }
  },
};
