const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const backupDir = path.join(__dirname, '../data/backups');

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function backupData() {
  ensureBackupDir();

  const files = [
    'users.json',
    'cooldowns.json',
    'settings.json',
    'warriors_users.json',
    'warriors_cooldowns.json',
    'warriors_settings.json',
    'mages_users.json',
    'mages_cooldowns.json',
    'mages_settings.json',
    'admin_actions.json',
  ];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (const file of files) {
    const src = path.join(dataDir, file);
    if (!fs.existsSync(src)) continue;

    const dest = path.join(backupDir, `${timestamp}_${file}`);
    fs.copyFileSync(src, dest);
  }

  // احتفظ بآخر 5 نسخ بس
  cleanOldBackups();

  console.log(`💾 Backup saved at ${new Date().toLocaleTimeString()}`);
}

function cleanOldBackups() {
  const allFiles = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  // اجمع الـ timestamps الفريدة
  const timestamps = [...new Set(allFiles.map(f => f.split('_').slice(0, 3).join('_')))];

  // احذف القديم لو زاد عن 5 نسخ
  if (timestamps.length > 5) {
    const toDelete = timestamps.slice(0, timestamps.length - 5);
    for (const ts of toDelete) {
      const filesToDelete = allFiles.filter(f => f.startsWith(ts));
      for (const f of filesToDelete) {
        fs.unlinkSync(path.join(backupDir, f));
      }
    }
  }
}

function startAutoBackup(intervalMinutes = 60) {
  backupData(); // backup فوري عند التشغيل
  setInterval(backupData, intervalMinutes * 60 * 1000);
  console.log(`✅ Auto-backup started every ${intervalMinutes} minutes`);
}

module.exports = { backupData, startAutoBackup };
