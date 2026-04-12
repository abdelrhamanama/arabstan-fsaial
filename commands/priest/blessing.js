const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getBlessingResult } = require('../../utils/random');
const { checkAchievements, getLevelInfo } = require('../../utils/achievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { getUser, updateUser, getCooldown, setCooldown } = require('../../utils/database');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.priests;
const FACTION_KEY = 'priests';

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

    const cooldownUntil = await getCooldown(userId, FACTION_KEY);
    if (cooldownUntil && now < cooldownUntil) {
      const timeLeft = Math.ceil((cooldownUntil - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام البركة مرة أخرى.`,
        ephemeral: true,
      });
    }

    const existing = await getUser(userId, FACTION_KEY);
    const userData = existing
      ? { blessings: existing.blessings, achievements: existing.achievements }
      : { blessings: 0, achievements: [] };

    const result = getBlessingResult();
    let newAchievement = null;

    if (result.type === 'success') {
      userData.blessings += 1;
      newAchievement = checkAchievements(userData);
    }

    await updateUser(userId, FACTION_KEY, userData.blessings, userData.achievements);
    await setCooldown(userId, FACTION_KEY, now + config.cooldownTime * 1000);

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
