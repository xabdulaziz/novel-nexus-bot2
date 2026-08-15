// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// index.js — الملف الرئيسي الموحد
// يشغل البوت + الداش بورد في process واحد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
require('dotenv').config();  // ← يقرأ ملف .env تلقائياً

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const { setupMegaBot } = require('./mega-bot-v3');
const { setupWelcome } = require('./welcome');
const { setupLogger } = require('./logger');
const { setupDashboard } = require('./server');

const TOKEN = process.env.TOKEN;
const PORT  = process.env.PORT || 3000;

if (!TOKEN) {
  console.error('❌ TOKEN not found! Set environment variable TOKEN.');
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ONE Discord client only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ]
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ONE Express app
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const app = express();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Setup all modules (they register listeners on the shared client)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
setupMegaBot(client);
setupWelcome(client);
setupLogger(client);
setupDashboard(client, app);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Start everything
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('ready', () => {
  console.log(`✅ Bot ready: ${client.user.tag}`);
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
});

client.login(TOKEN).catch(err => {
  console.error('❌ Login failed:', err.message);
  process.exit(1);
});
