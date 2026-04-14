const { logCommand } = require('../utils/dbManager');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
      // Log the command after successful execution
      await logCommand(
        interaction.user.id,
        interaction.user.username,
        interaction.commandName,
        JSON.stringify(interaction.options.data),
        interaction.guildId,
        interaction.guild?.name
      ).catch(err =>
        console.error('❌ Command logger error:', err.message)
      );
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      const msg = { content: '❌ حدث خطأ أثناء تنفيذ الأمر!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  },
};
