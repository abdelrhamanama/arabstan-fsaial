const fs = require('fs');
const pathModule = require('path');

// ---------------------------------------------------------------------------
// Legacy JSON helpers — kept for any code that still reads non-user data
// (e.g. admin_actions.json during a transition period).
// ---------------------------------------------------------------------------

function readData(path) {
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path));
}

function writeData(path, data) {
  const dir = pathModule.dirname(path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${path}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, path);
}

module.exports = { readData, writeData };
