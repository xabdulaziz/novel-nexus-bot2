const express = require('express');
const session = require('express-session');
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');

const app  = express();
const PORT = process.env.PORT || 3000;

const DASHBOARD_PASSWORD = process.env.DASH_PASSWORD || 'twgtoka@1234onii';
const TOKEN              = process.env.TOKEN;
const CLIENT_ID          = process.env.CLIENT_ID;
const GUILD_NAME         = process.env.GUILD_NAME || 'T.G.W';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// قواعد البيانات في الذاكرة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const db = {
  warnings: {},    // { userId: [{reason, by, byId, time, removed, removedBy, removedTime}] }
  blacklist: [],   // [{ type:'member'|'role', id, targetId, scope:'all'|'channel', channelId, addedAt, addedBy }]
  accessLogs: [],  // دخول/خروج الداشبورد
  actionLogs: [],  // ماذا عدّل
  ipLogs: [],      // سجل الـ IPs
  modLogs: [],     // كيك / باند / تحذير / تايم أوت
};

const addActionLog  = (action, details, ip, user='Dashboard') => {
  const entry = { time: new Date().toISOString(), action, details, ip, user };
  db.actionLogs.unshift(entry);
  db.ipLogs.unshift({ time: entry.time, ip, action, details });
  if (db.actionLogs.length > 200) db.actionLogs.pop();
  if (db.ipLogs.length > 200) db.ipLogs.pop();
};

const addModLog = (type, target, reason, by) => {
  db.modLogs.unshift({ time: new Date().toISOString(), type, target, reason, by });
  if (db.modLogs.length > 200) db.modLogs.pop();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Discord Client
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ]
});

let guild = null;

// Discord Permissions Map
const DISCORD_PERMS = [
  { key: 'Administrator',             label: 'أدمن (كل الصلاحيات)',      flag: PermissionFlagsBits.Administrator },
  { key: 'ManageGuild',               label: 'إدارة السيرفر',             flag: PermissionFlagsBits.ManageGuild },
  { key: 'ManageChannels',            label: 'إدارة القنوات',             flag: PermissionFlagsBits.ManageChannels },
  { key: 'ManageRoles',               label: 'إدارة الرتب',               flag: PermissionFlagsBits.ManageRoles },
  { key: 'ManageMessages',            label: 'إدارة الرسائل',             flag: PermissionFlagsBits.ManageMessages },
  { key: 'ManageNicknames',           label: 'إدارة الأسماء المستعارة',   flag: PermissionFlagsBits.ManageNicknames },
  { key: 'ManageWebhooks',            label: 'إدارة الويب هوك',           flag: PermissionFlagsBits.ManageWebhooks },
  { key: 'KickMembers',               label: 'طرد الأعضاء',               flag: PermissionFlagsBits.KickMembers },
  { key: 'BanMembers',                label: 'حظر الأعضاء',               flag: PermissionFlagsBits.BanMembers },
  { key: 'ModerateMembers',           label: 'تايم أوت',                  flag: PermissionFlagsBits.ModerateMembers },
  { key: 'MuteMembers',               label: 'كتم الأعضاء (صوت)',         flag: PermissionFlagsBits.MuteMembers },
  { key: 'MoveMembers',               label: 'نقل الأعضاء (صوت)',         flag: PermissionFlagsBits.MoveMembers },
  { key: 'ViewAuditLog',              label: 'عرض سجل الأحداث',           flag: PermissionFlagsBits.ViewAuditLog },
  { key: 'ViewChannel',               label: 'رؤية القنوات',              flag: PermissionFlagsBits.ViewChannel },
  { key: 'SendMessages',              label: 'إرسال رسائل',               flag: PermissionFlagsBits.SendMessages },
  { key: 'ReadMessageHistory',        label: 'قراءة تاريخ الرسائل',       flag: PermissionFlagsBits.ReadMessageHistory },
  { key: 'AttachFiles',               label: 'إرفاق ملفات',               flag: PermissionFlagsBits.AttachFiles },
  { key: 'EmbedLinks',                label: 'تضمين روابط',               flag: PermissionFlagsBits.EmbedLinks },
  { key: 'AddReactions',              label: 'إضافة ردود فعل',            flag: PermissionFlagsBits.AddReactions },
  { key: 'UseExternalEmojis',         label: 'استخدام إيموجي خارجي',      flag: PermissionFlagsBits.UseExternalEmojis },
  { key: 'Connect',                   label: 'الدخول للصوت',              flag: PermissionFlagsBits.Connect },
  { key: 'Speak',                     label: 'التحدث في الصوت',           flag: PermissionFlagsBits.Speak },
  { key: 'Stream',                    label: 'البث المباشر',              flag: PermissionFlagsBits.Stream },
  { key: 'UseApplicationCommands',    label: 'استخدام الأوامر',           flag: PermissionFlagsBits.UseApplicationCommands },
  { key: 'CreatePublicThreads',       label: 'إنشاء ثريدات عامة',         flag: PermissionFlagsBits.CreatePublicThreads },
  { key: 'SendMessagesInThreads',     label: 'الكتابة في الثريدات',       flag: PermissionFlagsBits.SendMessagesInThreads },
  { key: 'ManageThreads',             label: 'إدارة الثريدات',            flag: PermissionFlagsBits.ManageThreads },
  { key: 'MentionEveryone',           label: 'منشن @everyone',            flag: PermissionFlagsBits.MentionEveryone },
  { key: 'PrioritySpeaker',           label: 'أولوية الكلام (صوت)',       flag: PermissionFlagsBits.PrioritySpeaker },
  { key: 'ChangeNickname',            label: 'تغيير اسمك المستعار',       flag: PermissionFlagsBits.ChangeNickname },
];

// نظام التحذيرات التلقائي
const handleAutoTimeout = async (member, warningCount, lastReason) => {
  if (warningCount < 3) return;
  const extraWarnings = warningCount - 3;
  const minutes = 15 + (extraWarnings * 5);
  const ms = minutes * 60 * 1000;
  await member.timeout(ms, `تحذيرات متكررة: ${lastReason}`).catch(() => {});
  try {
    await member.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⏰ تم تطبيق تايم أوت عليك')
        .setDescription([
          `لقد تلقيت **${warningCount} تحذير** في سيرفر **${GUILD_NAME}**`,
          '',
          `**المدة:** ${minutes} دقيقة`,
          `**السبب:** ${lastReason}`,
          '',
          `> في كل تحذير إضافي فوق الثلاثة، تُضاف 5 دقائق إضافية للتايم أوت`,
        ].join('\n'))
        .setFooter({ text: `${GUILD_NAME} • نظام التحذيرات التلقائي` })
        .setTimestamp()
    ]});
  } catch {}
};

client.once('clientReady', async () => {
  console.log(`✅ Bot: ${client.user.tag}`);
  guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
  if (guild) {
    await guild.members.fetch().catch(() => {});
    console.log(`🏠 السيرفر: ${guild.name}`);
  }

  // تسجيل أمر /warn
  if (CLIENT_ID && guild) {
    const commands = [
      new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ أعطِ تحذيراً لعضو (هيلبر وأعلى)')
        .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
      new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('📋 شوف تحذيرات عضو')
        .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)),
      new SlashCommandBuilder()
        .setName('removewarn')
        .setDescription('🗑️ احذف تحذير (أدمن فقط)')
        .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
        .addIntegerOption(o => o.setName('index').setDescription('رقم التحذير').setRequired(true).setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commands }).catch(() => {});
    console.log('✅ أوامر التحذيرات سُجّلت!');
  }
});

// معالجة أوامر التحذيرات
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'warn') {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');
    const by     = interaction.user.tag;
    const byId   = interaction.user.id;

    if (!db.warnings[target.id]) db.warnings[target.id] = [];
    db.warnings[target.id].push({ reason, by, byId, time: new Date().toISOString(), removed: false });

    const count = db.warnings[target.id].filter(w => !w.removed).length;
    addModLog('تحذير', target.user.tag, reason, by);

    // DM للعضو
    try {
      await target.send({ embeds: [
        new EmbedBuilder()
          .setColor(0xFEA500)
          .setTitle('⚠️ تلقيت تحذيراً')
          .addFields(
            { name: '📋 السبب', value: reason, inline: false },
            { name: '👮 بواسطة', value: by, inline: true },
            { name: '⚠️ عدد تحذيراتك', value: `${count}`, inline: true },
            { name: '⏰ الوقت', value: new Date().toLocaleString('ar-SA'), inline: false },
          )
          .setDescription(count >= 3 ? '🔴 **تحذير:** لقد وصلت للحد الأقصى وسيُطبق تايم أوت تلقائياً!' : '')
          .setFooter({ text: `${GUILD_NAME} • نظام التحذيرات` })
      ]});
    } catch {}

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xFEA500)
        .setTitle('⚠️ تم إعطاء تحذير')
        .addFields(
          { name: '👤 العضو', value: target.user.tag, inline: true },
          { name: '📋 السبب', value: reason, inline: true },
          { name: '⚠️ إجمالي التحذيرات', value: `${count}`, inline: true },
        )
    ]});

    // تايم أوت تلقائي عند 3+
    if (count >= 3) await handleAutoTimeout(target, count, reason);
  }

  if (interaction.commandName === 'warnings') {
    const target = interaction.options.getMember('member');
    const warns  = db.warnings[target.id]?.filter(w => !w.removed) || [];
    const embed  = new EmbedBuilder()
      .setColor(warns.length >= 3 ? 0xED4245 : 0xFEA500)
      .setTitle(`⚠️ تحذيرات ${target.user.tag}`)
      .setDescription(warns.length === 0 ? '✅ لا يوجد تحذيرات' :
        warns.map((w,i) => `**${i+1}.** ${w.reason}\n> 👮 ${w.by} | 🕒 ${new Date(w.time).toLocaleDateString('ar-SA')}`).join('\n\n'))
      .addFields({ name: '📊 الإجمالي', value: `${warns.length} تحذير`, inline: true });
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'removewarn') {
    const target = interaction.options.getMember('member');
    const index  = interaction.options.getInteger('index') - 1;
    const warns  = db.warnings[target.id]?.filter(w => !w.removed) || [];
    if (index < 0 || index >= warns.length)
      return interaction.reply({ content: '❌ رقم التحذير غير صحيح!', ephemeral: true });

    // ابحث عن التحذير الفعلي وعلّمه محذوف
    let realIdx = -1, count = 0;
    for (let i = 0; i < (db.warnings[target.id]||[]).length; i++) {
      if (!db.warnings[target.id][i].removed) {
        if (count === index) { realIdx = i; break; }
        count++;
      }
    }
    if (realIdx >= 0) {
      db.warnings[target.id][realIdx].removed = true;
      db.warnings[target.id][realIdx].removedBy   = interaction.user.tag;
      db.warnings[target.id][realIdx].removedTime = new Date().toISOString();
      addModLog('حذف تحذير', target.user.tag, warns[index].reason, interaction.user.tag);
    }
    return interaction.reply({ content: `✅ تم حذف التحذير رقم ${index+1} من ${target.user.tag}` });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'tgw-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const requireAuth = (req, res, next) => {
  if (req.session.authenticated) return next();
  res.redirect('/login');
};

const getIP = (req) => req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Login
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/login', (req, res) => {
  res.send(loginPage(req.query.error));
});

app.post('/login', (req, res) => {
  const ip = getIP(req);
  if (req.body.password === DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    req.session.loginTime = new Date().toISOString();
    req.session.ip = ip;
    db.accessLogs.unshift({ type: 'دخول', time: new Date().toISOString(), ip });
    if (db.accessLogs.length > 200) db.accessLogs.pop();
    res.redirect('/');
  } else {
    db.accessLogs.unshift({ type: 'محاولة دخول فاشلة', time: new Date().toISOString(), ip });
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  const ip = req.session.ip || getIP(req);
  db.accessLogs.unshift({ type: 'خروج', time: new Date().toISOString(), ip });
  req.session.destroy();
  res.redirect('/login');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Main
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/', requireAuth, async (req, res) => {
  if (!guild) return res.send('<h1 style="color:white;background:#0a0a0f;padding:40px;font-family:Cairo">❌ البوت لم يتصل بعد!</h1>');
  res.send(dashboardPage(guild, client, db, DISCORD_PERMS));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — Role Permissions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/role-perms', requireAuth, async (req, res) => {
  const { roleId, permissions } = req.body;
  const ip = getIP(req);
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) return res.json({ ok: false, message: 'ما لقيت الرتبة!' });
    let bits = 0n;
    for (const perm of DISCORD_PERMS) {
      if (permissions.includes(perm.key)) bits |= perm.flag;
    }
    await role.setPermissions(bits);
    addActionLog('تعديل صلاحيات رتبة', `${role.name}: ${permissions.join(', ') || 'لا شيء'}`, ip);
    res.json({ ok: true, message: `✅ تم تحديث صلاحيات ${role.name}` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

// API — Get Role Current Perms
app.get('/api/role-perms/:roleId', requireAuth, (req, res) => {
  const role = guild.roles.cache.get(req.params.roleId);
  if (!role) return res.json({ ok: false });
  const current = DISCORD_PERMS.filter(p => role.permissions.has(p.flag)).map(p => p.key);
  res.json({ ok: true, permissions: current, name: role.name });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — Blacklist
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/blacklist', requireAuth, (req, res) => res.json({ list: db.blacklist }));

app.post('/api/blacklist/add', requireAuth, async (req, res) => {
  const { type, targetId, scope, channelId } = req.body;
  const ip = getIP(req);
  try {
    const existing = db.blacklist.find(b => b.type === type && b.targetId === targetId && b.scope === scope && b.channelId === channelId);
    if (existing) return res.json({ ok: false, message: 'موجود مسبقاً في القائمة!' });

    if (type === 'member') {
      const member = await guild.members.fetch(targetId).catch(() => null);
      if (!member) return res.json({ ok: false, message: 'ما لقيت العضو!' });

      if (scope === 'all') {
        // إخفاء كل القنوات
        for (const [, ch] of guild.channels.cache) {
          if (ch.type === 4) continue;
          await ch.permissionOverwrites.edit(member, { ViewChannel: false }).catch(() => {});
        }
      } else {
        const ch = guild.channels.cache.get(channelId);
        if (!ch) return res.json({ ok: false, message: 'ما لقيت القناة!' });
        await ch.permissionOverwrites.edit(member, { ViewChannel: false, SendMessages: false }).catch(() => {});
      }
      db.blacklist.push({ type, targetId, name: member.user.tag, scope, channelId: channelId || null, addedAt: new Date().toISOString() });
      addActionLog('إضافة للقائمة السوداء', `عضو: ${member.user.tag} | نطاق: ${scope === 'all' ? 'السيرفر كامل' : 'قناة محددة'}`, ip);
      res.json({ ok: true, message: `✅ تم إضافة ${member.user.tag} للقائمة السوداء` });

    } else if (type === 'role') {
      const role = guild.roles.cache.get(targetId);
      if (!role) return res.json({ ok: false, message: 'ما لقيت الرتبة!' });

      if (scope === 'all') {
        for (const [, ch] of guild.channels.cache) {
          if (ch.type === 4) continue;
          await ch.permissionOverwrites.edit(role, { ViewChannel: false }).catch(() => {});
        }
      } else {
        const ch = guild.channels.cache.get(channelId);
        if (!ch) return res.json({ ok: false, message: 'ما لقيت القناة!' });
        await ch.permissionOverwrites.edit(role, { ViewChannel: false, SendMessages: false }).catch(() => {});
      }
      db.blacklist.push({ type, targetId, name: role.name, scope, channelId: channelId || null, addedAt: new Date().toISOString() });
      addActionLog('إضافة للقائمة السوداء', `رتبة: ${role.name} | نطاق: ${scope === 'all' ? 'السيرفر كامل' : 'قناة محددة'}`, ip);
      res.json({ ok: true, message: `✅ تم إضافة رتبة ${role.name} للقائمة السوداء` });
    }
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/blacklist/remove', requireAuth, async (req, res) => {
  const { index } = req.body;
  const ip = getIP(req);
  const entry = db.blacklist[index];
  if (!entry) return res.json({ ok: false, message: 'ما لقيت العنصر!' });
  try {
    if (entry.type === 'member') {
      const member = await guild.members.fetch(entry.targetId).catch(() => null);
      if (member) {
        if (entry.scope === 'all') {
          for (const [, ch] of guild.channels.cache) {
            if (ch.type === 4) continue;
            await ch.permissionOverwrites.delete(member).catch(() => {});
          }
        } else {
          const ch = guild.channels.cache.get(entry.channelId);
          if (ch) await ch.permissionOverwrites.delete(member).catch(() => {});
        }
      }
    } else {
      const role = guild.roles.cache.get(entry.targetId);
      if (role) {
        if (entry.scope === 'all') {
          for (const [, ch] of guild.channels.cache) {
            if (ch.type === 4) continue;
            await ch.permissionOverwrites.delete(role).catch(() => {});
          }
        } else {
          const ch = guild.channels.cache.get(entry.channelId);
          if (ch) await ch.permissionOverwrites.delete(role).catch(() => {});
        }
      }
    }
    db.blacklist.splice(index, 1);
    addActionLog('إزالة من القائمة السوداء', `${entry.name}`, ip);
    res.json({ ok: true, message: `✅ تم إزالة ${entry.name} من القائمة السوداء` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — Warnings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/warnings', requireAuth, async (req, res) => {
  const result = [];
  for (const [userId, warns] of Object.entries(db.warnings)) {
    const active = warns.filter(w => !w.removed).length;
    if (active === 0) continue;
    const member = guild.members.cache.get(userId);
    result.push({ userId, tag: member?.user.tag || userId, active, total: warns.length, warns });
  }
  result.sort((a, b) => b.active - a.active);
  res.json({ list: result });
});

app.post('/api/warn', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  const ip = getIP(req);
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.json({ ok: false, message: 'ما لقيت العضو!' });
    if (!db.warnings[userId]) db.warnings[userId] = [];
    db.warnings[userId].push({ reason, by: 'Dashboard', byId: 'dashboard', time: new Date().toISOString(), removed: false });
    const count = db.warnings[userId].filter(w => !w.removed).length;
    addActionLog('تحذير', `${member.user.tag}: ${reason}`, ip);
    addModLog('تحذير', member.user.tag, reason, 'Dashboard');
    try {
      await member.send({ embeds: [new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تلقيت تحذيراً').addFields({ name: '📋 السبب', value: reason },{ name: '⚠️ تحذيراتك', value: `${count}` }).setFooter({ text: GUILD_NAME })] });
    } catch {}
    if (count >= 3) await handleAutoTimeout(member, count, reason);
    res.json({ ok: true, message: `✅ تم تحذير ${member.user.tag} (${count} تحذير)` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/removewarn', requireAuth, async (req, res) => {
  const { userId, index } = req.body;
  const ip = getIP(req);
  const warns = db.warnings[userId]?.filter(w => !w.removed) || [];
  if (index < 0 || index >= warns.length) return res.json({ ok: false, message: 'رقم غير صحيح!' });
  let count = 0;
  for (let i = 0; i < (db.warnings[userId]||[]).length; i++) {
    if (!db.warnings[userId][i].removed) {
      if (count === index) {
        db.warnings[userId][i].removed = true;
        db.warnings[userId][i].removedBy = 'Dashboard';
        db.warnings[userId][i].removedTime = new Date().toISOString();
        break;
      }
      count++;
    }
  }
  addActionLog('حذف تحذير', `userId: ${userId} رقم ${index+1}`, ip);
  res.json({ ok: true, message: '✅ تم حذف التحذير' });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API — Moderation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/role-assign', requireAuth, async (req, res) => {
  const { userId, roleId, action } = req.body;
  const ip = getIP(req);
  try {
    const member = await guild.members.fetch(userId);
    const role   = guild.roles.cache.get(roleId);
    if (!member) return res.json({ ok: false, message: 'ما لقيت العضو!' });
    if (!role)   return res.json({ ok: false, message: 'ما لقيت الرتبة!' });
    action === 'add' ? await member.roles.add(role) : await member.roles.remove(role);
    addActionLog(action === 'add' ? 'إضافة رتبة' : 'إزالة رتبة', `${role.name} → ${member.user.tag}`, ip);
    res.json({ ok: true, message: `✅ ${action === 'add' ? 'أُضيفت' : 'أُزيلت'} رتبة ${role.name} ${action === 'add' ? 'لـ' : 'من'} ${member.user.tag}` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/kick', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  const ip = getIP(req);
  try {
    const member = await guild.members.fetch(userId);
    const tag = member.user.tag;
    await member.kick(reason || 'لا يوجد سبب');
    addActionLog('كيك', `${tag}: ${reason}`, ip);
    addModLog('كيك', tag, reason || 'لا يوجد سبب', 'Dashboard');
    res.json({ ok: true, message: `✅ تم كيك ${tag}` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/ban', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  const ip = getIP(req);
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    const tag = member?.user.tag || userId;
    await guild.members.ban(userId, { reason: reason || 'لا يوجد سبب' });
    addActionLog('باند', `${tag}: ${reason}`, ip);
    addModLog('باند', tag, reason || 'لا يوجد سبب', 'Dashboard');
    res.json({ ok: true, message: `✅ تم باند ${tag}` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/timeout', requireAuth, async (req, res) => {
  const { userId, duration } = req.body;
  const ip = getIP(req);
  try {
    const member = await guild.members.fetch(userId);
    await member.timeout(parseInt(duration));
    const mins = parseInt(duration) / 60000;
    addActionLog('تايم أوت', `${member.user.tag}: ${mins} دقيقة`, ip);
    addModLog('تايم أوت', member.user.tag, `${mins} دقيقة`, 'Dashboard');
    res.json({ ok: true, message: `✅ تم تطبيق تايم أوت على ${member.user.tag}` });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/unban', requireAuth, async (req, res) => {
  const { userId } = req.body;
  const ip = getIP(req);
  try {
    await guild.members.unban(userId);
    addActionLog('رفع باند', userId, ip);
    res.json({ ok: true, message: '✅ تم رفع الباند' });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.post('/api/message', requireAuth, async (req, res) => {
  const { channelId, content } = req.body;
  const ip = getIP(req);
  try {
    const ch = guild.channels.cache.get(channelId);
    if (!ch) return res.json({ ok: false, message: 'ما لقيت القناة!' });
    await ch.send(content);
    addActionLog('إرسال رسالة', `#${ch.name}: ${content.slice(0,50)}`, ip);
    res.json({ ok: true, message: '✅ تم إرسال الرسالة!' });
  } catch(e) { res.json({ ok: false, message: 'خطأ: ' + e.message }); }
});

app.get('/api/member', requireAuth, async (req, res) => {
  const q = req.query.q?.toLowerCase();
  try {
    const member = guild.members.cache.find(m =>
      m.user.tag.toLowerCase().includes(q) || m.id === q || m.user.username.toLowerCase().includes(q)
    );
    if (!member) return res.json({ found: false });
    const warns = db.warnings[member.id]?.filter(w => !w.removed).length || 0;
    res.json({
      found: true, tag: member.user.tag, id: member.id,
      joined: member.joinedAt?.toLocaleDateString('ar-SA') || '؟',
      roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'لا يوجد',
      warnings: warns,
    });
  } catch { res.json({ found: false }); }
});

app.get('/api/logs', requireAuth, (req, res) => {
  res.json({ actionLogs: db.actionLogs, accessLogs: db.accessLogs, ipLogs: db.ipLogs, modLogs: db.modLogs });
});

app.get('/api/stats', requireAuth, (req, res) => {
  res.json({
    members:  guild.memberCount,
    channels: guild.channels.cache.size,
    roles:    guild.roles.cache.size,
    bots:     guild.members.cache.filter(m => m.user.bot).size,
    online:   guild.members.cache.filter(m => m.presence?.status !== 'offline' && !m.user.bot).size,
  });
});

client.login(TOKEN);
app.listen(PORT, () => console.log(`🌐 Dashboard على port ${PORT}`));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML Pages
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>T.G.W Dashboard</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;font-family:'Cairo',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(88,101,242,.15),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(255,215,0,.08),transparent 60%);pointer-events:none}
.box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:48px 40px;width:420px;backdrop-filter:blur(20px);position:relative;z-index:1}
.icon{width:72px;height:72px;background:linear-gradient(135deg,#5865F2,#FFD700);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px}
h1{color:#fff;font-size:22px;font-weight:900;text-align:center}
.sub{color:rgba(255,255,255,.4);font-size:13px;text-align:center;margin-bottom:28px}
label{display:block;color:rgba(255,255,255,.5);font-size:12px;font-weight:700;margin-bottom:6px}
input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 16px;color:#fff;font-size:15px;font-family:'Cairo',sans-serif;outline:none}
input:focus{border-color:#5865F2}
button{width:100%;background:linear-gradient(135deg,#5865F2,#4752c4);border:none;border-radius:12px;padding:14px;color:#fff;font-size:15px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;margin-top:10px}
.err{color:#ff6b6b;font-size:13px;text-align:center;background:rgba(255,107,107,.1);padding:10px;border-radius:8px;margin-bottom:12px}
</style></head><body>
<div class="box">
  <div class="icon">📚</div>
  <h1>T.G.W Dashboard</h1>
  <p class="sub">لوحة تحكم البوت</p>
  ${error ? '<p class="err">❌ كلمة المرور غلط!</p>' : ''}
  <form method="POST" action="/login">
    <label>كلمة المرور</label>
    <input type="password" name="password" placeholder="••••••••" autofocus required>
    <button>🔓 دخول</button>
  </form>
</div></body></html>`;
}

function dashboardPage(guild, client, db, DISCORD_PERMS) {
  const roles = guild.roles.cache.filter(r => r.name !== '@everyone').sort((a,b) => b.position - a.position);
  const channels = guild.channels.cache.filter(c => c.type !== 4);
  const textChannels = guild.channels.cache.filter(c => c.type === 0);
  const members = guild.members.cache.filter(m => !m.user.bot).first(20);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>T.G.W Dashboard</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--s:rgba(255,255,255,.04);--b:rgba(255,255,255,.08);--t:#fff;--m:rgba(255,255,255,.4);--ac:#5865F2;--go:#FFD700;--gr:#57F287;--rd:#ED4245;--or:#FEA500}
body{background:var(--bg);font-family:'Cairo',sans-serif;color:var(--t);display:flex;min-height:100vh}
.sidebar{width:230px;min-height:100vh;background:rgba(0,0,0,.5);border-left:1px solid var(--b);padding:20px 0;position:fixed;right:0;top:0;bottom:0;display:flex;flex-direction:column;z-index:100}
.sl{padding:0 16px 20px;border-bottom:1px solid var(--b)}
.sl-icon{width:44px;height:44px;background:linear-gradient(135deg,var(--ac),var(--go));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:10px}
.sl h2{font-size:14px;font-weight:900}
.sl p{font-size:11px;color:var(--m)}
nav{padding:12px 0;flex:1;overflow-y:auto}
.ni{display:flex;align-items:center;gap:8px;padding:10px 16px;color:var(--m);font-size:13px;font-weight:600;cursor:pointer;border-right:3px solid transparent;transition:all .2s;text-decoration:none}
.ni:hover,.ni.active{color:var(--t);background:rgba(88,101,242,.1);border-right-color:var(--ac)}
.ni .ic{font-size:16px;width:20px;text-align:center}
.sf{padding:14px 16px;border-top:1px solid var(--b)}
.lb{display:block;text-align:center;background:rgba(237,66,69,.1);border:1px solid rgba(237,66,69,.3);color:var(--rd);padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
.main{margin-right:230px;flex:1;padding:28px}
.ph{margin-bottom:24px}
.ph h1{font-size:24px;font-weight:900}
.ph p{color:var(--m);font-size:13px;margin-top:3px}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px}
.sc{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:18px;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--c) 0%,transparent 70%);opacity:.1}
.sc .lb2{font-size:11px;color:var(--m);font-weight:700;margin-bottom:6px}
.sc .val{font-size:28px;font-weight:900}
.sc .em{position:absolute;top:14px;left:14px;font-size:24px;opacity:.25}
.sec{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:20px;margin-bottom:20px}
.st{font-size:15px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
table{width:100%;border-collapse:collapse}
th{text-align:right;font-size:11px;color:var(--m);font-weight:700;padding:8px 10px;border-bottom:1px solid var(--b)}
td{padding:9px 10px;font-size:12px;border-bottom:1px solid rgba(255,255,255,.03)}
tr:last-child td{border:none}
tr:hover td{background:rgba(255,255,255,.02)}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
.bg{background:rgba(87,242,135,.2);color:var(--gr)}
.br{background:rgba(237,66,69,.2);color:var(--rd)}
.bb{background:rgba(88,101,242,.2);color:#8b9cf4}
.bo{background:rgba(254,165,0,.2);color:var(--or)}
.by{background:rgba(255,215,0,.2);color:var(--go)}
.fg{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
.fg label{font-size:11px;color:var(--m);font-weight:700}
select,input[type=text]{background:rgba(255,255,255,.05);border:1px solid var(--b);border-radius:10px;padding:9px 12px;color:var(--t);font-size:13px;font-family:'Cairo',sans-serif;outline:none;width:100%;transition:border-color .2s}
select:focus,input[type=text]:focus{border-color:var(--ac)}
select option{background:#1a1a2e}
.btn{border:none;border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;transition:all .2s}
.bp{background:var(--ac);color:#fff}
.bd{background:rgba(237,66,69,.2);color:var(--rd);border:1px solid rgba(237,66,69,.3)}
.bs{background:rgba(87,242,135,.2);color:var(--gr);border:1px solid rgba(87,242,135,.3)}
.bo2{background:rgba(254,165,0,.2);color:var(--or);border:1px solid rgba(254,165,0,.3)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.alert{padding:10px 14px;border-radius:10px;font-size:12px;margin-bottom:14px;display:none}
.as{background:rgba(87,242,135,.1);border:1px solid rgba(87,242,135,.3);color:var(--gr)}
.ae{background:rgba(237,66,69,.1);border:1px solid rgba(237,66,69,.3);color:var(--rd)}
.page{display:none}
.page.active{display:block}
.perm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.perm-item{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border:1px solid var(--b);border-radius:8px;padding:8px 12px;cursor:pointer;transition:all .2s}
.perm-item:hover{background:rgba(88,101,242,.1);border-color:var(--ac)}
.perm-item.checked{background:rgba(87,242,135,.1);border-color:rgba(87,242,135,.4)}
.perm-item input{display:none}
.perm-icon{width:16px;height:16px;border-radius:4px;border:2px solid var(--b);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.perm-item.checked .perm-icon{background:var(--gr);border-color:var(--gr)}
.perm-label{font-size:12px;color:var(--m)}
.perm-item.checked .perm-label{color:var(--t)}
code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:4px;font-size:11px;color:#a0a9ff}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
</style></head>
<body>

<aside class="sidebar">
  <div class="sl">
    <div class="sl-icon">📚</div>
    <h2>T.G.W Dashboard</h2>
    <p>${guild.name}</p>
  </div>
  <nav>
    <a class="ni active" onclick="P('overview',this)"><span class="ic">📊</span> نظرة عامة</a>
    <a class="ni" onclick="P('members',this)"><span class="ic">👥</span> الأعضاء</a>
    <a class="ni" onclick="P('roles',this)"><span class="ic">🎭</span> إدارة الرتب</a>
    <a class="ni" onclick="P('permissions',this)"><span class="ic">🔐</span> صلاحيات الرتب</a>
    <a class="ni" onclick="P('blacklist',this)"><span class="ic">🚫</span> القائمة السوداء</a>
    <a class="ni" onclick="P('warnings',this)"><span class="ic">⚠️</span> التحذيرات</a>
    <a class="ni" onclick="P('moderation',this)"><span class="ic">🔨</span> الإدارة</a>
    <a class="ni" onclick="P('channels',this)"><span class="ic">📁</span> القنوات</a>
    <a class="ni" onclick="P('bot',this)"><span class="ic">🤖</span> البوت</a>
    <a class="ni" onclick="P('logs-action',this)"><span class="ic">📋</span> سجل التعديلات</a>
    <a class="ni" onclick="P('logs-access',this)"><span class="ic">🔑</span> سجل الدخول</a>
    <a class="ni" onclick="P('logs-ip',this)"><span class="ic">🌐</span> سجل الـ IP</a>
    <a class="ni" onclick="P('logs-mod',this)"><span class="ic">⚖️</span> سجل الإدارة</a>
  </nav>
  <div class="sf"><a href="/logout" class="lb">🚪 خروج</a></div>
</aside>

<main class="main">

<!-- Overview -->
<div id="page-overview" class="page active">
  <div class="ph"><h1>📊 نظرة عامة</h1><p>إحصائيات السيرفر الحية</p></div>
  <div class="sg" id="stats-grid">
    <div class="sc" style="--c:#5865F2"><div class="lb2">الأعضاء</div><div class="val" id="st-members">${guild.memberCount}</div><div class="em">👥</div></div>
    <div class="sc" style="--c:#57F287"><div class="lb2">القنوات</div><div class="val">${guild.channels.cache.size}</div><div class="em">📁</div></div>
    <div class="sc" style="--c:#FFD700"><div class="lb2">الرتب</div><div class="val">${guild.roles.cache.size}</div><div class="em">🎭</div></div>
    <div class="sc" style="--c:#FEA500"><div class="lb2">البوتات</div><div class="val">${guild.members.cache.filter(m=>m.user.bot).size}</div><div class="em">🤖</div></div>
    <div class="sc" style="--c:#ED4245"><div class="lb2">في القائمة السوداء</div><div class="val">${db.blacklist.length}</div><div class="em">🚫</div></div>
  </div>
  <div class="sec">
    <div class="st">🏠 معلومات السيرفر</div>
    <table>
      <tr><td>الاسم</td><td><strong>${guild.name}</strong></td></tr>
      <tr><td>ID</td><td><code>${guild.id}</code></td></tr>
      <tr><td>تأسس</td><td>${guild.createdAt.toLocaleDateString('ar-SA')}</td></tr>
      <tr><td>البوت</td><td><span class="badge bg">🟢 متصل</span></td></tr>
    </table>
  </div>
</div>

<!-- Members -->
<div id="page-members" class="page">
  <div class="ph"><h1>👥 الأعضاء</h1><p>بحث وإدارة الأعضاء</p></div>
  <div class="sec">
    <div class="st">🔍 بحث</div>
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <input type="text" id="mSearch" placeholder="اسم أو ID..." style="flex:1">
      <button class="btn bp" onclick="searchM()">بحث</button>
    </div>
    <div id="mResult"></div>
  </div>
  <div class="sec">
    <div class="st">👥 أحدث الأعضاء</div>
    <table>
      <thead><tr><th>العضو</th><th>ID</th><th>انضم</th><th>تحذيرات</th><th>إجراء</th></tr></thead>
      <tbody>
        ${members.map(m => `<tr>
          <td><strong>${m.user.tag}</strong></td>
          <td><code>${m.id}</code></td>
          <td>${m.joinedAt?.toLocaleDateString('ar-SA')||'؟'}</td>
          <td><span class="badge ${(db.warnings[m.id]?.filter(w=>!w.removed).length||0)>=3?'br':'bb'}">${db.warnings[m.id]?.filter(w=>!w.removed).length||0}</span></td>
          <td style="display:flex;gap:5px">
            <button class="btn bd" style="padding:5px 10px" onclick="quickKick('${m.id}')">كيك</button>
            <button class="btn bd" style="padding:5px 10px;opacity:.8" onclick="quickBan('${m.id}')">باند</button>
            <button class="btn bo2" style="padding:5px 10px" onclick="quickWarn('${m.id}')">تحذير</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Roles Assign -->
<div id="page-roles" class="page">
  <div class="ph"><h1>🎭 إدارة الرتب</h1><p>إعطاء وسحب الرتب من الأعضاء</p></div>
  <div id="alert-roles" class="alert"></div>
  <div class="sec">
    <div class="st">➕ إعطاء / سحب رتبة</div>
    <div class="fr">
      <div class="fg"><label>ID العضو</label><input type="text" id="rUserId" placeholder="معرف العضو"></div>
      <div class="fg"><label>الرتبة</label>
        <select id="rRoleId">
          ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn bs" onclick="assignRole('add')">➕ إعطاء</button>
      <button class="btn bd" onclick="assignRole('remove')">➖ سحب</button>
    </div>
  </div>
  <div class="sec">
    <div class="st">📋 جميع الرتب</div>
    <table>
      <thead><tr><th>الرتبة</th><th>اللون</th><th>الأعضاء</th><th>الموضع</th></tr></thead>
      <tbody>
        ${roles.map(r=>`<tr>
          <td><span style="color:${r.hexColor};font-weight:700">${r.name}</span></td>
          <td><span style="background:${r.hexColor};color:#000;padding:2px 8px;border-radius:4px;font-size:10px">${r.hexColor}</span></td>
          <td>${r.members.size}</td>
          <td>${r.position}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Role Permissions -->
<div id="page-permissions" class="page">
  <div class="ph"><h1>🔐 صلاحيات الرتب</h1><p>تعديل صلاحيات أي رتبة مباشرة</p></div>
  <div id="alert-perms" class="alert"></div>
  <div class="sec">
    <div class="st">اختر الرتبة</div>
    <div class="fg" style="margin-bottom:16px">
      <label>الرتبة</label>
      <select id="permRoleId" onchange="loadRolePerms()">
        ${roles.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
      </select>
    </div>
    <div class="st" id="permRoleName">الصلاحيات</div>
    <div class="perm-grid" id="permGrid">
      ${DISCORD_PERMS.map(p=>`
      <div class="perm-item" id="perm-${p.key}" onclick="togglePerm('${p.key}')">
        <div class="perm-icon" id="pi-${p.key}"></div>
        <span class="perm-label">${p.label}</span>
      </div>`).join('')}
    </div>
    <div style="margin-top:16px">
      <button class="btn bp" onclick="savePerms()">💾 حفظ الصلاحيات</button>
    </div>
  </div>
</div>

<!-- Blacklist -->
<div id="page-blacklist" class="page">
  <div class="ph"><h1>🚫 القائمة السوداء</h1><p>منع الأعضاء أو الرتب من رؤية قنوات معينة أو السيرفر كامل</p></div>
  <div id="alert-bl" class="alert"></div>
  <div class="sec">
    <div class="st">➕ إضافة للقائمة</div>
    <div class="fr">
      <div class="fg">
        <label>النوع</label>
        <select id="blType" onchange="toggleBlType()">
          <option value="member">👤 عضو</option>
          <option value="role">🎭 رتبة</option>
        </select>
      </div>
      <div class="fg">
        <label id="blTargetLabel">ID العضو</label>
        <input type="text" id="blTarget" placeholder="معرف العضو أو الرتبة">
      </div>
    </div>
    <div class="fr" style="margin-top:10px">
      <div class="fg">
        <label>النطاق</label>
        <select id="blScope" onchange="toggleBlChannel()">
          <option value="all">🌐 السيرفر كامل</option>
          <option value="channel">📁 قناة محددة فقط</option>
        </select>
      </div>
      <div class="fg" id="blChannelGroup" style="display:none">
        <label>القناة</label>
        <select id="blChannel">
          ${channels.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="btn bd" style="margin-top:12px" onclick="addBlacklist()">🚫 إضافة للقائمة</button>
  </div>
  <div class="sec">
    <div class="st">📋 القائمة السوداء الحالية</div>
    <div id="blList">
      <p style="color:var(--m);font-size:13px">لا يوجد عناصر</p>
    </div>
  </div>
</div>

<!-- Warnings -->
<div id="page-warnings" class="page">
  <div class="ph"><h1>⚠️ التحذيرات</h1><p>إدارة تحذيرات الأعضاء</p></div>
  <div id="alert-warn" class="alert"></div>
  <div class="sec">
    <div class="st">⚠️ إعطاء تحذير من الداشبورد</div>
    <div class="fr">
      <div class="fg"><label>ID العضو</label><input type="text" id="wUserId" placeholder="معرف العضو"></div>
      <div class="fg"><label>السبب</label><input type="text" id="wReason" placeholder="سبب التحذير"></div>
    </div>
    <button class="btn bo2" style="margin-top:10px" onclick="giveWarn()">⚠️ إعطاء تحذير</button>
  </div>
  <div class="sec">
    <div class="st">📋 الأعضاء الأكثر تحذيراً</div>
    <div id="warnList"><p style="color:var(--m);font-size:13px">جاري التحميل...</p></div>
  </div>
</div>

<!-- Moderation -->
<div id="page-moderation" class="page">
  <div class="ph"><h1>🔨 الإدارة</h1><p>كيك / باند / تايم أوت</p></div>
  <div id="alert-mod" class="alert"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="sec">
      <div class="st">🔨 كيك</div>
      <div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="kId" placeholder="معرف العضو"></div>
      <div class="fg" style="margin-bottom:10px"><label>السبب</label><input type="text" id="kReason" placeholder="السبب"></div>
      <button class="btn bd" onclick="doKick()">🔨 كيك</button>
    </div>
    <div class="sec">
      <div class="st">🚫 باند</div>
      <div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="bId" placeholder="معرف العضو"></div>
      <div class="fg" style="margin-bottom:10px"><label>السبب</label><input type="text" id="bReason" placeholder="السبب"></div>
      <button class="btn bd" onclick="doBan()">🚫 باند</button>
    </div>
    <div class="sec">
      <div class="st">⏰ تايم أوت</div>
      <div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="tId" placeholder="معرف العضو"></div>
      <div class="fg" style="margin-bottom:10px"><label>المدة</label>
        <select id="tDur">
          <option value="300000">5 دقائق</option>
          <option value="900000">15 دقيقة</option>
          <option value="3600000">ساعة</option>
          <option value="86400000">يوم</option>
          <option value="604800000">أسبوع</option>
        </select>
      </div>
      <button class="btn bd" onclick="doTimeout()">⏰ تايم أوت</button>
    </div>
    <div class="sec">
      <div class="st">✅ رفع باند</div>
      <div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="ubId" placeholder="معرف العضو"></div>
      <button class="btn bs" onclick="doUnban()">✅ رفع الباند</button>
    </div>
  </div>
</div>

<!-- Channels -->
<div id="page-channels" class="page">
  <div class="ph"><h1>📁 القنوات</h1><p>قائمة قنوات السيرفر</p></div>
  <div class="sec">
    <table>
      <thead><tr><th>القناة</th><th>النوع</th><th>الكاتيجوري</th></tr></thead>
      <tbody>
        ${channels.map(c=>{
          const types={0:'💬 نص',2:'🔊 صوت',5:'📢 إعلان',13:'🎙️ ستيج',15:'🗂️ فوروم'};
          return `<tr><td><strong>${c.name}</strong></td><td>${types[c.type]||c.type}</td><td>${c.parent?.name||'—'}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Bot -->
<div id="page-bot" class="page">
  <div class="ph"><h1>🤖 البوت</h1><p>معلومات وإرسال رسائل</p></div>
  <div id="alert-bot" class="alert"></div>
  <div class="sec">
    <div class="st">📊 معلومات البوت</div>
    <table>
      <tr><td>الاسم</td><td><strong>${client.user?.tag}</strong></td></tr>
      <tr><td>ID</td><td><code>${client.user?.id}</code></td></tr>
      <tr><td>الحالة</td><td><span class="badge bg">🟢 أونلاين</span></td></tr>
      <tr><td>Uptime</td><td id="uptime">—</td></tr>
    </table>
  </div>
  <div class="sec">
    <div class="st">📢 إرسال رسالة</div>
    <div class="fg" style="margin-bottom:10px">
      <label>القناة</label>
      <select id="msgCh">${textChannels.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
    </div>
    <div class="fg" style="margin-bottom:10px">
      <label>الرسالة</label>
      <input type="text" id="msgTxt" placeholder="اكتب رسالتك...">
    </div>
    <button class="btn bp" onclick="sendMsg()">📢 إرسال</button>
  </div>
</div>

<!-- Action Logs -->
<div id="page-logs-action" class="page">
  <div class="ph"><h1>📋 سجل التعديلات</h1><p>كل ما تم تعديله من الداشبورد</p></div>
  <div class="sec"><div id="logsAction"><p style="color:var(--m)">جاري التحميل...</p></div></div>
</div>

<!-- Access Logs -->
<div id="page-logs-access" class="page">
  <div class="ph"><h1>🔑 سجل الدخول</h1><p>متى دخل ومتى خرج</p></div>
  <div class="sec"><div id="logsAccess"><p style="color:var(--m)">جاري التحميل...</p></div></div>
</div>

<!-- IP Logs -->
<div id="page-logs-ip" class="page">
  <div class="ph"><h1>🌐 سجل الـ IP</h1><p>عناوين IP المتصلة</p></div>
  <div class="sec"><div id="logsIp"><p style="color:var(--m)">جاري التحميل...</p></div></div>
</div>

<!-- Mod Logs -->
<div id="page-logs-mod" class="page">
  <div class="ph"><h1>⚖️ سجل الإدارة</h1><p>كيك / باند / تحذير / تايم أوت</p></div>
  <div class="sec"><div id="logsMod"><p style="color:var(--m)">جاري التحميل...</p></div></div>
</div>

</main>

<script>
// ── Navigation ──
function P(id, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el) el.classList.add('active');
  if(id==='warnings') loadWarnings();
  if(id==='blacklist') loadBlacklist();
  if(id.startsWith('logs')) loadLogs();
}

// ── Alert ──
function A(id, msg, type) {
  const el=document.getElementById('alert-'+id);
  el.className='alert a'+(type==='success'?'s':'e');
  el.textContent=msg; el.style.display='block';
  setTimeout(()=>el.style.display='none',4000);
}

// ── API ──
const api = async (url, body={}) => {
  const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r.json();
};

// ── Role Assign ──
async function assignRole(action) {
  const userId=document.getElementById('rUserId').value.trim();
  const roleId=document.getElementById('rRoleId').value;
  if(!userId) return A('roles','أدخل ID العضو!','error');
  const d=await api('/api/role-assign',{userId,roleId,action});
  A('roles',d.message,d.ok?'success':'error');
}

// ── Role Permissions ──
let currentPerms = [];
async function loadRolePerms() {
  const roleId=document.getElementById('permRoleId').value;
  const r=await fetch('/api/role-perms/'+roleId);
  const d=await r.json();
  if(!d.ok) return;
  currentPerms=[...d.permissions];
  document.getElementById('permRoleName').textContent='صلاحيات: '+d.name;
  document.querySelectorAll('.perm-item').forEach(el=>{
    const key=el.id.replace('perm-','');
    el.classList.toggle('checked', d.permissions.includes(key));
    document.getElementById('pi-'+key).textContent = d.permissions.includes(key) ? '✓' : '';
  });
}
function togglePerm(key) {
  const el=document.getElementById('perm-'+key);
  const pi=document.getElementById('pi-'+key);
  if(currentPerms.includes(key)){currentPerms=currentPerms.filter(k=>k!==key);el.classList.remove('checked');pi.textContent='';}
  else{currentPerms.push(key);el.classList.add('checked');pi.textContent='✓';}
}
async function savePerms() {
  const roleId=document.getElementById('permRoleId').value;
  const d=await api('/api/role-perms',{roleId,permissions:currentPerms});
  A('perms',d.message,d.ok?'success':'error');
}
window.addEventListener('load',()=>loadRolePerms());

// ── Blacklist ──
function toggleBlType(){
  const t=document.getElementById('blType').value;
  document.getElementById('blTargetLabel').textContent=t==='member'?'ID العضو':'ID الرتبة';
  document.getElementById('blTarget').placeholder=t==='member'?'معرف العضو':'معرف الرتبة';
}
function toggleBlChannel(){
  const s=document.getElementById('blScope').value;
  document.getElementById('blChannelGroup').style.display=s==='channel'?'flex':'none';
}
async function addBlacklist(){
  const type=document.getElementById('blType').value;
  const targetId=document.getElementById('blTarget').value.trim();
  const scope=document.getElementById('blScope').value;
  const channelId=document.getElementById('blChannel')?.value;
  if(!targetId) return A('bl','أدخل ID!','error');
  const d=await api('/api/blacklist/add',{type,targetId,scope,channelId});
  A('bl',d.message,d.ok?'success':'error');
  if(d.ok) loadBlacklist();
}
async function removeBlacklist(i){
  const d=await api('/api/blacklist/remove',{index:i});
  A('bl',d.message,d.ok?'success':'error');
  if(d.ok) loadBlacklist();
}
async function loadBlacklist(){
  const r=await fetch('/api/blacklist');
  const d=await r.json();
  const el=document.getElementById('blList');
  if(!d.list.length){el.innerHTML='<p style="color:var(--m);font-size:13px">القائمة السوداء فارغة ✅</p>';return;}
  el.innerHTML='<table><thead><tr><th>النوع</th><th>الاسم</th><th>النطاق</th><th>وقت الإضافة</th><th>إزالة</th></tr></thead><tbody>'+
    d.list.map((b,i)=>\`<tr>
      <td><span class="badge \${b.type==='member'?'bb':'bo'}">\${b.type==='member'?'👤 عضو':'🎭 رتبة'}</span></td>
      <td><strong>\${b.name}</strong></td>
      <td><span class="badge \${b.scope==='all'?'br':'bb'}">\${b.scope==='all'?'السيرفر كامل':'قناة محددة'}</span></td>
      <td style="font-size:11px;color:var(--m)">\${new Date(b.addedAt).toLocaleString('ar-SA')}</td>
      <td><button class="btn bs" style="padding:5px 10px" onclick="removeBlacklist(\${i})">إزالة</button></td>
    </tr>\`).join('')+'</tbody></table>';
}

// ── Warnings ──
async function giveWarn(){
  const userId=document.getElementById('wUserId').value.trim();
  const reason=document.getElementById('wReason').value.trim();
  if(!userId||!reason) return A('warn','أدخل ID والسبب!','error');
  const d=await api('/api/warn',{userId,reason});
  A('warn',d.message,d.ok?'success':'error');
  if(d.ok) loadWarnings();
}
async function removeWarn(userId,index){
  const d=await api('/api/removewarn',{userId,index});
  A('warn',d.message,d.ok?'success':'error');
  if(d.ok) loadWarnings();
}
async function loadWarnings(){
  const r=await fetch('/api/warnings');
  const d=await r.json();
  const el=document.getElementById('warnList');
  if(!d.list.length){el.innerHTML='<p style="color:var(--m);font-size:13px">✅ لا يوجد تحذيرات</p>';return;}
  el.innerHTML='<table><thead><tr><th>العضو</th><th>التحذيرات الفعلية</th><th>الإجمالي</th><th>التفاصيل</th></tr></thead><tbody>'+
    d.list.map(w=>\`<tr>
      <td><strong>\${w.tag}</strong><br><code>\${w.userId}</code></td>
      <td><span class="badge \${w.active>=3?'br':w.active>=2?'bo':'bb'}">\${w.active} تحذير</span></td>
      <td>\${w.total}</td>
      <td>
        \${w.warns.filter(x=>!x.removed).map((x,i)=>\`
          <div style="font-size:11px;margin-bottom:4px;background:rgba(255,255,255,.03);padding:5px 8px;border-radius:6px">
            <strong>\${i+1}.</strong> \${x.reason} <span style="color:var(--m)">— \${x.by}</span>
            <button class="btn bd" style="padding:2px 8px;font-size:10px;margin-right:6px" onclick="removeWarn('\${w.userId}',\${i})">حذف</button>
          </div>
        \`).join('')}
      </td>
    </tr>\`).join('')+'</tbody></table>';
}

// ── Member Search ──
async function searchM(){
  const q=document.getElementById('mSearch').value.trim();
  if(!q) return;
  const r=await fetch('/api/member?q='+encodeURIComponent(q));
  const d=await r.json();
  const el=document.getElementById('mResult');
  if(!d.found){el.innerHTML='<p style="color:var(--rd);font-size:13px">❌ ما لقيت العضو</p>';return;}
  el.innerHTML=\`<div class="sec" style="margin-top:10px">
    <table>
      <tr><td>الاسم</td><td><strong>\${d.tag}</strong></td></tr>
      <tr><td>ID</td><td><code>\${d.id}</code></td></tr>
      <tr><td>انضم</td><td>\${d.joined}</td></tr>
      <tr><td>الرتب</td><td>\${d.roles}</td></tr>
      <tr><td>التحذيرات</td><td><span class="badge \${d.warnings>=3?'br':'bb'}">\${d.warnings}</span></td></tr>
    </table>
  </div>\`;
}

// ── Quick Actions ──
function quickKick(id){document.getElementById('kId').value=id;P('moderation',null);}
function quickBan(id){document.getElementById('bId').value=id;P('moderation',null);}
function quickWarn(id){document.getElementById('wUserId').value=id;P('warnings',null);}

// ── Moderation ──
async function doKick(){const d=await api('/api/kick',{userId:document.getElementById('kId').value,reason:document.getElementById('kReason').value});A('mod',d.message,d.ok?'success':'error');}
async function doBan(){if(!confirm('متأكد؟'))return;const d=await api('/api/ban',{userId:document.getElementById('bId').value,reason:document.getElementById('bReason').value});A('mod',d.message,d.ok?'success':'error');}
async function doTimeout(){const d=await api('/api/timeout',{userId:document.getElementById('tId').value,duration:document.getElementById('tDur').value});A('mod',d.message,d.ok?'success':'error');}
async function doUnban(){const d=await api('/api/unban',{userId:document.getElementById('ubId').value});A('mod',d.message,d.ok?'success':'error');}

// ── Send Message ──
async function sendMsg(){
  const d=await api('/api/message',{channelId:document.getElementById('msgCh').value,content:document.getElementById('msgTxt').value});
  A('bot',d.message,d.ok?'success':'error');
  if(d.ok) document.getElementById('msgTxt').value='';
}

// ── Logs ──
async function loadLogs(){
  const r=await fetch('/api/logs');
  const d=await r.json();
  const fmt=t=>new Date(t).toLocaleString('ar-SA');

  // Action Logs
  const la=document.getElementById('logsAction');
  if(la) la.innerHTML=!d.actionLogs.length?'<p style="color:var(--m)">لا يوجد</p>':
    '<table><thead><tr><th>الوقت</th><th>الإجراء</th><th>التفاصيل</th><th>IP</th></tr></thead><tbody>'+
    d.actionLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${fmt(l.time)}</td><td><span class="badge bb">\${l.action}</span></td><td style="font-size:12px">\${l.details}</td><td style="font-size:11px;color:var(--m)">\${l.ip}</td></tr>\`).join('')+'</tbody></table>';

  // Access Logs
  const lac=document.getElementById('logsAccess');
  if(lac) lac.innerHTML=!d.accessLogs.length?'<p style="color:var(--m)">لا يوجد</p>':
    '<table><thead><tr><th>الوقت</th><th>النوع</th><th>IP</th></tr></thead><tbody>'+
    d.accessLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${fmt(l.time)}</td><td><span class="badge \${l.type==='دخول'?'bg':l.type==='خروج'?'br':'bo'}">\${l.type}</span></td><td style="font-size:11px">\${l.ip}</td></tr>\`).join('')+'</tbody></table>';

  // IP Logs
  const li=document.getElementById('logsIp');
  if(li) li.innerHTML=!d.ipLogs.length?'<p style="color:var(--m)">لا يوجد</p>':
    '<table><thead><tr><th>الوقت</th><th>IP</th><th>الإجراء</th></tr></thead><tbody>'+
    d.ipLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${fmt(l.time)}</td><td><code>\${l.ip}</code></td><td style="font-size:12px">\${l.action}: \${l.details?.slice(0,40)||''}</td></tr>\`).join('')+'</tbody></table>';

  // Mod Logs
  const lm=document.getElementById('logsMod');
  if(lm) lm.innerHTML=!d.modLogs.length?'<p style="color:var(--m)">لا يوجد</p>':
    '<table><thead><tr><th>الوقت</th><th>النوع</th><th>العضو</th><th>السبب</th><th>بواسطة</th></tr></thead><tbody>'+
    d.modLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${fmt(l.time)}</td><td><span class="badge \${l.type==='باند'||l.type==='كيك'?'br':l.type==='تحذير'?'bo':'bb'}">\${l.type}</span></td><td style="font-size:12px">\${l.target}</td><td style="font-size:12px">\${l.reason}</td><td style="font-size:11px;color:var(--m)">\${l.by}</td></tr>\`).join('')+'</tbody></table>';
}

// Uptime
const st=Date.now();
setInterval(()=>{const d=Math.floor((Date.now()-st)/1000),h=Math.floor(d/3600),m=Math.floor((d%3600)/60),s=d%60;const el=document.getElementById('uptime');if(el)el.textContent=h+'س '+m+'د '+s+'ث';},1000);
</script>
</body></html>`;
}
