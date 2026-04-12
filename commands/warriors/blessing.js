const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/config');
const { getFactionLevelInfo, checkFactionAchievements } = require('../../utils/factionAchievements');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { readData, writeData } = require('../../utils/dataManager');
const { isConfiguredId, memberHasAnyRole, normalizeId } = require('../../utils/factionAccess');

const faction = config.factions.warriors;
const usersPath = path.join(__dirname, '../../data/warriors_users.json');
const cooldownsPath = path.join(__dirname, '../../data/warriors_cooldowns.json');

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
    if (isConfiguredId(faction.channel) && interaction.channelId !== normalizeId(faction.channel)) {
      return interaction.reply({ content: '❌ هذا الأمر يعمل في قناة المحاربين فقط!', ephemeral: true });
    }

    if (!memberHasAnyRole(interaction.member, faction.roles)) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية استخدام أوامر المحاربين!', ephemeral: true });
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
        content: `⏳ انتظر **${minutes}م ${seconds}ث** قبل استخدام الضربة مرة أخرى.`,
        ephemeral: true,
      });
    }

    if (!users[userId]) {
      users[userId] = { points: 0, achievements: [] };
    }

    const result = randomChoice(attackResults);
    let newAchievement = null;

    if (result.type === 'success') {
      users[userId].points += 1;
      newAchievement = checkFactionAchievements(users[userId], 'warriors');
    }

    writeData(usersPath, users);
    cooldowns[userId] = now + config.cooldownTime * 1000;
    writeData(cooldownsPath, cooldowns);

    const { currentLevel, currentTitle, nextLevel, remaining, progressBar, maxed } = getFactionLevelInfo(users[userId].points, 'warriors');
    const levelColor = [0x95a5a6, 0x2ecc71, 0x3498db, 0xe67e22, 0x9b59b6, 0xf1c40f];
    const color = levelColor[currentLevel] || 0xe67e22;

    const embed = new EmbedBuilder()
      .setColor(color)
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
          value: `**${users[userId].points}** ضربة`,
          inline: true,
        }
      );

    if (!maxed && nextLevel) {
      embed.addFields({
        name: `🎯 المستوى القادم — ${nextLevel.title}`,
        value: `\`${progressBar}\`\nمتبقي **${remaining}** ضربة للوصول للمستوى **${nextLevel.level}**`,
      });
    } else if (maxed) {
      embed.addFields({ name: '🌟 أقصى مستوى!', value: 'وصلت للمستوى الأسطوري، أنت الأقوى!' });
    }

    embed.setFooter({ text: 'المستويات: 100 ⟶ 200 ⟶ 300 ⟶ 500 ⟶ 800' });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    if (newAchievement) {
      await interaction.channel.send(`🏆 <@${userId}> حصل على إنجاز جديد: **${newAchievement}**!`);
    }

    if (isConfiguredId(faction.leaderboardChannel)) {
      try {
        const leaderboardChannel = interaction.guild.channels.cache.get(normalizeId(faction.leaderboardChannel));
        if (leaderboardChannel) await updateFactionLeaderboard(leaderboardChannel, 'warriors');
      } catch (err) {
        console.error('Warriors leaderboard update error:', err.message);
      }
    }
  },
};