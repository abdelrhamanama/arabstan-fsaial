require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const token = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;

if (!token) {
  console.error('Missing Discord bot token. Add a Replit Secret named TOKEN before starting the bot.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// تحميل الأوامر
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);
const commandsData = [];

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      commandsData.push(command.data.toJSON());
      console.log(`✅ Command loaded: /${command.data.name}`);
    }
  }
}

// تحميل الأحداث
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`✅ Event loaded: ${event.name}`);
}

// تسجيل الـ Slash Commands مع Discord
client.once('clientReady', async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsData }
    );
    console.log(`✅ Slash commands registered successfully (${commandsData.length} commands)`);
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err.message);
  }
});

client.login(token).catch((err) => {
  console.error('Failed to log in to Discord:', err.message);
  process.exit(1);
});
