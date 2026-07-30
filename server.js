const express  = require('express');
const session  = require('express-session');
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { db, addActionLog, addModLog } = require('./shared-db');

const app  = express();
const PORT = process.env.PORT || 3000;

const PASS       = process.env.DASH_PASSWORD || 'twgtoka@1234onii';
const TOKEN      = process.env.TOKEN;
const CLIENT_ID  = process.env.CLIENT_ID;
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';
const SESSION_TIMEOUT = 2 * 60 * 1000; // دقيقتين

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Discord Client للداشبورد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ]
});

let guild = null;

const DISCORD_PERMS = [
  { key: 'Administrator',          label: 'أدمن (كل الصلاحيات)',     flag: PermissionFlagsBits.Administrator },
  { key: 'ManageGuild',            label: 'إدارة السيرفر',            flag: PermissionFlagsBits.ManageGuild },
  { key: 'ManageChannels',         label: 'إدارة القنوات',            flag: PermissionFlagsBits.ManageChannels },
  { key: 'ManageRoles',            label: 'إدارة الرتب',              flag: PermissionFlagsBits.ManageRoles },
  { key: 'ManageMessages',         label: 'إدارة الرسائل',            flag: PermissionFlagsBits.ManageMessages },
  { key: 'ManageThreads',          label: 'إدارة الثريدات',           flag: PermissionFlagsBits.ManageThreads },
  { key: 'ManageNicknames',        label: 'إدارة الأسماء',            flag: PermissionFlagsBits.ManageNicknames },
  { key: 'ManageWebhooks',         label: 'إدارة الويب هوك',          flag: PermissionFlagsBits.ManageWebhooks },
  { key: 'KickMembers',            label: 'طرد الأعضاء',              flag: PermissionFlagsBits.KickMembers },
  { key: 'BanMembers',             label: 'حظر الأعضاء',              flag: PermissionFlagsBits.BanMembers },
  { key: 'ModerateMembers',        label: 'تايم أوت',                 flag: PermissionFlagsBits.ModerateMembers },
  { key: 'MuteMembers',            label: 'كتم الأعضاء (صوت)',        flag: PermissionFlagsBits.MuteMembers },
  { key: 'MoveMembers',            label: 'نقل الأعضاء (صوت)',        flag: PermissionFlagsBits.MoveMembers },
  { key: 'ViewAuditLog',           label: 'عرض سجل الأحداث',          flag: PermissionFlagsBits.ViewAuditLog },
  { key: 'ViewChannel',            label: 'رؤية القنوات',             flag: PermissionFlagsBits.ViewChannel },
  { key: 'SendMessages',           label: 'إرسال رسائل',              flag: PermissionFlagsBits.SendMessages },
  { key: 'ReadMessageHistory',     label: 'قراءة تاريخ الرسائل',      flag: PermissionFlagsBits.ReadMessageHistory },
  { key: 'AttachFiles',            label: 'إرفاق ملفات',              flag: PermissionFlagsBits.AttachFiles },
  { key: 'EmbedLinks',             label: 'تضمين روابط',              flag: PermissionFlagsBits.EmbedLinks },
  { key: 'AddReactions',           label: 'إضافة ردود فعل',           flag: PermissionFlagsBits.AddReactions },
  { key: 'UseExternalEmojis',      label: 'إيموجي خارجي',             flag: PermissionFlagsBits.UseExternalEmojis },
  { key: 'Connect',                label: 'الدخول للصوت',             flag: PermissionFlagsBits.Connect },
  { key: 'Speak',                  label: 'التحدث في الصوت',          flag: PermissionFlagsBits.Speak },
  { key: 'Stream',                 label: 'البث المباشر',             flag: PermissionFlagsBits.Stream },
  { key: 'UseApplicationCommands', label: 'استخدام الأوامر',          flag: PermissionFlagsBits.UseApplicationCommands },
  { key: 'MentionEveryone',        label: 'منشن @everyone',           flag: PermissionFlagsBits.MentionEveryone },
  { key: 'ChangeNickname',         label: 'تغيير اسمك المستعار',      flag: PermissionFlagsBits.ChangeNickname },
  { key: 'SendMessagesInThreads',  label: 'الكتابة في الثريدات',      flag: PermissionFlagsBits.SendMessagesInThreads },
  { key: 'CreatePublicThreads',    label: 'إنشاء ثريدات عامة',        flag: PermissionFlagsBits.CreatePublicThreads },
  { key: 'PrioritySpeaker',        label: 'أولوية الكلام (صوت)',      flag: PermissionFlagsBits.PrioritySpeaker },
];

const handleAutoTimeout = async (member, count, reason) => {
  if (count < 3) return;
  const mins = 15 + ((count - 3) * 5);
  await member.timeout(mins * 60000, `تحذيرات متكررة`).catch(() => {});
  try {
    await member.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('⏰ تايم أوت')
      .setDescription(`تلقيت **${count} تحذير**\n**المدة:** ${mins} دقيقة\n**السبب:** ${reason}`)
      .setFooter({ text: GUILD_NAME })] });
  } catch {}
};

client.once('clientReady', async () => {
  console.log(`✅ Dashboard Bot: ${client.user.tag}`);
  guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
  if (guild) await guild.members.fetch().catch(() => {});
});

client.login(TOKEN);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Middleware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'tgw-2024-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: SESSION_TIMEOUT },
}));

const getIP = r => r.headers['x-forwarded-for']?.split(',')[0] || r.socket.remoteAddress || 'unknown';

// تحديث وقت الجلسة عند كل طلب + انتهاء التلقائي
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) return res.redirect('/login');
  const now = Date.now();
  if (req.session.lastActivity && now - req.session.lastActivity > SESSION_TIMEOUT) {
    db.accessLogs.unshift({ type: 'انتهاء جلسة تلقائي', time: new Date().toISOString(), ip: req.session.ip || '?' });
    req.session.destroy();
    return res.redirect('/login?timeout=1');
  }
  req.session.lastActivity = now;
  next();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/login', (req, res) => {
  const timeout = req.query.timeout ? '<p class="err">⏰ انتهت جلستك! سجّل دخول مجدداً</p>' : '';
  const error   = req.query.error   ? '<p class="err">❌ كلمة المرور غلط!</p>' : '';
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>T.G.W Dashboard</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0f;font-family:'Cairo',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(88,101,242,.15),transparent 60%),radial-gradient(ellipse at 70% 80%,rgba(255,215,0,.08),transparent 60%);pointer-events:none}
.particles{position:fixed;inset:0;pointer-events:none;z-index:0}
.p{position:absolute;border-radius:50%;animation:float var(--d) ease-in-out infinite alternate}
@keyframes float{0%{transform:translateY(0) scale(1);opacity:.3}100%{transform:translateY(-30px) scale(1.1);opacity:.8}}
.box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:48px 40px;width:420px;backdrop-filter:blur(20px);position:relative;z-index:1;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.icon{width:72px;height:72px;background:linear-gradient(135deg,#5865F2,#FFD700);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;box-shadow:0 8px 24px rgba(88,101,242,.4)}
h1{color:#fff;font-size:22px;font-weight:900;text-align:center}
.sub{color:rgba(255,255,255,.4);font-size:13px;text-align:center;margin-bottom:28px}
label{display:block;color:rgba(255,255,255,.5);font-size:12px;font-weight:700;margin-bottom:6px;letter-spacing:.5px}
input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 16px;color:#fff;font-size:15px;font-family:'Cairo',sans-serif;outline:none;transition:all .2s}
input:focus{border-color:#5865F2;background:rgba(88,101,242,.08);box-shadow:0 0 0 3px rgba(88,101,242,.1)}
button{width:100%;background:linear-gradient(135deg,#5865F2,#4752c4);border:none;border-radius:12px;padding:14px;color:#fff;font-size:15px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;margin-top:10px;transition:all .2s;box-shadow:0 4px 15px rgba(88,101,242,.3)}
button:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(88,101,242,.4)}
.err{color:#ff6b6b;font-size:13px;text-align:center;background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.2);padding:10px;border-radius:8px;margin-bottom:12px}
.lock{text-align:center;color:rgba(255,255,255,.2);font-size:11px;margin-top:20px}
.timer{text-align:center;color:rgba(255,215,0,.6);font-size:12px;margin-top:8px}
</style></head><body>
<div class="particles" id="p"></div>
<div class="box">
  <div class="icon">📚</div>
  <h1>T.G.W Dashboard</h1>
  <p class="sub">لوحة تحكم السيرفر</p>
  ${timeout}${error}
  <form method="POST" action="/login">
    <label>🔑 كلمة المرور</label>
    <input type="password" name="password" placeholder="••••••••••••" autofocus required>
    <button>🔓 دخول</button>
  </form>
  <p class="lock">🔒 الجلسة تنتهي تلقائياً بعد دقيقتين من عدم النشاط</p>
</div>
<script>
const p=document.getElementById('p');
for(let i=0;i<20;i++){const el=document.createElement('div');el.className='p';const s=Math.random()*4+2;const c=['#5865F2','#FFD700','#57F287','#ED4245'][Math.floor(Math.random()*4)];el.style.cssText=\`width:\${s}px;height:\${s}px;background:\${c};top:\${Math.random()*100}%;left:\${Math.random()*100}%;--d:\${Math.random()*3+2}s;animation-delay:\${Math.random()*2}s\`;p.appendChild(el)}
</script>
</body></html>`);
});

app.post('/login', (req, res) => {
  const ip = getIP(req);
  if (req.body.password === PASS) {
    req.session.authenticated = true;
    req.session.loginTime = new Date().toISOString();
    req.session.lastActivity = Date.now();
    req.session.ip = ip;
    db.accessLogs.unshift({ type: 'دخول', time: new Date().toISOString(), ip });
    res.redirect('/');
  } else {
    db.accessLogs.unshift({ type: 'محاولة فاشلة', time: new Date().toISOString(), ip });
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  db.accessLogs.unshift({ type: 'خروج', time: new Date().toISOString(), ip: req.session.ip || '?' });
  req.session.destroy();
  res.redirect('/login');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/', requireAuth, (req, res) => {
  if (!guild) return res.send('<h1 style="color:white;padding:40px;font-family:Cairo">❌ البوت لم يتصل بعد!</h1>');
  const roles    = guild.roles.cache.filter(r => r.name !== '@everyone').sort((a,b) => b.position - a.position);
  const channels = guild.channels.cache.filter(c => c.type !== 4);
  const textChs  = guild.channels.cache.filter(c => c.type === 0);
  const members  = guild.members.cache.filter(m => !m.user.bot).first(20);
  const guilds   = client.guilds.cache;

  res.send(buildDashboard(guild, client, db, DISCORD_PERMS, roles, channels, textChs, members, guilds, SESSION_TIMEOUT));
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/api/role-perms', requireAuth, async (req, res) => {
  const { roleId, permissions } = req.body;
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) return res.json({ ok:false, message:'ما لقيت الرتبة!' });
    let bits = 0n;
    for (const p of DISCORD_PERMS) if (permissions.includes(p.key)) bits |= p.flag;
    await role.setPermissions(bits);
    addActionLog('تعديل صلاحيات', `${role.name}: ${permissions.join(', ')||'لا شيء'}`, getIP(req));
    res.json({ ok:true, message:`✅ صلاحيات ${role.name} حُدّثت` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.get('/api/role-perms/:id', requireAuth, (req, res) => {
  const role = guild.roles.cache.get(req.params.id);
  if (!role) return res.json({ ok:false });
  res.json({ ok:true, permissions: DISCORD_PERMS.filter(p => role.permissions.has(p.flag)).map(p => p.key), name: role.name });
});

app.post('/api/role-assign', requireAuth, async (req, res) => {
  const { userId, roleId, action } = req.body;
  try {
    const member = await guild.members.fetch(userId);
    const role   = guild.roles.cache.get(roleId);
    action === 'add' ? await member.roles.add(role) : await member.roles.remove(role);
    addActionLog(action==='add'?'إضافة رتبة':'إزالة رتبة', `${role.name} → ${member.user.tag}`, getIP(req));
    res.json({ ok:true, message:`✅ ${action==='add'?'أُضيفت':'أُزيلت'} رتبة ${role.name}` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/kick', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  try {
    const member = await guild.members.fetch(userId);
    await member.kick(reason||'لا يوجد سبب');
    addModLog('كيك', member.user.tag, reason||'لا يوجد سبب', 'Dashboard');
    addActionLog('كيك', `${member.user.tag}: ${reason}`, getIP(req));
    res.json({ ok:true, message:`✅ كيك ${member.user.tag}` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/ban', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  try {
    const m = await guild.members.fetch(userId).catch(()=>null);
    const tag = m?.user.tag || userId;
    await guild.members.ban(userId, { reason: reason||'لا يوجد سبب' });
    addModLog('باند', tag, reason||'لا يوجد سبب', 'Dashboard');
    addActionLog('باند', `${tag}: ${reason}`, getIP(req));
    res.json({ ok:true, message:`✅ باند ${tag}` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/timeout', requireAuth, async (req, res) => {
  const { userId, duration } = req.body;
  try {
    const member = await guild.members.fetch(userId);
    await member.timeout(parseInt(duration));
    addModLog('تايم أوت', member.user.tag, `${parseInt(duration)/60000} دقيقة`, 'Dashboard');
    addActionLog('تايم أوت', member.user.tag, getIP(req));
    res.json({ ok:true, message:`✅ تايم أوت ${member.user.tag}` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/unban', requireAuth, async (req, res) => {
  try {
    await guild.members.unban(req.body.userId);
    addActionLog('رفع باند', req.body.userId, getIP(req));
    res.json({ ok:true, message:'✅ رُفع الباند' });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/warn', requireAuth, async (req, res) => {
  const { userId, reason } = req.body;
  try {
    const member = await guild.members.fetch(userId).catch(()=>null);
    if (!member) return res.json({ ok:false, message:'ما لقيت العضو!' });
    if (!db.warnings[userId]) db.warnings[userId] = [];
    db.warnings[userId].push({ reason, by:'Dashboard', byId:'dash', time:new Date().toISOString(), removed:false });
    const count = db.warnings[userId].filter(w=>!w.removed).length;
    addModLog('تحذير', member.user.tag, reason, 'Dashboard');
    addActionLog('تحذير', `${member.user.tag}: ${reason}`, getIP(req));
    try { await member.send({ embeds:[new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تحذير').addFields({name:'السبب',value:reason},{name:'العدد',value:`${count}`}).setFooter({text:GUILD_NAME})] }); } catch {}
    if (count >= 3) await handleAutoTimeout(member, count, reason);
    res.json({ ok:true, message:`✅ تحذير ${member.user.tag} (${count})` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/removewarn', requireAuth, async (req, res) => {
  const { userId, index } = req.body;
  let count = 0;
  for (let i=0; i<(db.warnings[userId]||[]).length; i++) {
    if (!db.warnings[userId][i].removed) {
      if (count === index) { db.warnings[userId][i].removed=true; db.warnings[userId][i].removedBy='Dashboard'; db.warnings[userId][i].removedTime=new Date().toISOString(); break; }
      count++;
    }
  }
  addActionLog('حذف تحذير', `${userId} رقم ${index+1}`, getIP(req));
  res.json({ ok:true, message:'✅ حُذف التحذير' });
});

app.get('/api/warnings', requireAuth, (req, res) => {
  const result = [];
  for (const [uid, warns] of Object.entries(db.warnings)) {
    const active = warns.filter(w=>!w.removed).length;
    if (!active) continue;
    const m = guild.members.cache.get(uid);
    result.push({ userId:uid, tag:m?.user.tag||uid, active, total:warns.length, warns });
  }
  result.sort((a,b)=>b.active-a.active);
  res.json({ list: result });
});

app.get('/api/blacklist', requireAuth, (req, res) => res.json({ list: db.blacklist }));

app.post('/api/blacklist/add', requireAuth, async (req, res) => {
  const { type, targetId, scope, channelId } = req.body;
  try {
    if (db.blacklist.find(b=>b.type===type&&b.targetId===targetId&&b.scope===scope)) return res.json({ ok:false, message:'موجود مسبقاً!' });
    if (type==='member') {
      const m = await guild.members.fetch(targetId).catch(()=>null);
      if (!m) return res.json({ ok:false, message:'ما لقيت العضو!' });
      if (scope==='all') { for (const [,ch] of guild.channels.cache) { if(ch.type===4)continue; await ch.permissionOverwrites.edit(m,{ViewChannel:false}).catch(()=>{}); } }
      else { const ch=guild.channels.cache.get(channelId); if(!ch) return res.json({ok:false,message:'ما لقيت القناة!'}); await ch.permissionOverwrites.edit(m,{ViewChannel:false,SendMessages:false}).catch(()=>{}); }
      db.blacklist.push({ type, targetId, name:m.user.tag, scope, channelId:channelId||null, addedAt:new Date().toISOString() });
    } else {
      const role = guild.roles.cache.get(targetId);
      if (!role) return res.json({ ok:false, message:'ما لقيت الرتبة!' });
      if (scope==='all') { for (const [,ch] of guild.channels.cache) { if(ch.type===4)continue; await ch.permissionOverwrites.edit(role,{ViewChannel:false}).catch(()=>{}); } }
      else { const ch=guild.channels.cache.get(channelId); if(!ch) return res.json({ok:false,message:'ما لقيت القناة!'}); await ch.permissionOverwrites.edit(role,{ViewChannel:false,SendMessages:false}).catch(()=>{}); }
      db.blacklist.push({ type, targetId, name:role.name, scope, channelId:channelId||null, addedAt:new Date().toISOString() });
    }
    addActionLog('قائمة سوداء', `${type}: ${targetId}`, getIP(req));
    res.json({ ok:true, message:'✅ أُضيف للقائمة السوداء' });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/blacklist/remove', requireAuth, async (req, res) => {
  const entry = db.blacklist[req.body.index];
  if (!entry) return res.json({ ok:false, message:'ما لقيت!' });
  try {
    if (entry.type==='member') {
      const m = await guild.members.fetch(entry.targetId).catch(()=>null);
      if (m) {
        if (entry.scope==='all') { for (const [,ch] of guild.channels.cache) { if(ch.type===4)continue; await ch.permissionOverwrites.delete(m).catch(()=>{}); } }
        else { const ch=guild.channels.cache.get(entry.channelId); if(ch) await ch.permissionOverwrites.delete(m).catch(()=>{}); }
      }
    } else {
      const role = guild.roles.cache.get(entry.targetId);
      if (role) {
        if (entry.scope==='all') { for (const [,ch] of guild.channels.cache) { if(ch.type===4)continue; await ch.permissionOverwrites.delete(role).catch(()=>{}); } }
        else { const ch=guild.channels.cache.get(entry.channelId); if(ch) await ch.permissionOverwrites.delete(role).catch(()=>{}); }
      }
    }
    db.blacklist.splice(req.body.index,1);
    addActionLog('إزالة قائمة سوداء', entry.name, getIP(req));
    res.json({ ok:true, message:`✅ أُزيل ${entry.name}` });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.post('/api/message', requireAuth, async (req, res) => {
  try {
    const ch = guild.channels.cache.get(req.body.channelId);
    await ch.send(req.body.content);
    addActionLog('رسالة', `#${ch.name}: ${req.body.content.slice(0,50)}`, getIP(req));
    res.json({ ok:true, message:'✅ أُرسلت!' });
  } catch(e) { res.json({ ok:false, message:'خطأ: '+e.message }); }
});

app.get('/api/member', requireAuth, async (req, res) => {
  const q = req.query.q?.toLowerCase();
  const m = guild.members.cache.find(m => m.user.tag.toLowerCase().includes(q) || m.id===q || m.user.username.toLowerCase().includes(q));
  if (!m) return res.json({ found:false });
  res.json({ found:true, tag:m.user.tag, id:m.id, joined:m.joinedAt?.toLocaleDateString('ar-SA')||'؟', roles:m.roles.cache.filter(r=>r.name!=='@everyone').map(r=>r.name).join(', ')||'لا يوجد', warnings:db.warnings[m.id]?.filter(w=>!w.removed).length||0 });
});

app.get('/api/logs',   requireAuth, (req,res) => res.json({ actionLogs:db.actionLogs, accessLogs:db.accessLogs, ipLogs:db.ipLogs, modLogs:db.modLogs }));
app.get('/api/guilds', requireAuth, (req,res) => res.json({ guilds: client.guilds.cache.map(g=>({ id:g.id, name:g.name, members:g.memberCount, icon:g.iconURL() })) }));
app.post('/api/ping',  requireAuth, (req,res) => { req.session.lastActivity=Date.now(); res.json({ ok:true }); });

app.listen(PORT, () => console.log(`🌐 Dashboard على port ${PORT}`));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML Builder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildDashboard(guild, client, db, DISCORD_PERMS, roles, channels, textChs, members, guilds, timeout) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>T.G.W Dashboard</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--s:rgba(255,255,255,.04);--b:rgba(255,255,255,.08);--t:#fff;--m:rgba(255,255,255,.4);--ac:#5865F2;--go:#FFD700;--gr:#57F287;--rd:#ED4245;--or:#FEA500}
body{background:var(--bg);font-family:'Cairo',sans-serif;color:var(--t);display:flex;min-height:100vh}
.sidebar{width:230px;min-height:100vh;background:rgba(0,0,0,.6);border-left:1px solid var(--b);padding:20px 0;position:fixed;right:0;top:0;bottom:0;display:flex;flex-direction:column;z-index:100;backdrop-filter:blur(10px)}
.sl{padding:0 16px 20px;border-bottom:1px solid var(--b)}
.sl-icon{width:44px;height:44px;background:linear-gradient(135deg,var(--ac),var(--go));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:10px;box-shadow:0 4px 12px rgba(88,101,242,.3)}
.sl h2{font-size:14px;font-weight:900}
.sl p{font-size:11px;color:var(--m)}
.sl .bot-status{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:var(--gr)}
.sl .dot{width:7px;height:7px;background:var(--gr);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
nav{padding:12px 0;flex:1;overflow-y:auto}
.nav-section{padding:8px 16px 4px;font-size:10px;color:rgba(255,255,255,.25);font-weight:700;letter-spacing:1px;text-transform:uppercase}
.ni{display:flex;align-items:center;gap:8px;padding:10px 16px;color:var(--m);font-size:13px;font-weight:600;cursor:pointer;border-right:3px solid transparent;transition:all .2s;text-decoration:none}
.ni:hover,.ni.active{color:var(--t);background:rgba(88,101,242,.1);border-right-color:var(--ac)}
.ni .ic{font-size:16px;width:20px;text-align:center}
.timer-bar{height:3px;background:rgba(255,255,255,.1);position:relative;overflow:hidden}
.timer-fill{height:100%;background:linear-gradient(90deg,var(--gr),var(--go));transition:width 1s linear}
.sf{padding:14px 16px;border-top:1px solid var(--b)}
.lb-btn{display:block;text-align:center;background:rgba(237,66,69,.1);border:1px solid rgba(237,66,69,.3);color:var(--rd);padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;transition:all .2s}
.lb-btn:hover{background:rgba(237,66,69,.2)}
.main{margin-right:230px;flex:1;padding:28px;overflow-y:auto}
.ph{margin-bottom:24px;display:flex;align-items:center;justify-content:space-between}
.ph h1{font-size:24px;font-weight:900}
.ph p{color:var(--m);font-size:13px;margin-top:3px}
.session-info{font-size:11px;color:var(--m);text-align:left}
#session-timer{color:var(--go);font-weight:700}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px;margin-bottom:24px}
.sc{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:18px;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}
.sc:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.sc::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--c) 0%,transparent 70%);opacity:.1}
.sc .lb2{font-size:11px;color:var(--m);font-weight:700;margin-bottom:6px}
.sc .val{font-size:28px;font-weight:900}
.sc .em{position:absolute;top:14px;left:14px;font-size:24px;opacity:.25}
.sec{background:var(--s);border:1px solid var(--b);border-radius:14px;padding:20px;margin-bottom:20px;transition:border-color .2s}
.sec:hover{border-color:rgba(255,255,255,.12)}
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
.bp:hover{background:#4752c4}
.bd{background:rgba(237,66,69,.15);color:var(--rd);border:1px solid rgba(237,66,69,.3)}
.bd:hover{background:rgba(237,66,69,.25)}
.bs{background:rgba(87,242,135,.15);color:var(--gr);border:1px solid rgba(87,242,135,.3)}
.bs:hover{background:rgba(87,242,135,.25)}
.bo2{background:rgba(254,165,0,.15);color:var(--or);border:1px solid rgba(254,165,0,.3)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.alert{padding:10px 14px;border-radius:10px;font-size:12px;margin-bottom:14px;display:none;animation:slideIn .3s}
@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.as{background:rgba(87,242,135,.1);border:1px solid rgba(87,242,135,.3);color:var(--gr)}
.ae{background:rgba(237,66,69,.1);border:1px solid rgba(237,66,69,.3);color:var(--rd)}
.page{display:none}
.page.active{display:block}
.perm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.pi{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border:1px solid var(--b);border-radius:8px;padding:8px 12px;cursor:pointer;transition:all .2s}
.pi:hover{background:rgba(88,101,242,.1);border-color:var(--ac)}
.pi.on{background:rgba(87,242,135,.1);border-color:rgba(87,242,135,.4)}
.pck{width:16px;height:16px;border-radius:4px;border:2px solid var(--b);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;transition:all .2s}
.pi.on .pck{background:var(--gr);border-color:var(--gr)}
.pl{font-size:12px;color:var(--m)}
.pi.on .pl{color:var(--t)}
code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:4px;font-size:11px;color:#a0a9ff}
.guild-card{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px;transition:all .2s}
.guild-card:hover{border-color:var(--ac);background:rgba(88,101,242,.06)}
.guild-icon{width:48px;height:48px;border-radius:12px;object-fit:cover;background:rgba(88,101,242,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.guild-info h3{font-size:14px;font-weight:700}
.guild-info p{font-size:11px;color:var(--m)}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
</style></head>
<body>

<aside class="sidebar">
  <div class="sl">
    <div class="sl-icon">📚</div>
    <h2>T.G.W Dashboard</h2>
    <p>${guild.name}</p>
    <div class="bot-status"><span class="dot"></span>${client.user?.tag || 'البوت'}</div>
  </div>
  <div class="timer-bar"><div class="timer-fill" id="tbar" style="width:100%"></div></div>
  <nav>
    <div class="nav-section">عام</div>
    <a class="ni active" onclick="P('overview',this)"><span class="ic">📊</span> نظرة عامة</a>
    <a class="ni" onclick="P('guilds',this)"><span class="ic">🌐</span> السيرفرات</a>
    <div class="nav-section">إدارة</div>
    <a class="ni" onclick="P('members',this)"><span class="ic">👥</span> الأعضاء</a>
    <a class="ni" onclick="P('roles',this)"><span class="ic">🎭</span> إدارة الرتب</a>
    <a class="ni" onclick="P('permissions',this)"><span class="ic">🔐</span> صلاحيات الرتب</a>
    <a class="ni" onclick="P('blacklist',this)"><span class="ic">🚫</span> القائمة السوداء</a>
    <a class="ni" onclick="P('warnings',this)"><span class="ic">⚠️</span> التحذيرات</a>
    <a class="ni" onclick="P('moderation',this)"><span class="ic">🔨</span> الإدارة</a>
    <div class="nav-section">السيرفر</div>
    <a class="ni" onclick="P('channels',this)"><span class="ic">📁</span> القنوات</a>
    <a class="ni" onclick="P('bot',this)"><span class="ic">🤖</span> البوت</a>
    <div class="nav-section">السجلات</div>
    <a class="ni" onclick="P('la',this)"><span class="ic">📋</span> سجل التعديلات</a>
    <a class="ni" onclick="P('lac',this)"><span class="ic">🔑</span> سجل الدخول</a>
    <a class="ni" onclick="P('lip',this)"><span class="ic">🌐</span> سجل الـ IP</a>
    <a class="ni" onclick="P('lm',this)"><span class="ic">⚖️</span> سجل الإدارة</a>
  </nav>
  <div class="sf">
    <div style="font-size:11px;color:var(--m);text-align:center;margin-bottom:8px">⏱ الجلسة: <span id="st" style="color:var(--go)">2:00</span></div>
    <a href="/logout" class="lb-btn">🚪 خروج</a>
  </div>
</aside>

<main class="main">

<!-- Overview -->
<div id="page-overview" class="page active">
  <div class="ph"><div><h1>📊 نظرة عامة</h1><p>إحصائيات ${guild.name} الحية</p></div></div>
  <div class="sg">
    <div class="sc" style="--c:#5865F2"><div class="lb2">الأعضاء</div><div class="val">${guild.memberCount}</div><div class="em">👥</div></div>
    <div class="sc" style="--c:#57F287"><div class="lb2">القنوات</div><div class="val">${guild.channels.cache.size}</div><div class="em">📁</div></div>
    <div class="sc" style="--c:#FFD700"><div class="lb2">الرتب</div><div class="val">${guild.roles.cache.size}</div><div class="em">🎭</div></div>
    <div class="sc" style="--c:#FEA500"><div class="lb2">البوتات</div><div class="val">${guild.members.cache.filter(m=>m.user.bot).size}</div><div class="em">🤖</div></div>
    <div class="sc" style="--c:#ED4245"><div class="lb2">القائمة السوداء</div><div class="val">${db.blacklist.length}</div><div class="em">🚫</div></div>
    <div class="sc" style="--c:#9B59B6"><div class="lb2">التحذيرات الكلية</div><div class="val">${Object.values(db.warnings).reduce((a,w)=>a+w.filter(x=>!x.removed).length,0)}</div><div class="em">⚠️</div></div>
  </div>
  <div class="sec">
    <div class="st">🏠 معلومات السيرفر</div>
    <table>
      <tr><td>الاسم</td><td><strong>${guild.name}</strong></td></tr>
      <tr><td>ID</td><td><code>${guild.id}</code></td></tr>
      <tr><td>تأسس</td><td>${guild.createdAt.toLocaleDateString('ar-SA')}</td></tr>
      <tr><td>البوت</td><td><span class="badge bg">🟢 متصل</span></td></tr>
      <tr><td>البينج</td><td><span id="ping-val">—</span> ms</td></tr>
      <tr><td>Uptime</td><td id="uptime">—</td></tr>
    </table>
  </div>
</div>

<!-- Guilds -->
<div id="page-guilds" class="page">
  <div class="ph"><div><h1>🌐 السيرفرات</h1><p>جميع السيرفرات التي يوجد فيها البوت</p></div></div>
  <div id="guilds-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
    ${guilds.map(g=>`
    <div class="guild-card">
      ${g.iconURL() ? `<img src="${g.iconURL()}" class="guild-icon" alt="">` : `<div class="guild-icon">📚</div>`}
      <div class="guild-info">
        <h3>${g.name}</h3>
        <p>👥 ${g.memberCount} عضو • ID: ${g.id}</p>
        <span class="badge ${g.name===guild.name?'bg':'bb'}">${g.name===guild.name?'✓ هذا السيرفر':'متصل'}</span>
      </div>
    </div>`).join('')}
  </div>
</div>

<!-- Members -->
<div id="page-members" class="page">
  <div class="ph"><div><h1>👥 الأعضاء</h1><p>بحث وإدارة الأعضاء</p></div></div>
  <div class="sec">
    <div class="st">🔍 بحث</div>
    <div style="display:flex;gap:10px;margin-bottom:14px">
      <input type="text" id="mSearch" placeholder="اسم أو ID..." style="flex:1" onkeydown="if(event.key==='Enter')searchM()">
      <button class="btn bp" onclick="searchM()">بحث</button>
    </div>
    <div id="mResult"></div>
  </div>
  <div class="sec">
    <div class="st">👥 أحدث الأعضاء</div>
    <table>
      <thead><tr><th>العضو</th><th>ID</th><th>انضم</th><th>تحذيرات</th><th>إجراء</th></tr></thead>
      <tbody>
        ${members.map(m=>`<tr>
          <td><strong>${m.user.tag}</strong></td>
          <td><code>${m.id}</code></td>
          <td>${m.joinedAt?.toLocaleDateString('ar-SA')||'؟'}</td>
          <td><span class="badge ${(db.warnings[m.id]?.filter(w=>!w.removed).length||0)>=3?'br':'bb'}">${db.warnings[m.id]?.filter(w=>!w.removed).length||0}</span></td>
          <td style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn bd" style="padding:5px 8px" onclick="qK('${m.id}')">كيك</button>
            <button class="btn bd" style="padding:5px 8px;opacity:.8" onclick="qB('${m.id}')">باند</button>
            <button class="btn bo2" style="padding:5px 8px" onclick="qW('${m.id}')">تحذير</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Roles -->
<div id="page-roles" class="page">
  <div class="ph"><div><h1>🎭 إدارة الرتب</h1><p>إعطاء وسحب الرتب</p></div></div>
  <div id="alert-roles" class="alert"></div>
  <div class="sec">
    <div class="st">➕ إعطاء / سحب رتبة</div>
    <div class="fr">
      <div class="fg"><label>ID العضو</label><input type="text" id="rUid" placeholder="معرف العضو"></div>
      <div class="fg"><label>الرتبة</label><select id="rRid">${roles.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn bs" onclick="assignRole('add')">➕ إعطاء</button>
      <button class="btn bd" onclick="assignRole('remove')">➖ سحب</button>
    </div>
  </div>
  <div class="sec">
    <div class="st">📋 جميع الرتب</div>
    <table>
      <thead><tr><th>الرتبة</th><th>اللون</th><th>الأعضاء</th><th>الموضع</th></tr></thead>
      <tbody>${roles.map(r=>`<tr>
        <td><span style="color:${r.hexColor};font-weight:700">${r.name}</span></td>
        <td><span style="background:${r.hexColor};color:#000;padding:2px 8px;border-radius:4px;font-size:10px">${r.hexColor}</span></td>
        <td>${r.members.size}</td><td>${r.position}
        </td></tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>

<!-- Permissions -->
<div id="page-permissions" class="page">
  <div class="ph"><div><h1>🔐 صلاحيات الرتب</h1><p>تعديل صلاحيات أي رتبة</p></div></div>
  <div id="alert-perms" class="alert"></div>
  <div class="sec">
    <div class="fg" style="margin-bottom:16px"><label>اختر الرتبة</label><select id="pRid" onchange="loadPerms()">${roles.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}</select></div>
    <div class="st" id="pRname">الصلاحيات</div>
    <div class="perm-grid">${DISCORD_PERMS.map(p=>`<div class="pi" id="pi-${p.key}" onclick="tP('${p.key}')"><div class="pck" id="pc-${p.key}"></div><span class="pl">${p.label}</span></div>`).join('')}</div>
    <div style="margin-top:16px"><button class="btn bp" onclick="savePerms()">💾 حفظ</button></div>
  </div>
</div>

<!-- Blacklist -->
<div id="page-blacklist" class="page">
  <div class="ph"><div><h1>🚫 القائمة السوداء</h1><p>حظر الرؤية والكتابة</p></div></div>
  <div id="alert-bl" class="alert"></div>
  <div class="sec">
    <div class="st">➕ إضافة</div>
    <div class="fr">
      <div class="fg"><label>النوع</label><select id="blT" onchange="tBlT()"><option value="member">👤 عضو</option><option value="role">🎭 رتبة</option></select></div>
      <div class="fg"><label id="blTL">ID العضو</label><input type="text" id="blId" placeholder="معرف"></div>
    </div>
    <div class="fr" style="margin-top:10px">
      <div class="fg"><label>النطاق</label><select id="blS" onchange="tBlS()"><option value="all">🌐 السيرفر كامل</option><option value="channel">📁 قناة محددة</option></select></div>
      <div class="fg" id="blCG" style="display:none"><label>القناة</label><select id="blC">${channels.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    </div>
    <button class="btn bd" style="margin-top:12px" onclick="addBL()">🚫 إضافة</button>
  </div>
  <div class="sec"><div class="st">📋 القائمة الحالية</div><div id="blList"><p style="color:var(--m)">لا يوجد</p></div></div>
</div>

<!-- Warnings -->
<div id="page-warnings" class="page">
  <div class="ph"><div><h1>⚠️ التحذيرات</h1><p>نظام التحذيرات المتكامل</p></div></div>
  <div id="alert-warn" class="alert"></div>
  <div class="sec">
    <div class="st">⚠️ إعطاء تحذير</div>
    <div class="fr">
      <div class="fg"><label>ID العضو</label><input type="text" id="wUid" placeholder="معرف العضو"></div>
      <div class="fg"><label>السبب</label><input type="text" id="wR" placeholder="سبب التحذير"></div>
    </div>
    <button class="btn bo2" style="margin-top:10px" onclick="giveWarn()">⚠️ إعطاء تحذير</button>
  </div>
  <div class="sec"><div class="st">📋 الأعضاء الأكثر تحذيراً</div><div id="wList"><p style="color:var(--m)">جاري التحميل...</p></div></div>
</div>

<!-- Moderation -->
<div id="page-moderation" class="page">
  <div class="ph"><div><h1>🔨 الإدارة</h1><p>كيك / باند / تايم أوت</p></div></div>
  <div id="alert-mod" class="alert"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="sec"><div class="st">🔨 كيك</div><div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="kId" placeholder="معرف العضو"></div><div class="fg" style="margin-bottom:10px"><label>السبب</label><input type="text" id="kR" placeholder="السبب"></div><button class="btn bd" onclick="doKick()">🔨 كيك</button></div>
    <div class="sec"><div class="st">🚫 باند</div><div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="bId" placeholder="معرف العضو"></div><div class="fg" style="margin-bottom:10px"><label>السبب</label><input type="text" id="bR" placeholder="السبب"></div><button class="btn bd" onclick="doBan()">🚫 باند</button></div>
    <div class="sec"><div class="st">⏰ تايم أوت</div><div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="tId" placeholder="معرف العضو"></div><div class="fg" style="margin-bottom:10px"><label>المدة</label><select id="tD"><option value="300000">5 دقائق</option><option value="900000" selected>15 دقيقة</option><option value="3600000">ساعة</option><option value="86400000">يوم</option><option value="604800000">أسبوع</option></select></div><button class="btn bd" onclick="doTimeout()">⏰ تايم أوت</button></div>
    <div class="sec"><div class="st">✅ رفع باند</div><div class="fg" style="margin-bottom:10px"><label>ID العضو</label><input type="text" id="ubId" placeholder="معرف العضو"></div><button class="btn bs" onclick="doUnban()">✅ رفع الباند</button></div>
  </div>
</div>

<!-- Channels -->
<div id="page-channels" class="page">
  <div class="ph"><div><h1>📁 القنوات</h1><p>${channels.size} قناة</p></div></div>
  <div class="sec"><table><thead><tr><th>القناة</th><th>النوع</th><th>الكاتيجوري</th></tr></thead><tbody>
    ${channels.map(c=>{const types={0:'💬 نص',2:'🔊 صوت',5:'📢 إعلان',13:'🎙️ ستيج',15:'🗂️ فوروم'};return`<tr><td><strong>${c.name}</strong></td><td>${types[c.type]||c.type}</td><td>${c.parent?.name||'—'}</td></tr>`;}).join('')}
  </tbody></table></div>
</div>

<!-- Bot -->
<div id="page-bot" class="page">
  <div class="ph"><div><h1>🤖 البوت</h1><p>معلومات وإرسال رسائل</p></div></div>
  <div id="alert-bot" class="alert"></div>
  <div class="sec"><div class="st">📊 معلومات البوت</div>
    <table>
      <tr><td>الاسم</td><td><strong>${client.user?.tag}</strong></td></tr>
      <tr><td>ID</td><td><code>${client.user?.id}</code></td></tr>
      <tr><td>الحالة</td><td><span class="badge bg">🟢 أونلاين</span></td></tr>
      <tr><td>Uptime</td><td id="uptime2">—</td></tr>
      <tr><td>السيرفرات</td><td>${guilds.size} سيرفر</td></tr>
    </table>
  </div>
  <div class="sec"><div class="st">📢 إرسال رسالة</div>
    <div class="fg" style="margin-bottom:10px"><label>القناة</label><select id="mCh">${textChs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    <div class="fg" style="margin-bottom:10px"><label>الرسالة</label><input type="text" id="mTxt" placeholder="اكتب رسالتك..."></div>
    <button class="btn bp" onclick="sendMsg()">📢 إرسال</button>
  </div>
</div>

<!-- Logs -->
<div id="page-la"  class="page"><div class="ph"><div><h1>📋 سجل التعديلات</h1></div></div><div class="sec"><div id="logsA"><p style="color:var(--m)">جاري...</p></div></div></div>
<div id="page-lac" class="page"><div class="ph"><div><h1>🔑 سجل الدخول</h1></div></div><div class="sec"><div id="logsAc"><p style="color:var(--m)">جاري...</p></div></div></div>
<div id="page-lip" class="page"><div class="ph"><div><h1>🌐 سجل الـ IP</h1></div></div><div class="sec"><div id="logsIp"><p style="color:var(--m)">جاري...</p></div></div></div>
<div id="page-lm"  class="page"><div class="ph"><div><h1>⚖️ سجل الإدارة</h1></div></div><div class="sec"><div id="logsMod"><p style="color:var(--m)">جاري...</p></div></div></div>

</main>

<script>
// ── Session Timer ──
const TIMEOUT = ${SESSION_TIMEOUT};
let lastAct = Date.now();
let pingInterval;

function resetTimer(){ lastAct = Date.now(); fetch('/api/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); }
document.addEventListener('click', resetTimer);
document.addEventListener('keydown', resetTimer);

setInterval(()=>{
  const left = TIMEOUT - (Date.now()-lastAct);
  if(left<=0){ window.location='/login?timeout=1'; return; }
  const m=Math.floor(left/60000), s=Math.floor((left%60000)/1000);
  const el=document.getElementById('st'); if(el) el.textContent=\`\${m}:\${s.toString().padStart(2,'0')}\`;
  const bar=document.getElementById('tbar'); if(bar) bar.style.width=(left/TIMEOUT*100)+'%';
  if(bar){ bar.style.background = left<30000 ? 'linear-gradient(90deg,var(--rd),var(--or))' : left<60000 ? 'linear-gradient(90deg,var(--or),var(--go))' : 'linear-gradient(90deg,var(--gr),var(--go))'; }
}, 1000);

// Uptime
const st=Date.now();
setInterval(()=>{
  const d=Math.floor((Date.now()-st)/1000),h=Math.floor(d/3600),m=Math.floor((d%3600)/60),s=d%60;
  const v=\`\${h}س \${m}د \${s}ث\`;
  const e1=document.getElementById('uptime'); if(e1)e1.textContent=v;
  const e2=document.getElementById('uptime2'); if(e2)e2.textContent=v;
},1000);

// ── Navigation ──
function P(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el) el.classList.add('active');
  if(id==='warnings') loadWarns();
  if(id==='blacklist') loadBL();
  if(['la','lac','lip','lm'].includes(id)) loadLogs();
  if(id==='permissions') loadPerms();
}

// ── Alert ──
function A(id,msg,type){const el=document.getElementById('alert-'+id);el.className='alert a'+(type==='success'?'s':'e');el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',4000);}

// ── API ──
const api=async(url,body={})=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json();};

// Role Assign
async function assignRole(action){const u=document.getElementById('rUid').value.trim(),r=document.getElementById('rRid').value;if(!u)return A('roles','أدخل ID!','error');const d=await api('/api/role-assign',{userId:u,roleId:r,action});A('roles',d.message,d.ok?'success':'error');}

// Permissions
let cP=[];
async function loadPerms(){
  const rid=document.getElementById('pRid').value;
  const r=await fetch('/api/role-perms/'+rid);const d=await r.json();if(!d.ok)return;
  cP=[...d.permissions];
  document.getElementById('pRname').textContent='صلاحيات: '+d.name;
  document.querySelectorAll('.pi').forEach(el=>{const k=el.id.replace('pi-','');const on=d.permissions.includes(k);el.classList.toggle('on',on);document.getElementById('pc-'+k).textContent=on?'✓':'';});
}
function tP(k){const el=document.getElementById('pi-'+k),pc=document.getElementById('pc-'+k);if(cP.includes(k)){cP=cP.filter(x=>x!==k);el.classList.remove('on');pc.textContent='';}else{cP.push(k);el.classList.add('on');pc.textContent='✓';}}
async function savePerms(){const d=await api('/api/role-perms',{roleId:document.getElementById('pRid').value,permissions:cP});A('perms',d.message,d.ok?'success':'error');}
window.addEventListener('load',()=>loadPerms());

// Blacklist
function tBlT(){const t=document.getElementById('blT').value;document.getElementById('blTL').textContent=t==='member'?'ID العضو':'ID الرتبة';document.getElementById('blId').placeholder=t==='member'?'معرف العضو':'معرف الرتبة';}
function tBlS(){document.getElementById('blCG').style.display=document.getElementById('blS').value==='channel'?'flex':'none';}
async function addBL(){const t=document.getElementById('blT').value,id=document.getElementById('blId').value.trim(),s=document.getElementById('blS').value,ch=document.getElementById('blC')?.value;if(!id)return A('bl','أدخل ID!','error');const d=await api('/api/blacklist/add',{type:t,targetId:id,scope:s,channelId:ch});A('bl',d.message,d.ok?'success':'error');if(d.ok)loadBL();}
async function rmBL(i){const d=await api('/api/blacklist/remove',{index:i});A('bl',d.message,d.ok?'success':'error');if(d.ok)loadBL();}
async function loadBL(){const r=await fetch('/api/blacklist');const d=await r.json();const el=document.getElementById('blList');if(!d.list.length){el.innerHTML='<p style="color:var(--m)">القائمة فارغة ✅</p>';return;}el.innerHTML='<table><thead><tr><th>النوع</th><th>الاسم</th><th>النطاق</th><th>الوقت</th><th>إزالة</th></tr></thead><tbody>'+d.list.map((b,i)=>\`<tr><td><span class="badge \${b.type==='member'?'bb':'bo'}">\${b.type==='member'?'👤':'🎭'} \${b.type==='member'?'عضو':'رتبة'}</span></td><td><strong>\${b.name}</strong></td><td><span class="badge \${b.scope==='all'?'br':'bb'}">\${b.scope==='all'?'السيرفر كامل':'قناة محددة'}</span></td><td style="font-size:11px;color:var(--m)">\${new Date(b.addedAt).toLocaleString('ar-SA')}</td><td><button class="btn bs" style="padding:4px 10px" onclick="rmBL(\${i})">إزالة</button></td></tr>\`).join('')+'</tbody></table>';}

// Warnings
async function giveWarn(){const u=document.getElementById('wUid').value.trim(),r=document.getElementById('wR').value.trim();if(!u||!r)return A('warn','أدخل ID والسبب!','error');const d=await api('/api/warn',{userId:u,reason:r});A('warn',d.message,d.ok?'success':'error');if(d.ok)loadWarns();}
async function rmWarn(uid,i){const d=await api('/api/removewarn',{userId:uid,index:i});A('warn',d.message,d.ok?'success':'error');if(d.ok)loadWarns();}
async function loadWarns(){const r=await fetch('/api/warnings');const d=await r.json();const el=document.getElementById('wList');if(!d.list.length){el.innerHTML='<p style="color:var(--m)">✅ لا يوجد تحذيرات</p>';return;}el.innerHTML='<table><thead><tr><th>العضو</th><th>فعّال</th><th>الكلي</th><th>التفاصيل</th></tr></thead><tbody>'+d.list.map(w=>\`<tr><td><strong>\${w.tag}</strong><br><code>\${w.userId}</code></td><td><span class="badge \${w.active>=3?'br':w.active>=2?'bo':'bb'}">\${w.active}</span></td><td>\${w.total}</td><td>\${w.warns.filter(x=>!x.removed).map((x,i)=>\`<div style="font-size:11px;margin:3px 0;background:rgba(255,255,255,.03);padding:4px 8px;border-radius:6px"><strong>\${i+1}.</strong> \${x.reason} <span style="color:var(--m)">— \${x.by}</span> <button class="btn bd" style="padding:2px 6px;font-size:10px;margin-right:4px" onclick="rmWarn('\${w.userId}',\${i})">حذف</button></div>\`).join('')}</td></tr>\`).join('')+'</tbody></table>';}

// Search
async function searchM(){const q=document.getElementById('mSearch').value.trim();if(!q)return;const r=await fetch('/api/member?q='+encodeURIComponent(q));const d=await r.json();const el=document.getElementById('mResult');if(!d.found){el.innerHTML='<p style="color:var(--rd)">❌ ما لقيت العضو</p>';return;}el.innerHTML=\`<div class="sec" style="margin-top:10px"><table><tr><td>الاسم</td><td><strong>\${d.tag}</strong></td></tr><tr><td>ID</td><td><code>\${d.id}</code></td></tr><tr><td>انضم</td><td>\${d.joined}</td></tr><tr><td>الرتب</td><td>\${d.roles}</td></tr><tr><td>تحذيرات</td><td><span class="badge \${d.warnings>=3?'br':'bb'}">\${d.warnings}</span></td></tr></table></div>\`;}

// Quick
function qK(id){document.getElementById('kId').value=id;P('moderation',null);}
function qB(id){document.getElementById('bId').value=id;P('moderation',null);}
function qW(id){document.getElementById('wUid').value=id;P('warnings',null);}

// Mod
async function doKick(){const d=await api('/api/kick',{userId:document.getElementById('kId').value,reason:document.getElementById('kR').value});A('mod',d.message,d.ok?'success':'error');}
async function doBan(){if(!confirm('متأكد؟'))return;const d=await api('/api/ban',{userId:document.getElementById('bId').value,reason:document.getElementById('bR').value});A('mod',d.message,d.ok?'success':'error');}
async function doTimeout(){const d=await api('/api/timeout',{userId:document.getElementById('tId').value,duration:document.getElementById('tD').value});A('mod',d.message,d.ok?'success':'error');}
async function doUnban(){const d=await api('/api/unban',{userId:document.getElementById('ubId').value});A('mod',d.message,d.ok?'success':'error');}

// Message
async function sendMsg(){const d=await api('/api/message',{channelId:document.getElementById('mCh').value,content:document.getElementById('mTxt').value});A('bot',d.message,d.ok?'success':'error');if(d.ok)document.getElementById('mTxt').value='';}

// Logs
async function loadLogs(){const r=await fetch('/api/logs');const d=await r.json();const f=t=>new Date(t).toLocaleString('ar-SA');
  const la=document.getElementById('logsA');if(la)la.innerHTML=!d.actionLogs.length?'<p style="color:var(--m)">لا يوجد</p>':'<table><thead><tr><th>الوقت</th><th>الإجراء</th><th>التفاصيل</th><th>IP</th></tr></thead><tbody>'+d.actionLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${f(l.time)}</td><td><span class="badge bb">\${l.action}</span></td><td style="font-size:12px">\${l.details}</td><td style="font-size:11px;color:var(--m)">\${l.ip}</td></tr>\`).join('')+'</tbody></table>';
  const lac=document.getElementById('logsAc');if(lac)lac.innerHTML=!d.accessLogs.length?'<p style="color:var(--m)">لا يوجد</p>':'<table><thead><tr><th>الوقت</th><th>النوع</th><th>IP</th></tr></thead><tbody>'+d.accessLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${f(l.time)}</td><td><span class="badge \${l.type==='دخول'?'bg':l.type==='خروج'?'br':'bo'}">\${l.type}</span></td><td style="font-size:11px">\${l.ip}</td></tr>\`).join('')+'</tbody></table>';
  const lip=document.getElementById('logsIp');if(lip)lip.innerHTML=!d.ipLogs.length?'<p style="color:var(--m)">لا يوجد</p>':'<table><thead><tr><th>الوقت</th><th>IP</th><th>الإجراء</th></tr></thead><tbody>'+d.ipLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${f(l.time)}</td><td><code>\${l.ip}</code></td><td style="font-size:12px">\${l.action}: \${l.details?.slice(0,40)||''}</td></tr>\`).join('')+'</tbody></table>';
  const lm=document.getElementById('logsMod');if(lm)lm.innerHTML=!d.modLogs.length?'<p style="color:var(--m)">لا يوجد</p>':'<table><thead><tr><th>الوقت</th><th>النوع</th><th>العضو</th><th>السبب</th><th>بواسطة</th></tr></thead><tbody>'+d.modLogs.map(l=>\`<tr><td style="font-size:11px;color:var(--m)">\${f(l.time)}</td><td><span class="badge \${l.type==='باند'||l.type==='كيك'?'br':l.type==='تحذير'?'bo':'bb'}">\${l.type}</span></td><td style="font-size:12px">\${l.target}</td><td style="font-size:12px">\${l.reason}</td><td style="font-size:11px;color:var(--m)">\${l.by}</td></tr>\`).join('')+'</tbody></table>';
}
</script>
</body></html>`;
}
