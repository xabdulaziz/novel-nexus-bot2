const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN      = process.env.TOKEN;
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('clientReady', () => {
  console.log(`✅ AutoRole Bot شغّال: ${client.user.tag}`);
  console.log('👋 كل عضو جديد يحصل رتبة Member تلقائياً');
});

client.on('guildMemberAdd', async (member) => {
  if (member.guild.name !== GUILD_NAME) return;
  if (member.user.bot) return; // البوتات ما تاخذ الرتبة

  const memberRole = member.guild.roles.cache.find(r => r.name === '📚 Member');
  if (!memberRole) {
    console.log('❌ ما لقيت رتبة Member!');
    return;
  }

  await member.roles.add(memberRole).catch(err => {
    console.log(`❌ ما قدرت أضيف الرتبة لـ ${member.user.tag}: ${err.message}`);
  });

  console.log(`✅ ${member.user.tag} حصل رتبة Member تلقائياً`);
});

client.login(TOKEN);
