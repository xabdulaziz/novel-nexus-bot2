const {
  Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder
} = require('discord.js');

const TOKEN       = process.env.TOKEN;
const GUILD_NAME  = process.env.GUILD_NAME || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

client.once('clientReady', async () => {
  console.log(`✅ Welcome Bot شغّال: ${client.user.tag}`);
  const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
  console.log(`🏠 السيرفر: ${guild.name}`);
  console.log('👋 Welcome Bot جاهز!');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// رسالة الترحيب لكل عضو جديد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('guildMemberAdd', async (member) => {
  const guild = member.guild;
  if (guild.name !== GUILD_NAME) return;

  // ابحث عن قناة welcome
  const welcomeCh = guild.channels.cache.find(c =>
    c.name.toLowerCase().includes('welcome')
  );
  if (!welcomeCh) return;

  const memberCount = guild.memberCount;
  const joinDate    = `<t:${Math.floor(Date.now() / 1000)}:F>`;
  const accountAge  = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

  // رسالة الترحيب
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
      `أنت العضو رقم **${memberCount}** في مجتمعنا!`,
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      '',
      `**🚀 ابدأ رحلتك:**`,
      `> 📜 اقرأ القوانين في <#${guild.channels.cache.find(c => c.name.includes('rules'))?.id || ''}> `,
      `> 🎭 احصل على رتبتك من <#${guild.channels.cache.find(c => c.name.includes('roles'))?.id || ''}>`,
      `> 🌐 اختار مجتمعك في <#${guild.channels.cache.find(c => c.name.includes('language-roles'))?.id || ''}>`,
      `> 👤 عرّف بنفسك في <#${guild.channels.cache.find(c => c.name.includes('introductions'))?.id || ''}>`,
      '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n'))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
      { name: '📅 انضم', value: joinDate, inline: true },
      { name: '📆 حساب منذ', value: accountAge, inline: true },
    )
    .setImage('https://i.imgur.com/8Km9tLL.gif')
    .setFooter({ text: `${SERVER_NAME} • مجتمع القراء والكتّاب | عضو #${memberCount}` })
    .setTimestamp();

  await welcomeCh.send({ content: `${member}`, embeds: [embed] });
  console.log(`👋 رحّبنا بـ ${member.user.tag} (عضو #${memberCount})`);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// رسالة وداع عند مغادرة عضو
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('guildMemberRemove', async (member) => {
  const guild = member.guild;
  if (guild.name !== GUILD_NAME) return;

  const welcomeCh = guild.channels.cache.find(c =>
    c.name.toLowerCase().includes('welcome')
  );
  if (!welcomeCh) return;

  const embed = new EmbedBuilder()
    .setColor(0x95A5A6)
    .setDescription([
      `👋 **${member.user.tag}** غادر السيرفر.`,
      `نتمنى نراه مرة ثانية! 📚`,
    ].join('\n'))
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${SERVER_NAME} • الأعضاء الآن: ${guild.memberCount}` })
    .setTimestamp();

  await welcomeCh.send({ embeds: [embed] });
});

client.login(TOKEN);
