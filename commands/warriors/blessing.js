const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getFactionLevelInfo, checkFactionAchievements } = require('../../utils/factionAchievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readFactionData, writeFactionData, getCooldown, setCooldown, addAchievement } = require('../../utils/dbManager');
const { isConfiguredId, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.warriors;

const attackResults = [
  { type: 'success', text: '⚔️ ضربة ناجحة! المحارب أثبت قوته.' },
  { type: 'success', text: '🛡️ هجوم قوي هزّ أرض المعركة!' },
  { type: 'success', text: '🔥 المحارب حقق انتصارًا جديدًا!' },
  { type: 'fail', text: '❌ الضربة لم تصب الهدف، حاول مرة أخرى.' },
  { type: 'fail', text: '😔 العدو تفادى الضربة هذه المرة.' },
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ضربة')
    .setDescription('استخدم ضربة المحارب ⚔️'),

  async execute(interaction) {
    // ✅ جلب العضو كامل بالرولات
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // ✅ التحقق من القناة
    if (isConfiguredId(faction.channel) && interaction.channelId !== normalizeId(faction.channel)) {
      return interaction.reply({ content: '❌ هذا الأمر يعمل في قناة المحاربين فقط!', ephemeral: true });
    }

    // ✅ التحقق من الرول (أي رول من الليست)
    const hasRole = faction.roles.some(roleId =>
      member.roles.cache.has(roleId)
    );

    if (!hasRole) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام أوامر المحاربين!', ephemeral: true });
    }

    const userId = interaction.user.id;
    const now = Date.now();

    // Check cooldown
    const cooldownTime = await getCooldown(userId, 'warriors');
    if (cooldownTime && now < cooldownTime) {
      const timeLeft = Math.ceil((cooldownTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام الضربة مرة أخرى.`,
        ephemeral: true,
      });
    }

    // Get user data
    const userData = await readFactionData(userId, 'warriors');
    const result = randomChoice(attackResults);
    let newAchievement = null;

    if (result.type === 'success') {
      userData.points += 1;
      
      // Check for new achievements
      for (const level of require('../../utils/factionAchievements').getFactionLevels('warriors')) {
        if (userData.points >= level.required && !userData.achievements.includes(level.achievement)) {
          await addAchievement(userId, 'warriors', level.achievement);
          newAchievement = level.achievement;
          break;
        }
      }
    }

    // Save user data
    await writeFactionData(userId, 'warriors', userData);
    
    // Set cooldown
    await setCooldown(userId, 'warriors', now + config.cooldownTime * 1000);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(userData.points, 'warriors');

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(result.type === 'success' ? '✅ ضربة ناجحة!' : '❌ ضربة فاشلة')
      .setDescription(result.text)
      .addFields(
        {
          name: '📊 مستواك الحالي',
          value: currentLevel === 0 ? '`لم تصل لأي مستوى بعد`' : `المستوى **${currentLevel}** — ${currentTitle}`,
          inline: true,
        },
        {
          name: '⚔️ إجمالي الضربات',
          value: `**${userData.points}** ضربة`,
          inline: true,
        }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (newAchievement) {
      await interaction.channel.send(`🏆 <@${userId}> حصل على إنجاز جديد: **${newAchievement}**!`);
    }

    if (isConfiguredId(faction.leaderboardChannel)) {
      try {
        const leaderboardChannel = interaction.guild.channels.cache.get(normalizeId(faction.leaderboardChannel));
        if (leaderboardChannel) await updateFactionLeaderboard(leaderboardChannel, 'warriors');
      } catch (err) {
        console.error(err);
      }
    }
  },
};
