function normalizeId(id) {
  return String(id || '').trim();
}

function isConfiguredId(id) {
  const normalized = normalizeId(id);
  return normalized && !normalized.startsWith('PUT_');
}

function getConfiguredIds(ids) {
  return (ids || []).map(normalizeId).filter(isConfiguredId);
}

function memberHasAnyRole(member, roleIds) {
  const configuredRoles = getConfiguredIds(roleIds);
  if (configuredRoles.length === 0) return true;
  if (!member || !member.roles) return false;

  if (member.roles.cache) {
    return configuredRoles.some(roleId => member.roles.cache.has(roleId));
  }

  if (Array.isArray(member.roles)) {
    return configuredRoles.some(roleId => member.roles.includes(roleId));
  }

  return false;
}

module.exports = {
  normalizeId,
  isConfiguredId,
  getConfiguredIds,
  memberHasAnyRole,
};