// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// server.js — Express Dashboard
// يستخدم الـ client المشترك (ما ينشئ client جديد)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const express = require('express');
const session = require('express-session');
const { PermissionFlagsBits } = require('discord.js');
const { db, addActionLog, addModLog } = require('./shared-db');

const PASS = process.env.DASH_PASSWORD || 'twgtoka@1234onii';
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';
const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes

const DISCORD_PERMS = [
  { key: 'Administrator', label: 'أدمن (كل الصلاحيات)', flag: PermissionFlagsBits.Administrator },
  { key: 'ManageGuild', label: 'إدارة السيرفر', flag: PermissionFlagsBits.ManageGuild },
  { key: 'ManageChannels', label: 'إدارة القنوات', flag: PermissionFlagsBits.ManageChannels },
  { key: 'ManageRoles', label: 'إدارة الرتب', flag: PermissionFlagsBits.ManageRoles },
  { key: 'ManageMessages', label: 'إدارة الرسائل', flag: PermissionFlagsBits.ManageMessages },
  { key: 'ManageThreads', label: 'إدارة الثريدات', flag: PermissionFlagsBits.ManageThreads },
  { key: 'ManageNicknames', label: 'إدارة الأسماء', flag: PermissionFlagsBits.ManageNicknames },
  { key: 'ManageWebhooks', label: 'إدارة الويب هوك', flag: PermissionFlagsBits.ManageWebhooks },
  { key: 'KickMembers', label: 'طرد الأعضاء', flag: PermissionFlagsBits.KickMembers },
  { key: 'BanMembers', label: 'حظر الأعضاء', flag: PermissionFlagsBits.BanMembers },
  { key: 'ModerateMembers', label: 'تايم أوت', flag: PermissionFlagsBits.ModerateMembers },
  { key: 'MuteMembers', label: 'كتم الأعضاء (صوت)', flag: PermissionFlagsBits.MuteMembers },
  { key: 'MoveMembers', label: 'نقل الأعضاء (صوت)', flag: PermissionFlagsBits.MoveMembers },
  { key: 'ViewAuditLog', label: 'عرض سجل الأحداث', flag: PermissionFlagsBits.ViewAuditLog },
  { key: 'ViewChannel', label: 'رؤية القنوات', flag: PermissionFlagsBits.ViewChannel },
  { key: 'SendMessages', label: 'إرسال رسائل', flag: PermissionFlagsBits.SendMessages },
  { key: 'ReadMessageHistory', label: 'قراءة تاريخ الرسائل', flag: PermissionFlagsBits.ReadMessageHistory },
  { key: 'AttachFiles', label: 'إرفاق ملفات', flag: PermissionFlagsBits.AttachFiles },
  { key: 'EmbedLinks', label: 'تضمين روابط', flag: PermissionFlagsBits.EmbedLinks },
  { key: 'AddReactions', label: 'إضافة ردود فعل', flag: PermissionFlagsBits.AddReactions },
  { key: 'UseExternalEmojis', label: 'إيموجي خارجي', flag: PermissionFlagsBits.UseExternalEmojis },
  { key: 'Connect', label: 'الدخول للصوت', flag: PermissionFlagsBits.Connect },
  { key: 'Speak', label: 'التحدث في الصوت', flag: PermissionFlagsBits.Speak },
  { key: 'Stream', label: 'البث المباشر', flag: PermissionFlagsBits.Stream },
  { key: 'UseApplicationCommands', label: 'استخدام الأوامر', flag: PermissionFlagsBits.UseApplicationCommands },
  { key: 'MentionEveryone', label: 'منشن @everyone', flag: PermissionFlagsBits.MentionEveryone },
  { key: 'ChangeNickname', label: 'تغيير اسمك المستعار', flag: PermissionFlagsBits.ChangeNickname },
  { key: 'SendMessagesInThreads', label: 'الكتابة في الثريدات', flag: PermissionFlagsBits.SendMessagesInThreads },
];

function setupDashboard(client, app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'novel-nexus-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: SESSION_TIMEOUT }
  }));

  const auth = (req, res, next) => {
    if (!req.session.authenticated) return res.redirect('/');
    if (Date.now() - req.session.loginTime > SESSION_TIMEOUT) {
      req.session.destroy();
      return res.redirect('/');
    }
    next();
  };

  // ── Login Page ──
  app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>T.G.W Dashboard</title>
    <style>
      *{box-sizing:border-box}
      body{background:#0f0f23;color:#e0e0e0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;display:flex;justify-content:center;align-items:center;height:100vh}
      .box{background:#1a1a2e;padding:40px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.4);text-align:center;max-width:400px;width:90%}
      h1{color:#ffd700;margin-bottom:8px;font-size:28px}
      p{color:#8892b0;margin-bottom:24px}
      input{padding:14px 18px;border:2px solid #233554;border-radius:10px;font-size:16px;width:100%;margin:10px 0;background:#0f0f23;color:#e0e0e0;outline:none;transition:border-color .2s}
      input:focus{border-color:#ffd700}
      button{padding:14px 32px;background:#ffd700;color:#0f0f23;border:none;border-radius:10px;font-size:16px;cursor:pointer;font-weight:700;width:100%;margin-top:10px;transition:transform .1s}
      button:hover{transform:translateY(-2px)}
    </style></head>
    <body><div class="box"><h1>🔐 T.G.W Dashboard</h1><p>أدخل كلمة المرور للدخول</p>
    <form action="/login" method="POST"><input type="password" name="password" placeholder="كلمة المرور" required><button type="submit">دخول</button></form></div></body></html>`);
  });

  app.post('/login', (req, res) => {
    if (req.body.password === PASS) {
      req.session.authenticated = true;
      req.session.loginTime = Date.now();
      addActionLog('login', 'Admin logged in', req.ip);
      return res.redirect('/dashboard');
    }
    res.send('<script>alert("❌ كلمة المرور غلط!");location.href="/";</script>');
  });

  app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

  // ── Main Dashboard ──
  app.get('/dashboard', auth, async (req, res) => {
    if (!client.readyAt) return res.send('البوت ما متصل بعد...');
    const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
    if (!guild) return res.send('ما لقيت السيرفر!');

    try {
      const members = await guild.members.fetch();
      const channels = guild.channels.cache;
      const roles = guild.roles.cache.filter(r => r.name !== '@everyone');
      const bots = members.filter(m => m.user.bot).size;
      const warningsCount = Object.values(db.warnings).reduce((a, w) => a + w.filter(x => !x.removed).length, 0);

      const nav = `<div class="nav"><a href="#stats">📊 إحصائيات</a><a href="#members">👥 أعضاء</a><a href="#roles">🎭 رتب</a><a href="#channels">📁 قنوات</a><a href="#blacklist">🚫 قائمة سوداء</a><a href="#warnings">⚠️ تحذيرات</a><a href="#bot">🤖 بوت</a><a href="#logs">📋 سجلات</a><a href="/logout">🚪 خروج</a></div>`;

      res.send(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${SERVER_NAME} Dashboard</title>
      <style>
        *{box-sizing:border-box}
        body{background:#0f0f23;color:#ccd6f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:20px;line-height:1.6}
        h1,h2{color:#ffd700;text-align:center;margin:10px 0}
        .nav{text-align:center;margin:20px 0;padding:15px;background:#1a1a2e;border-radius:12px;position:sticky;top:0;z-index:100}
        .nav a{color:#64ffda;text-decoration:none;margin:0 12px;font-weight:600;font-size:14px}
        .nav a:hover{color:#ffd700}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:15px;max-width:1200px;margin:20px auto}
        .card{background:#1a1a2e;padding:20px;border-radius:12px;text-align:center;border:1px solid #233554;transition:transform .2s}
        .card:hover{transform:translateY(-4px);border-color:#64ffda}
        .card h3{color:#ffd700;margin:5px 0;font-size:36px}
        .card p{color:#8892b0;margin:0;font-size:14px}
        table{width:100%;max-width:1200px;margin:20px auto;border-collapse:collapse;background:#1a1a2e;border-radius:12px;overflow:hidden;font-size:13px}
        th,td{padding:12px;border:1px solid #233554;text-align:right}
        th{background:#112240;color:#64ffda;font-weight:600}
        tr:hover{background:#112240}
        .section{max-width:1200px;margin:30px auto;background:#1a1a2e;padding:25px;border-radius:16px;border:1px solid #233554}
        .btn{padding:10px 20px;background:#ffd700;color:#0f0f23;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px}
        .btn:hover{background:#ffec8b}
        input,select{padding:10px;border-radius:8px;border:1px solid #233554;margin:5px;background:#0f0f23;color:#e0e0e0;outline:none}
        input:focus,select:focus{border-color:#64ffda}
        .status-online{color:#57f287;font-weight:700}
        .form-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:15px 0}
        @media(max-width:768px){.grid{grid-template-columns:repeat(2,1fr)}.nav a{margin:0 6px;font-size:12px}}
      </style></head>
      <body>
        <h1>📊 ${guild.name} Dashboard</h1>
        ${nav}

        <div id="stats" class="section">
          <h2>📈 إحصائيات عامة</h2>
          <div class="grid">
            <div class="card"><h3>${guild.memberCount}</h3><p>👥 إجمالي الأعضاء</p></div>
            <div class="card"><h3>${guild.memberCount - bots}</h3><p>👤 بشريين</p></div>
            <div class="card"><h3>${bots}</h3><p>🤖 بوتات</p></div>
            <div class="card"><h3>${channels.size}</h3><p>📁 القنوات</p></div>
            <div class="card"><h3>${roles.size}</h3><p>🎭 الرتب</p></div>
            <div class="card"><h3>${warningsCount}</h3><p>⚠️ التحذيرات</p></div>
          </div>
        </div>

        <div id="members" class="section">
          <h2>👥 الأعضاء</h2>
          <table>
            <tr><th>العضو</th><th>ID</th><th>انضم</th><th>الرتب</th><th>تحذيرات</th></tr>
            ${members.filter(m => !m.user.bot).map(m => {
              const warns = (db.warnings[m.id] || []).filter(w => !w.removed).length;
              const roleList = m.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || '—';
              return `<tr><td><img src="${m.user.displayAvatarURL({size:32})}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-left:8px">${m.user.tag}</td><td><code>${m.id}</code></td><td>${m.joinedAt?.toLocaleDateString('ar-SA') || '؟'}</td><td>${roleList}</td><td>${warns}</td></tr>`;
            }).slice(0, 100).join('')}
          </table>
        </div>

        <div id="roles" class="section">
          <h2>🎭 الرتب</h2>
          <table>
            <tr><th>الرتبة</th><th>اللون</th><th>الأعضاء</th><th>الموضع</th></tr>
            ${roles.sort((a, b) => b.position - a.position).map(r => `<tr><td><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${r.hexColor};margin-left:8px"></span>${r.name}</td><td>${r.hexColor}</td><td>${r.members.size}</td><td>${r.position}</td></tr>`).join('')}
          </table>
        </div>

        <div id="channels" class="section">
          <h2>📁 القنوات</h2>
          <table>
            <tr><th>القناة</th><th>النوع</th><th>الكاتيجوري</th></tr>
            ${channels.filter(c => c.type !== 4).map(c => {
              const types = {0:'💬 نص', 2:'🔊 صوت', 4:'📂 كاتيجوري', 5:'📢 إعلان', 13:'🎙️ ستيج', 15:'🗂️ فوروم'};
              return `<tr><td># ${c.name}</td><td>${types[c.type] || c.type}</td><td>${c.parent?.name || '—'}</td></tr>`;
            }).join('')}
          </table>
        </div>

        <div id="blacklist" class="section">
          <h2>🚫 القائمة السوداء</h2>
          <form action="/blacklist/add" method="POST" class="form-row">
            <select name="type"><option value="user">👤 عضو</option><option value="channel">📁 قناة</option></select>
            <input type="text" name="targetId" placeholder="ID" required>
            <input type="text" name="reason" placeholder="السبب">
            <button type="submit" class="btn">➕ إضافة</button>
          </form>
          <table>
            <tr><th>النوع</th><th>ID</th><th>السبب</th><th>تاريخ</th></tr>
            ${db.blacklist.length ? db.blacklist.map(b => `<tr><td>${b.type}</td><td><code>${b.targetId}</code></td><td>${b.reason || '—'}</td><td>${new Date(b.addedAt).toLocaleDateString('ar-SA')}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#8892b0">لا يوجد</td></tr>'}
          </table>
        </div>

        <div id="warnings" class="section">
          <h2>⚠️ التحذيرات</h2>
          <table>
            <tr><th>العضو</th><th>ID</th><th>التحذيرات الفعّالة</th></tr>
            ${Object.entries(db.warnings).map(([id, warns]) => {
              const active = warns.filter(w => !w.removed).length;
              if (!active) return '';
              const member = members.get(id);
              return `<tr><td>${member?.user.tag || 'مجهول'}</td><td><code>${id}</code></td><td><span style="color:#ffd700;font-weight:700">${active}</span></td></tr>`;
            }).filter(Boolean).join('') || '<tr><td colspan="3" style="text-align:center;color:#8892b0">لا يوجد تحذيرات</td></tr>'}
          </table>
        </div>

        <div id="bot" class="section">
          <h2>🤖 معلومات البوت</h2>
          <table>
            <tr><th>البيان</th><th>القيمة</th></tr>
            <tr><td>الاسم</td><td>${client.user?.tag || '—'}</td></tr>
            <tr><td>ID</td><td><code>${client.user?.id || '—'}</code></td></tr>
            <tr><td>الحالة</td><td><span class="status-online">🟢 أونلاين</span></td></tr>
            <tr><td>السيرفرات</td><td>${client.guilds.cache.size}</td></tr>
            <tr><td>Uptime</td><td>${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m</td></tr>
          </table>
        </div>

        <div id="logs" class="section">
          <h2>📋 السجلات</h2>
          <h3 style="color:#64ffda">🔑 سجل الدخول</h3>
          <table>
            <tr><th>الوقت</th><th>الإجراء</th><th>التفاصيل</th><th>IP</th></tr>
            ${db.accessLogs.slice(0, 20).map(l => `<tr><td>${new Date(l.time).toLocaleString('ar-SA')}</td><td>${l.action}</td><td>${l.details}</td><td><code>${l.ip || '—'}</code></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#8892b0">لا يوجد</td></tr>'}
          </table>
          <h3 style="color:#64ffda;margin-top:20px">⚖️ سجل الإدارة</h3>
          <table>
            <tr><th>الوقت</th><th>النوع</th><th>الهدف</th><th>السبب</th><th>بواسطة</th></tr>
            ${db.modLogs.slice(0, 20).map(l => `<tr><td>${new Date(l.time).toLocaleString('ar-SA')}</td><td>${l.type}</td><td>${l.target}</td><td>${l.reason}</td><td>${l.by}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#8892b0">لا يوجد</td></tr>'}
          </table>
        </div>
      </body></html>`);
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).send('❌ حدث خطأ: ' + err.message);
    }
  });

  // ── Blacklist API ──
  app.post('/blacklist/add', auth, (req, res) => {
    const { type, targetId, reason } = req.body;
    db.blacklist.push({ type, targetId, reason: reason || '', addedAt: new Date().toISOString() });
    addModLog('blacklist-add', targetId, reason || '—', 'Dashboard');
    res.redirect('/dashboard#blacklist');
  });

  // ── Health Check ──
  app.get('/health', (req, res) => {
    const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
    res.json({
      status: 'ok',
      bot: client.user?.tag || 'not ready',
      guild: guild?.name || 'not found',
      members: guild?.memberCount || 0,
      uptime: process.uptime()
    });
  });
}

module.exports = { setupDashboard };
