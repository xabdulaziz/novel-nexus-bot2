const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const TOKEN       = process.env.TOKEN;
const GUILD_NAME  = process.env.GUILD_NAME || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('clientReady', () => {
  console.log(`✅ Welcome Bot شغّال: ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  if (member.guild.name !== GUILD_NAME) return;
  if (member.user.bot) return;

  const guild = member.guild;
  const welcomeCh = guild.channels.cache.find(c => c.name.toLowerCase().includes('welcome'));
  if (!welcomeCh) return;

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`✦ مرحباً بك في ${SERVER_NAME} ✦`)
    .setDescription([
      `> *"A reader lives a thousand lives before he dies."*`,
      `> — **George R.R. Martin**`,
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
      `مرحباً ${member}! 🎉`,
      `أنت العضو رقم **${guild.memberCount}** في مجتمعنا!`,
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
      `**🚀 ابدأ رحلتك:**`,
      `> 📜 اقرأ القوانين`,
      `> 🎭 احصل على رتبتك`,
      `> 🌐 اختار مجتمعك اللغوي`,
      `> 👤 عرّف بنفسك`,
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n'))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
      { name: '📅 انضم', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
      { name: '📆 حساب منذ', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
    )
    .setFooter({ text: `${SERVER_NAME} • مجتمع القراء والكتّاب | عضو #${guild.memberCount}` })
    .setTimestamp();

  await welcomeCh.send({ content: `${member}`, embeds: [embed] });
  console.log(`👋 رحّبنا بـ ${member.user.tag}`);
});

client.on('guildMemberRemove', async (member) => {
  if (member.guild.name !== GUILD_NAME) return;
  const welcomeCh = member.guild.channels.cache.find(c => c.name.toLowerCase().includes('welcome'));
  if (!welcomeCh) return;
  const embed = new EmbedBuilder()
    .setColor(0x95A5A6)
    .setDescription(`👋 **${member.user.tag}** غادر السيرفر. نتمنى نراه مرة ثانية! 📚`)
    .setTimestamp();
  await welcomeCh.send({ embeds: [embed] });
});

client.login(TOKEN);
