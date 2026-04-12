const config = require('../config/config');

module.exports = {
  name: 'messageCreate',

  execute(message, client) {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    command.execute(message, args, client);
  }
};