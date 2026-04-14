const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getBlessingResult } = require('../../utils/random');
const { getLevelInfo, syncAchievementsWithLevels } = require('../../utils/achievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readFactionData, writeFactionData, getCooldown, setCooldown, addAchievement } = require('../../utils/dbManager');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.priests;

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

    const userId = interaction.user.id;
    const now = Date.now();

    const cooldownTime = await getCooldown(userId, 'priests');
    if (cooldownTime && now < cooldownTime) {
      const timeLeft = Math.ceil((cooldownTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام البركة مرة أخرى.`,
        ephemeral: true,
      });
    }

    const userData = await readFactionData(userId, 'priests');
    const result = getBlessingResult();
    let newAchievements = [];

    if (result.type === 'success') {
      userData.blessings += 1;
      
      const { achievements, unlocked } = syncAchievementsWithLevels(userData.blessings, userData.achievements);
      userData.achievements = achievements;
      newAchievements = unlocked;

      for (const achievement of newAchievements) {
        await addAchievement(userId, 'priests', achievement);
      }
    }

    await writeFactionData(userId, 'priests', userData);
    await setCooldown(userId, 'priests', now + config.cooldownTime * 1000);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getLevelInfo(userData.blessings);

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
          value: `**${userData.blessings}** بركة`,
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

    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (newAchievements.length > 0) {
      for (const achievement of newAchievements) {
        await interaction.channel.send(`🏆 <@${userId}> حصل على إنجاز جديد: **${achievement}**!`);
      }
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
