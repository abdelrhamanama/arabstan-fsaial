const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/config');
const { getFactionLevelInfo, checkFactionAchievements } = require('../../utils/factionAchievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readData, writeData } = require('../../utils/dataManager');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.mages;
const usersPath = path.join(__dirname, '../../data/mages_users.json');
const cooldownsPath = path.join(__dirname, '../../data/mages_cooldowns.json');

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

    const users = readData(usersPath);
    const cooldowns = readData(cooldownsPath);
    const userId = interaction.user.id;
    const now = Date.now();

    if (cooldowns[userId] && now < cooldowns[userId]) {
      const timeLeft = Math.ceil((cooldowns[userId] - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return interaction.reply({
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام التعويذة مرة أخرى.`,
        ephemeral: true,
      });
    }

    if (!users[userId]) {
      users[userId] = { points: 0, achievements: [] };
    }

    const result = randomChoice(spellResults);
    let newAchievement = null;

    if (result.type === 'success') {
      users[userId].points += 1;
      newAchievement = checkFactionAchievements(users[userId], 'mages');
    }

    writeData(usersPath, users);
    cooldowns[userId] = now + config.cooldownTime * 1000;
    writeData(cooldownsPath, cooldowns);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(users[userId].points, 'mages');
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
          value: `**${users[userId].points}** تعويذة`,
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