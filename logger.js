const {
  Client, GatewayIntentBits, EmbedBuilder,
  AuditLogEvent, ChannelType, PermissionFlagsBits
} = require('discord.js');

const TOKEN      = process.env.TOKEN;
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ]
});

let logChannel = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// دالة إرسال اللوق
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const log = async (embed) => {
  if (!logChannel) return;
  await logChannel.send({ embeds: [embed] }).catch(() => {});
};

const ts = () => `<t:${Math.floor(Date.now() / 1000)}:F>`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// عند تشغيل البوت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('clientReady', async () => {
  console.log(`✅ Logger Bot شغّال: ${client.user.tag}`);
  const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
  console.log(`🏠 السيرفر: ${guild.name}`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // إنشاء كاتيجوري وقنوات اللوق
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const staffRoles = ['👑 Owner','🌟 Co-Owner','⚙️ Administrator','🛡️ Senior Moderator','🔨 Moderator']
    .map(n => guild.roles.cache.find(r => r.name === n)).filter(Boolean);

  const staffPerms = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...staffRoles.map(r => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages],
    })),
  ];

  // تحقق من وجود كاتيجوري اللوق
  let logCat = guild.channels.cache.find(c =>
    c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('server logs')
  );
  if (!logCat) {
    logCat = await guild.channels.create({
      name: '📋 ━ SERVER LOGS ━',
      type: ChannelType.GuildCategory,
      permissionOverwrites: staffPerms,
    });
    console.log('✅ كاتيجوري SERVER LOGS أُنشئت!');
  }

  // قنوات اللوق
  const logChannels = {
    'all-logs':        '📋 جميع الأحداث',
    'member-logs':     '👥 الأعضاء',
    'message-logs':    '💬 الرسائل',
    'moderation-logs': '🔨 الإدارة',
    'voice-logs':      '🔊 الصوت',
    'server-logs':     '⚙️ السيرفر',
  };

  for (const [name, topic] of Object.entries(logChannels)) {
    let ch = guild.channels.cache.find(c => c.name === name && c.parentId === logCat.id);
    if (!ch) {
      ch = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: logCat,
        topic,
        permissionOverwrites: staffPerms,
      });
      console.log(`✅ قناة ${name} أُنشئت!`);
    }
    if (name === 'all-logs') logChannel = ch;
  }

  // احفظ مرجع لكل القنوات
  client.logChannels = {
    all:  guild.channels.cache.find(c => c.name === 'all-logs'),
    member: guild.channels.cache.find(c => c.name === 'member-logs'),
    message: guild.channels.cache.find(c => c.name === 'message-logs'),
    mod:  guild.channels.cache.find(c => c.name === 'moderation-logs'),
    voice: guild.channels.cache.find(c => c.name === 'voice-logs'),
    server: guild.channels.cache.find(c => c.name === 'server-logs'),
  };
  logChannel = client.logChannels.all;

  console.log('✅ Logger Bot جاهز وكل القنوات شغّالة!\n');

  // إعلان بدء البوت
  const startEmbed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🟢 Logger Bot بدأ التشغيل')
    .setDescription(`البوت شغّال وجاهز لتسجيل جميع الأحداث`)
    .setTimestamp();
  await log(startEmbed);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// دالة إرسال لقناة معينة + all-logs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const logTo = async (type, embed) => {
  const ch = client.logChannels?.[type];
  if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
  if (logChannel && logChannel !== ch)
    await logChannel.send({ embeds: [embed] }).catch(() => {});
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBER LOGS — انضمام / مغادرة / تعديل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('guildMemberAdd', async (member) => {
  if (member.guild.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('👋 عضو جديد انضم')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member} (${member.user.tag})`, inline: true },
      { name: '🆔 ID', value: member.id, inline: true },
      { name: '📅 وقت الانضمام', value: ts(), inline: false },
      { name: '📆 الحساب أُنشئ', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`, inline: true },
      { name: '👥 إجمالي الأعضاء', value: `${member.guild.memberCount}`, inline: true },
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
  await logTo('member', embed);
});

client.on('guildMemberRemove', async (member) => {
  if (member.guild.name !== GUILD_NAME) return;
  const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'لا يوجد';
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚪 عضو غادر السيرفر')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
      { name: '🆔 ID', value: member.id, inline: true },
      { name: '📅 وقت المغادرة', value: ts(), inline: false },
      { name: '🎭 رتبه كانت', value: roles.length > 1000 ? roles.slice(0,1000)+'...' : roles, inline: false },
    )
    .setFooter({ text: `ID: ${member.id}` })
    .setTimestamp();
  await logTo('member', embed);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (newMember.guild.name !== GUILD_NAME) return;

  // تغيير الرتب
  const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (addedRoles.size > 0 || removedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🎭 تغيير رتبة')
      .addFields(
        { name: '👤 العضو', value: `${newMember} (${newMember.user.tag})`, inline: true },
        { name: '🆔 ID', value: newMember.id, inline: true },
        ...(addedRoles.size > 0 ? [{ name: '➕ رتبة أُضيفت', value: addedRoles.map(r=>r.name).join(', '), inline: false }] : []),
        ...(removedRoles.size > 0 ? [{ name: '➖ رتبة أُزيلت', value: removedRoles.map(r=>r.name).join(', '), inline: false }] : []),
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('member', embed);
  }

  // تغيير النيك
  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('✏️ تغيير النيك')
      .addFields(
        { name: '👤 العضو', value: `${newMember} (${newMember.user.tag})`, inline: true },
        { name: '📝 القديم', value: oldMember.nickname || 'لا يوجد', inline: true },
        { name: '📝 الجديد', value: newMember.nickname || 'لا يوجد', inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('member', embed);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MESSAGE LOGS — حذف / تعديل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('messageDelete', async (message) => {
  if (!message.guild || message.guild.name !== GUILD_NAME) return;
  if (message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ رسالة محذوفة')
    .addFields(
      { name: '👤 المرسل', value: message.author ? `${message.author.tag}` : 'مجهول', inline: true },
      { name: '📁 القناة', value: `${message.channel}`, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
      { name: '💬 المحتوى', value: message.content ? (message.content.length > 1000 ? message.content.slice(0,1000)+'...' : message.content) : '*لا يوجد نص*', inline: false },
    )
    .setFooter({ text: `ID الرسالة: ${message.id}` })
    .setTimestamp();
  await logTo('message', embed);
});

client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.guild.name !== GUILD_NAME) return;
  if (newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const embed = new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle('✏️ رسالة عُدّلت')
    .setURL(newMsg.url)
    .addFields(
      { name: '👤 المرسل', value: `${newMsg.author.tag}`, inline: true },
      { name: '📁 القناة', value: `${newMsg.channel}`, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
      { name: '📝 قبل', value: oldMsg.content ? (oldMsg.content.length > 500 ? oldMsg.content.slice(0,500)+'...' : oldMsg.content) : '*فارغة*', inline: false },
      { name: '📝 بعد', value: newMsg.content ? (newMsg.content.length > 500 ? newMsg.content.slice(0,500)+'...' : newMsg.content) : '*فارغة*', inline: false },
    )
    .setFooter({ text: `ID: ${newMsg.id}` })
    .setTimestamp();
  await logTo('message', embed);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODERATION LOGS — باند / كيك / تايم أوت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('guildBanAdd', async (ban) => {
  if (ban.guild.name !== GUILD_NAME) return;
  await sleep(500);
  const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
  const entry = audit?.entries.first();

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🔨 عضو تم حظره')
    .addFields(
      { name: '🚫 المحظور', value: `${ban.user.tag}`, inline: true },
      { name: '🆔 ID', value: ban.user.id, inline: true },
      { name: '👮 بواسطة', value: entry?.executor?.tag || 'غير معروف', inline: true },
      { name: '📋 السبب', value: ban.reason || entry?.reason || 'لا يوجد سبب', inline: false },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setThumbnail(ban.user.displayAvatarURL())
    .setTimestamp();
  await logTo('mod', embed);
});

client.on('guildBanRemove', async (ban) => {
  if (ban.guild.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('✅ رُفع الحظر عن عضو')
    .addFields(
      { name: '👤 العضو', value: `${ban.user.tag}`, inline: true },
      { name: '🆔 ID', value: ban.user.id, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setTimestamp();
  await logTo('mod', embed);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (newMember.guild.name !== GUILD_NAME) return;
  // تايم أوت
  if (!oldMember.isCommunicationDisabled() && newMember.isCommunicationDisabled()) {
    const until = newMember.communicationDisabledUntil;
    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('🔇 تايم أوت')
      .addFields(
        { name: '👤 العضو', value: `${newMember.user.tag}`, inline: true },
        { name: '⏰ حتى', value: `<t:${Math.floor(until/1000)}:F>`, inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('mod', embed);
  }
  if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔊 رُفع التايم أوت')
      .addFields(
        { name: '👤 العضو', value: `${newMember.user.tag}`, inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('mod', embed);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOICE LOGS — دخول / خروج / تنقل
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.guild.name !== GUILD_NAME) return;
  if (newState.member?.user.bot) return;

  const member = newState.member;

  if (!oldState.channel && newState.channel) {
    // دخل قناة صوت
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔊 دخل قناة صوت')
      .addFields(
        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
        { name: '🔊 القناة', value: newState.channel.name, inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('voice', embed);
  } else if (oldState.channel && !newState.channel) {
    // خرج من قناة صوت
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔇 خرج من قناة صوت')
      .addFields(
        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
        { name: '🔊 القناة', value: oldState.channel.name, inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('voice', embed);
  } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    // تنقل بين قنوات
    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🔀 تنقل بين قنوات الصوت')
      .addFields(
        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
        { name: '📤 من', value: oldState.channel.name, inline: true },
        { name: '📥 إلى', value: newState.channel.name, inline: true },
        { name: '📅 الوقت', value: ts(), inline: false },
      )
      .setTimestamp();
    await logTo('voice', embed);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SERVER LOGS — قنوات / رتب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('channelCreate', async (channel) => {
  if (channel.guild?.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('📁 قناة جديدة أُنشئت')
    .addFields(
      { name: '📁 القناة', value: `${channel.name}`, inline: true },
      { name: '🔖 النوع', value: String(channel.type), inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setTimestamp();
  await logTo('server', embed);
});

client.on('channelDelete', async (channel) => {
  if (channel.guild?.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ قناة حُذفت')
    .addFields(
      { name: '📁 القناة', value: channel.name, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setTimestamp();
  await logTo('server', embed);
});

client.on('roleCreate', async (role) => {
  if (role.guild.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('🎭 رتبة جديدة أُنشئت')
    .addFields(
      { name: '🎭 الرتبة', value: role.name, inline: true },
      { name: '🎨 اللون', value: role.hexColor, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setTimestamp();
  await logTo('server', embed);
});

client.on('roleDelete', async (role) => {
  if (role.guild.name !== GUILD_NAME) return;
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🗑️ رتبة حُذفت')
    .addFields(
      { name: '🎭 الرتبة', value: role.name, inline: true },
      { name: '📅 الوقت', value: ts(), inline: false },
    )
    .setTimestamp();
  await logTo('server', embed);
});

client.login(TOKEN);
