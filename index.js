require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { initDatabase } = require('./db/connection');

const token = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // لازم تحطه في Railway
const GUILD_ID = process.env.GUILD_ID;   // لازم تحطه برضه

if (!token) {
  console.error('❌ Missing Discord bot token. Add TOKEN in Railway Variables');
  process.exit(1);
}

if (!CLIENT_ID || !GUILD_ID) {
  console.error('❌ Missing CLIENT_ID or GUILD_ID in environment variables');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // ✅ مهم للرولات
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// 📂 تحميل الأوامر
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

// 📂 تحميل الأحداث
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

// 🤖 لما البوت يشتغل
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(token);

    // 🧹 مسح الأوامر القديمة (مرة واحدة بس)
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    );

    console.log('🧹 Old global commands cleared');

    // 🚀 تسجيل الأوامر للسيرفر مباشرة
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commandsData }
    );

    console.log(`✅ Guild slash commands registered (${commandsData.length})`);
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

// 🚀 تشغيل الداتابيز ثم البوت
initDatabase()
  .then(() => {
    console.log('✅ Database ready, starting bot...');
    return client.login(token);
  })
  .catch((err) => {
    console.error('❌ Database failed, bot will not start:', err);
    process.exit(1);
  });
