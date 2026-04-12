const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/config');
const { readData, writeData } = require('../../utils/dataManager');
const { getConfiguredIds, memberHasAnyRole } = require('../../utils/factionAccess');
const { updateFactionLeaderboard } = require('../../utils/leaderboard');
const { getFactionData, ensureFactionUser, syncLevelAchievements } = require('../../utils/factionData');

const auditPath = path.join(__dirname, '../../data/admin_actions.json');

function hasAdminAccess(member) {
  if (getConfiguredIds(config.adminRoles).length === 0) return false;
  return memberHasAnyRole(member, config.adminRoles);
}

function isAdminAccessConfigured() {
  return getConfiguredIds(config.adminRoles).length > 0;
}

function appendAuditLog(entry) {
  const audit = readData(auditPath);
  if (!Array.isArray(audit.actions)) {
    audit.actions = [];
  }

  audit.actions.push({
    ...entry,
    at: new Date().toISOString(),
  });

  writeData(auditPath, audit);
}

async function refreshLeaderboard(interaction, factionKey) {
  const faction = config.factions[factionKey];
  if (!faction || !faction.leaderboardChannel || faction.leaderboardChannel.startsWith('PUT_')) return;

  try {
    const channel = interaction.guild.channels.cache.get(faction.leaderboardChannel.trim());
    if (channel) {
      await updateFactionLeaderboard(channel, factionKey);
    }
  } catch (err) {
    console.error(`Admin command leaderboard refresh error for ${factionKey}:`, err.message);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ادارة_انجاز')
    .setDescription('إدارة نقاط وإنجازات أي لاعب في أي فصيل')
    .addStringOption(option =>
      option
        .setName('الفصيل')
        .setDescription('اختار الفصيل')
        .setRequired(true)
        .addChoices(
          { name: 'الكهنة', value: 'priests' },
          { name: 'المحاربين', value: 'warriors' },
          { name: 'السحرة', value: 'mages' },
        )
    )
    .addUserOption(option =>
      option
        .setName('اللاعب')
        .setDescription('اللاعب المراد تعديل بياناته')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('العملية')
        .setDescription('نوع التعديل')
        .setRequired(true)
        .addChoices(
          { name: 'إضافة نقاط', value: 'add_points' },
          { name: 'تحديد النقاط', value: 'set_points' },
          { name: 'إضافة إنجاز يدوي', value: 'add_achievement' },
        )
    )
    .addIntegerOption(option =>
      option
        .setName('العدد')
        .setDescription('عدد النقاط للإضافة أو التحديد')
        .setMinValue(0)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('الانجاز')
        .setDescription('اسم الإنجاز اليدوي المراد إضافته')
        .setMaxLength(100)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdminAccessConfigured()) {
      return interaction.reply({
        content: '❌ ليس لديك صلاحيات .',
        ephemeral: true,
      });
    }

    if (!hasAdminAccess(interaction.member)) {
      return interaction.reply({
        content: '❌ ليس لديك صلاحية استخدام أمر إدارة الإنجازات.',
        ephemeral: true,
      });
    }

    const factionKey = interaction.options.getString('الفصيل');
    const targetUser = interaction.options.getUser('اللاعب');
    const operation = interaction.options.getString('العملية');
    const amount = interaction.options.getInteger('العدد');
    const manualAchievement = interaction.options.getString('الانجاز');
    const factionData = getFactionData(factionKey);

    if (!factionData) {
      return interaction.reply({ content: '❌ الفصيل غير صحيح.', ephemeral: true });
    }

    if ((operation === 'add_points' || operation === 'set_points') && amount === null) {
      return interaction.reply({ content: '❌ لازم تكتب العدد عند تعديل النقاط.', ephemeral: true });
    }

    if (operation === 'add_achievement' && !manualAchievement) {
      return interaction.reply({ content: '❌ لازم تكتب اسم الإنجاز اليدوي.', ephemeral: true });
    }

    const users = readData(factionData.usersPath);
    const userData = ensureFactionUser(users, targetUser.id, factionData.field);
    const beforePoints = userData[factionData.field];
    const beforeAchievements = [...userData.achievements];
    let resultText = '';
    let unlockedAchievements = [];

    if (operation === 'add_points') {
      userData[factionData.field] += amount;
      unlockedAchievements = syncLevelAchievements(userData, factionData);
      resultText = `تمت إضافة **${amount} ${factionData.unit}**.`;
    }

    if (operation === 'set_points') {
      userData[factionData.field] = amount;
      unlockedAchievements = syncLevelAchievements(userData, factionData);
      resultText = `تم تحديد الرصيد إلى **${amount} ${factionData.unit}**.`;
    }

    if (operation === 'add_achievement') {
      if (!userData.achievements.includes(manualAchievement)) {
        userData.achievements.push(manualAchievement);
        resultText = `تمت إضافة إنجاز يدوي: **${manualAchievement}**.`;
      } else {
        resultText = `اللاعب يمتلك الإنجاز بالفعل: **${manualAchievement}**.`;
      }
    }

    writeData(factionData.usersPath, users);

    appendAuditLog({
      adminId: interaction.user.id,
      targetUserId: targetUser.id,
      faction: factionKey,
      operation,
      amount,
      manualAchievement,
      beforePoints,
      afterPoints: userData[factionData.field],
      beforeAchievements,
      afterAchievements: userData.achievements,
    });

    await refreshLeaderboard(interaction, factionKey);

    const embed = new EmbedBuilder()
      .setTitle('✅ تم تعديل بيانات اللاعب')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'الفصيل', value: factionData.name, inline: true },
        { name: 'اللاعب', value: `<@${targetUser.id}>`, inline: true },
        { name: 'النتيجة', value: resultText },
        { name: 'الرصيد قبل', value: `${beforePoints} ${factionData.unit}`, inline: true },
        { name: 'الرصيد بعد', value: `${userData[factionData.field]} ${factionData.unit}`, inline: true },
      )
      .setTimestamp();

    if (unlockedAchievements.length > 0) {
      embed.addFields({
        name: 'إنجازات اتفتحت تلقائيًا',
        value: unlockedAchievements.join('\n'),
      });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};