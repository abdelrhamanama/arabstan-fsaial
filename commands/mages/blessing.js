const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');
const { getFactionLevelInfo } = require('../../utils/factionAchievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readFactionData, writeFactionData, getCooldown, setCooldown, addAchievement } = require('../../utils/dbManager');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.mages;

const spellResults = [
  { type: 'success', text: '🔮 تعويذة ناجحة! السحر استجاب لك.' },
  { type: 'success', text: '✨ الطاقة السحرية ملأت المكان!' },
  { type: 'success', text: '🌙 الساحر أطلق قوة عظيمة!' },
  { type: 'fail', text: '❌ التعويذة فشلت، حاول مرة أخرى.' },
  { type: 'fail', text: '😔 الطاقة السحرية لم تكتمل هذه المرة.' },
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تعويذة')
    .setDescription('استخدم تعويذة الساحر 🔮'),

  async execute(interaction) {
    if (isConfiguredId(faction.channel) && interaction.channelId !== normalizeId(faction.channel)) {
      return interaction.reply({ content: '❌ هذا الأمر يعمل في قناة السحرة فقط!', ephemeral: true });
    }

    if (!memberHasAnyRole(interaction.member, faction.roles)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام أوامر السحرة!', ephemeral: true });
    }

    const userId = interaction.user.id;
    const now = Date.now();

    // Check cooldown
    const cooldownTime = await getCooldown(userId, 'mages');
    if (cooldownTime && now < cooldownTime) {
      const timeLeft = Math.ceil((cooldownTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام التعويذة مرة أخرى.`,
        ephemeral: true,
      });
    }

    // Get user data
    const userData = await readFactionData(userId, 'mages');
    const result = randomChoice(spellResults);
    let newAchievement = null;

    if (result.type === 'success') {
      userData.points += 1;
      
      // Check for new achievements
      for (const level of require('../../utils/factionAchievements').getFactionLevels('mages')) {
        if (userData.points >= level.required && !userData.achievements.includes(level.achievement)) {
          await addAchievement(userId, 'mages', level.achievement);
          newAchievement = level.achievement;
          break;
        }
      }
    }

    // Save user data
    await writeFactionData(userId, 'mages', userData);
    
    // Set cooldown
    await setCooldown(userId, 'mages', now + config.cooldownTime * 1000);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(userData.points, 'mages');
    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];
    const color = levelColor[currentLevel] || 0x9b59b6;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(result.type === 'success' ? '✅ تعويذة ناجحة!' : '❌ تعويذة فاشلة')
      .setDescription(result.text)
      .addFields(
        {
          name: '📊 مستواك الحالي',
          value: currentLevel === 0 ? '`لم تصل لأي مستوى بعد`' : `المستوى **${currentLevel}** — ${currentTitle}`,
          inline: true,
        },
        {
          name: '🔮 إجمالي التعاويذ',
          value: `**${userData.points}** تعويذة`,
          inline: true,
        }
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: `🎯 المستوى القادم — ${nextLevel.title}`,
        value: `\`${progressBar}\`\nمتبقي **${remaining}** تعويذة للوصول للمستوى **${nextLevel.level}**`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟 أقصى مستوى!', value: 'وصلت للمستوى الأسطوري، أنت أعظم ساحر!' });
    }

    embed.setFooter({ text: 'المستويات: 100 ⟶ 200 ⟶ 300 ⟶ 500 ⟶ 800' });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (newAchievement) {
      await interaction.channel.send(`🏆 <@${userId}> حصل على إنجاز جديد: **${newAchievement}**!`);
    }

    if (isConfiguredId(faction.leaderboardChannel)) {
      try {
        const leaderboardChannel = interaction.guild.channels.cache.get(normalizeId(faction.leaderboardChannel));
        if (leaderboardChannel) await updateFactionLeaderboard(leaderboardChannel, 'mages');
      } catch (err) {
        console.error('Mages leaderboard update error:', err.message);
      }
    }
  },
};
