const { pool } = require('../db/connection');

/**
 * Logs a slash command execution to the command_logs table.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function logCommand(interaction) {
  try {
    const userId      = interaction.user.id;
    const username    = interaction.user.tag ?? interaction.user.username;
    const commandName = interaction.commandName;
    const guildId     = interaction.guildId   ?? 'DM';
    const guildName   = interaction.guild?.name ?? 'Direct Message';

    // Serialise all options into a readable "key=value" string
    const args = interaction.options?.data?.length
      ? interaction.options.data
          .map(opt => `${opt.name}=${opt.value}`)
          .join(', ')
      : null;

    await pool.query(
      `INSERT INTO command_logs
         (user_id, username, command_name, command_args, guild_id, guild_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, username, commandName, args, guildId, guildName]
    );
  } catch (err) {
    console.error('❌ Failed to log command to database:', err.message);
  }
}

module.exports = { logCommand };
