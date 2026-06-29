const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits
} = require('discord.js');

const TOKEN    = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// قاعدة بيانات بسيطة في الذاكرة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const db = {
  books: {},        // Book Tracker: { userId: [{title, date}] }
  wordCount: {},    // Word Count: { userId: { today: N, total: N, goal: N } }
  sprints: {},      // Writing Sprints: { channelId: { active, endTime, participants: {} } }
  awards: {},       // Monthly Awards: { userId: { reads: N, words: N, reviews: N } }
};

// اقتباسات أدبية
const QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "It is our choices that show what we truly are, far more than our abilities.", author: "J.K. Rowling" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "One must always be careful of books, and what is inside them, for words have the power to change us.", author: "Cassandra Clare" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "A book is a dream that you hold in your hands.", author: "Neil Gaiman" },
  { text: "Until I feared I would lose it, I never loved to read. One does not love breathing.", author: "Harper Lee" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking.", author: "Haruki Murakami" },
  { text: "The world was hers for the reading.", author: "Betty Smith" },
  { text: "You think your pain and your heartbreak are unprecedented in the history of the world, but then you read.", author: "James Baldwin" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "I am not afraid of storms, for I am learning how to sail my ship.", author: "Louisa May Alcott" },
];

// توصيات الروايات حسب النوع
const NOVEL_RECS = {
  fantasy: [
    "🧙 **The Name of the Wind** — Patrick Rothfuss",
    "🗡️ **The Way of Kings** — Brandon Sanderson",
    "🌍 **The Hobbit** — J.R.R. Tolkien",
    "⚔️ **A Game of Thrones** — George R.R. Martin",
    "🔮 **The Final Empire** — Brandon Sanderson",
  ],
  action: [
    "⚡ **Solo Leveling** — Chugong",
    "🥊 **One Punch Man** (Novel) — ONE",
    "🗡️ **Overlord** — Kugane Maruyama",
    "🔥 **Re:Zero** — Tappei Nagatsuki",
    "💪 **The Beginning After the End** — TurtleMe",
  ],
  romance: [
    "💕 **Pride and Prejudice** — Jane Austen",
    "🌹 **Outlander** — Diana Gabaldon",
    "💝 **The Notebook** — Nicholas Sparks",
    "🌸 **Horimiya** (Novel) — HERO",
    "💌 **Anna and the French Kiss** — Stephanie Perkins",
  ],
  mystery: [
    "🔍 **And Then There Were None** — Agatha Christie",
    "🕵️ **The Girl with the Dragon Tattoo** — Stieg Larsson",
    "🗝️ **Gone Girl** — Gillian Flynn",
    "🔎 **The Da Vinci Code** — Dan Brown",
    "🌃 **Big Little Lies** — Liane Moriarty",
  ],
  scifi: [
    "🚀 **Dune** — Frank Herbert",
    "🤖 **Foundation** — Isaac Asimov",
    "🌌 **The Hitchhiker's Guide** — Douglas Adams",
    "👾 **Ender's Game** — Orson Scott Card",
    "🛸 **The Martian** — Andy Weir",
  ],
  horror: [
    "👻 **It** — Stephen King",
    "🏚️ **The Haunting of Hill House** — Shirley Jackson",
    "🧟 **World War Z** — Max Brooks",
    "🩸 **Dracula** — Bram Stoker",
    "😱 **The Shining** — Stephen King",
  ],
  wuxia: [
    "☁️ **Renegade Immortal** — Er Gen",
    "⚡ **A Will Eternal** — Er Gen",
    "🌊 **I Shall Seal the Heavens** — Er Gen",
    "🔥 **Coiling Dragon** — I Eat Tomatoes",
    "🌙 **Against the Gods** — Mars Gravity",
  ],
  isekai: [
    "🗡️ **Sword Art Online** — Reki Kawahara",
    "🔮 **That Time I Got Reincarnated as a Slime** — Fuse",
    "🌸 **Mushoku Tensei** — Rifujin na Magonote",
    "⚔️ **Overlord** — Kugane Maruyama",
    "🎮 **Log Horizon** — Mamare Touno",
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تسجيل Slash Commands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = [
  // Book Tracker
  new SlashCommandBuilder()
    .setName('addbook')
    .setDescription('📚 سجّل كتاباً أنهيت قراءته')
    .addStringOption(o => o.setName('title').setDescription('اسم الكتاب').setRequired(true)),
  new SlashCommandBuilder()
    .setName('mybookList')
    .setDescription('📖 شوف قائمة كتبك'),
  new SlashCommandBuilder()
    .setName('bookstats')
    .setDescription('📊 إحصائيات قراءتك'),

  // Writing Sprint
  new SlashCommandBuilder()
    .setName('sprint')
    .setDescription('⚡ ابدأ سباق كتابة')
    .addIntegerOption(o => o.setName('minutes').setDescription('مدة السباق بالدقائق (5-60)').setRequired(true).setMinValue(5).setMaxValue(60)),
  new SlashCommandBuilder()
    .setName('wc')
    .setDescription('✍️ سجّل كلماتك في السباق')
    .addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),

  // Word Count Tracker
  new SlashCommandBuilder()
    .setName('wordcount')
    .setDescription('📝 سجّل كلماتك اليومية')
    .addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder()
    .setName('mywords')
    .setDescription('📈 شوف إحصائيات كلماتك'),
  new SlashCommandBuilder()
    .setName('setgoal')
    .setDescription('🎯 حدد هدف الكلمات اليومي')
    .addIntegerOption(o => o.setName('goal').setDescription('الهدف اليومي').setRequired(true)),

  // Novel Recommender
  new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('🤖 احصل على توصية رواية')
    .addStringOption(o => o
      .setName('genre')
      .setDescription('نوع الرواية')
      .setRequired(true)
      .addChoices(
        { name: '🧙 Fantasy', value: 'fantasy' },
        { name: '⚡ Action', value: 'action' },
        { name: '💕 Romance', value: 'romance' },
        { name: '🔍 Mystery', value: 'mystery' },
        { name: '🚀 Sci-Fi', value: 'scifi' },
        { name: '👻 Horror', value: 'horror' },
        { name: '☁️ Wuxia/Xianxia', value: 'wuxia' },
        { name: '🗡️ Isekai', value: 'isekai' },
      )),

  // Server Stats
  new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('📊 إحصائيات السيرفر'),

  // Monthly Awards (للأدمن فقط)
  new SlashCommandBuilder()
    .setName('monthlyawards')
    .setDescription('🏆 أعلن جوائز الشهر (أدمن فقط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Quote
  new SlashCommandBuilder()
    .setName('quote')
    .setDescription('💬 احصل على اقتباس أدبي عشوائي'),
].map(c => c.toJSON());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// عند تشغيل البوت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('clientReady', async () => {
  console.log(`✅ البوت شغّال: ${client.user.tag}`);

  const guild = client.guilds.cache.find(g => g.name === 'T.G.W');
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
  console.log(`🏠 السيرفر: ${guild.name}`);

  // سجّل الأوامر
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commands });
  console.log('✅ الأوامر سُجّلت!\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // أرسل رسالة Language Roles
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const langCh = guild.channels.cache.find(c => c.name.includes('language-roles'));
  if (langCh) {
    const msgs = await langCh.messages.fetch({ limit: 5 });
    const botMsg = msgs.find(m => m.author.id === client.user.id);
    if (!botMsg) {
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🌍 اختر مجتمعك اللغوي')
        .setDescription([
          '> اختر الرتبة اللغوية للوصول إلى قنوات المجتمع الخاص!',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '🇨🇳 **Chinese** — Wuxia • Xianxia • Manhua',
          '🇯🇵 **Japanese** — Light Novel • Isekai • Manga',
          '🇰🇷 **Korean** — Manhwa • Web Novel',
          '🇸🇦 **Arabic** — روايات عربية • أدب',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '✅ يمكنك اختيار **أكثر من رتبة**',
          '❌ اضغط مرة ثانية **لإلغاء** الرتبة',
        ].join('\n'))
        .setFooter({ text: 'Novel Nexus • Language Communities' });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_cn').setLabel('🇨🇳 Chinese Novels').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lang_jp').setLabel('🇯🇵 Japanese Novels').setStyle(ButtonStyle.Primary),
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_kr').setLabel('🇰🇷 Korean Novels').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('lang_ar').setLabel('🇸🇦 Arabic Novels').setStyle(ButtonStyle.Secondary),
      );
      await langCh.send({ embeds: [embed], components: [row1, row2] });
      console.log('✅ رسالة Language Roles أُرسلت!');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // أرسل شرح البوت في server-guide
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const guideCh = guild.channels.cache.find(c => c.name.includes('server-guide'));
  if (guideCh) {
    const msgs = await guideCh.messages.fetch({ limit: 20 });
    const botGuide = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('ميزات البوت'));
    if (!botGuide) {
      await new Promise(r => setTimeout(r, 2000));
      const botGuideEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 ميزات البوت الحصرية')
        .setDescription('جميع الأوامر المتاحة في Novel Nexus:')
        .addFields(
          {
            name: '📚 Book Tracker — تتبع قراءتك',
            value: [
              '`/addbook [اسم الكتاب]` — سجّل كتاباً أنهيته',
              '`/mybooklist` — شوف قائمة كتبك كاملة',
              '`/bookstats` — إحصائيات قراءتك الشهرية والكلية',
            ].join('\n'),
            inline: false,
          },
          {
            name: '⚡ Writing Sprint — سباق الكتابة',
            value: [
              '`/sprint [دقائق]` — ابدأ سباق كتابة (5-60 دقيقة)',
              '`/wc [كلمات]` — سجّل كلماتك في السباق',
              '*البوت يعلن الفائز تلقائياً عند انتهاء الوقت!*',
            ].join('\n'),
            inline: false,
          },
          {
            name: '📝 Word Count — عداد الكلمات',
            value: [
              '`/wordcount [كلمات]` — سجّل كلماتك اليومية',
              '`/setgoal [هدف]` — حدد هدف كلمات يومي',
              '`/mywords` — شوف تقدمك وإحصائياتك',
            ].join('\n'),
            inline: false,
          },
          {
            name: '🤖 Novel Recommender — توصيات',
            value: [
              '`/recommend [النوع]` — احصل على 5 توصيات رواية',
              '*الأنواع: Fantasy, Action, Romance, Mystery,*',
              '*Sci-Fi, Horror, Wuxia, Isekai*',
            ].join('\n'),
            inline: false,
          },
          {
            name: '💬 Quote — اقتباسات',
            value: '`/quote` — اقتباس أدبي عشوائي من أشهر الكتّاب',
            inline: false,
          },
          {
            name: '📊 Server Stats — إحصائيات',
            value: '`/serverstats` — عدد الأعضاء والقنوات ونشاط السيرفر',
            inline: false,
          },
          {
            name: '🏆 Monthly Awards — جوائز شهرية (أدمن)',
            value: '`/monthlyawards` — أعلن جوائز الشهر تلقائياً في السيرفر',
            inline: false,
          },
        )
        .setFooter({ text: 'Novel Nexus Bot • جميع الأوامر Slash Commands' });

      await guideCh.send({ embeds: [botGuideEmbed] });
      console.log('✅ شرح البوت أُرسل في server-guide!');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Daily Quote — كل يوم الساعة 9 صباحاً
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sendDailyQuote = async () => {
    const qotdCh = guild.channels.cache.find(c => c.name.includes('qotd'));
    if (!qotdCh) return;
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('💬 اقتباس اليوم')
      .setDescription(`*"${q.text}"*`)
      .addFields({ name: '✍️ المؤلف', value: `**${q.author}**`, inline: false })
      .setFooter({ text: 'Novel Nexus • Daily Quote' })
      .setTimestamp();
    await qotdCh.send({ embeds: [embed] });
    console.log('📅 Daily Quote أُرسل!');
  };

  // حساب الوقت حتى 9 صباحاً القادمة
  const scheduleDaily = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    if (now >= next) next.setDate(next.getDate() + 1);
    const delay = next - now;
    setTimeout(() => {
      sendDailyQuote();
      setInterval(sendDailyQuote, 24 * 60 * 60 * 1000);
    }, delay);
  };
  scheduleDaily();
  console.log('⏰ Daily Quote مجدول كل يوم الساعة 9 صباحاً\n');
  console.log('🔄 البوت شغّال وجاهز لاستقبال الأوامر!');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة التفاعلات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('interactionCreate', async (interaction) => {

  // ── أزرار Language Roles ──
  if (interaction.isButton()) {
    const roleMap = {
      'lang_cn': '🇨🇳 Chinese Novel Reader',
      'lang_jp': '🇯🇵 Japanese Novel Reader',
      'lang_kr': '🇰🇷 Korean Novel Reader',
      'lang_ar': '🇸🇦 Arabic Novel Reader',
    };
    const roleName = roleMap[interaction.customId];
    if (!roleName) return;

    await interaction.deferReply({ ephemeral: true });
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return interaction.editReply({ content: '❌ ما لقيت الرتبة!' });

    const has = interaction.member.roles.cache.has(role.id);
    if (has) {
      await interaction.member.roles.remove(role);
      return interaction.editReply({ content: `✅ تمت إزالة رتبة **${roleName}**` });
    } else {
      await interaction.member.roles.add(role);
      return interaction.editReply({ content: `🎉 حصلت على رتبة **${roleName}**! تحقق من القنوات الجديدة 👀` });
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guild } = interaction;
  const uid = user.id;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /addbook
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'addbook') {
    const title = interaction.options.getString('title');
    if (!db.books[uid]) db.books[uid] = [];
    db.books[uid].push({ title, date: new Date().toLocaleDateString('ar-SA') });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('📚 تم تسجيل الكتاب!')
      .addFields(
        { name: '📖 الكتاب', value: title, inline: true },
        { name: '📅 التاريخ', value: new Date().toLocaleDateString('ar-SA'), inline: true },
        { name: '📊 إجمالي كتبك', value: `${db.books[uid].length} كتاب`, inline: true },
      )
      .setFooter({ text: 'استخدم /mybooklist لتشوف قائمتك كاملة' });

    // تحديث إحصائيات الجوائز
    if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0, reviews: 0 };
    db.awards[uid].reads++;

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /mybooklist
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'mybooklist') {
    const books = db.books[uid];
    if (!books || books.length === 0) {
      return interaction.reply({ content: '📚 ما سجّلت أي كتاب بعد! استخدم `/addbook`', ephemeral: true });
    }
    const list = books.map((b, i) => `${i + 1}. **${b.title}** — ${b.date}`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📚 قائمة كتب ${user.displayName}`)
      .setDescription(list.length > 2000 ? list.slice(0, 2000) + '...' : list)
      .setFooter({ text: `إجمالي: ${books.length} كتاب` });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /bookstats
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'bookstats') {
    const books = db.books[uid] || [];
    const thisMonth = books.filter(b => {
      const d = new Date(b.date);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`📊 إحصائيات ${user.displayName}`)
      .addFields(
        { name: '📚 إجمالي الكتب', value: `${books.length} كتاب`, inline: true },
        { name: '📅 هذا الشهر', value: `${thisMonth.length} كتاب`, inline: true },
        { name: '🏆 التقدير', value: books.length >= 20 ? '🌌 Legend Reader' : books.length >= 10 ? '📓 Reader V' : books.length >= 5 ? '📕 Reader IV' : books.length >= 3 ? '📙 Reader III' : '📗 Reader I', inline: true },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /sprint
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'sprint') {
    const minutes = interaction.options.getInteger('minutes');
    const chId = interaction.channelId;

    if (db.sprints[chId]?.active) {
      return interaction.reply({ content: '⚡ في سباق شغّال الحين! انتظر ينتهي أو سجّل كلماتك بـ `/wc`', ephemeral: true });
    }

    const endTime = Date.now() + minutes * 60 * 1000;
    db.sprints[chId] = { active: true, endTime, participants: {}, startedBy: uid };

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('⚡ سباق الكتابة بدأ!')
      .setDescription([
        `> **المدة:** ${minutes} دقيقة`,
        `> **ينتهي:** <t:${Math.floor(endTime / 1000)}:R>`,
        '',
        '✍️ اكتب أكبر قدر ممكن من الكلمات!',
        '📝 عند الانتهاء استخدم `/wc [عدد الكلمات]`',
      ].join('\n'))
      .setFooter({ text: `بدأه: ${user.displayName}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // إعلان النتائج عند انتهاء الوقت
    setTimeout(async () => {
      db.sprints[chId].active = false;
      const parts = db.sprints[chId].participants;
      const sorted = Object.entries(parts).sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        await interaction.channel.send('⏰ انتهى السباق! ما سجّل أحد كلمات.');
        return;
      }

      const podium = sorted.slice(0, 3).map(([id, wc], i) => {
        const medals = ['🥇', '🥈', '🥉'];
        return `${medals[i]} <@${id}> — **${wc} كلمة**`;
      }).join('\n');

      const resultsEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏁 انتهى السباق! النتائج:')
        .setDescription(podium)
        .setFooter({ text: `مجموع الكلمات: ${sorted.reduce((a, [, w]) => a + w, 0)} كلمة` });

      await interaction.channel.send({ embeds: [resultsEmbed] });
      delete db.sprints[chId];
    }, minutes * 60 * 1000);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /wc
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'wc') {
    const words = interaction.options.getInteger('words');
    const chId = interaction.channelId;

    if (!db.sprints[chId]?.active) {
      return interaction.reply({ content: '❌ ما في سباق شغّال الحين! استخدم `/sprint` لتبدأ واحداً.', ephemeral: true });
    }

    db.sprints[chId].participants[uid] = (db.sprints[chId].participants[uid] || 0) + words;
    if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0, reviews: 0 };
    db.awards[uid].words += words;

    return interaction.reply({
      content: `✅ سُجّلت **${words} كلمة** لـ ${user.displayName}! إجمالي في السباق: **${db.sprints[chId].participants[uid]} كلمة**`,
      ephemeral: false,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /wordcount
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'wordcount') {
    const words = interaction.options.getInteger('words');
    if (!db.wordCount[uid]) db.wordCount[uid] = { today: 0, total: 0, goal: 1000 };
    db.wordCount[uid].today += words;
    db.wordCount[uid].total += words;
    if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0, reviews: 0 };
    db.awards[uid].words += words;

    const { today, total, goal } = db.wordCount[uid];
    const progress = Math.min(Math.round((today / goal) * 100), 100);
    const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const embed = new EmbedBuilder()
      .setColor(progress >= 100 ? 0x57F287 : 0x5865F2)
      .setTitle('📝 كلماتك اليومية')
      .addFields(
        { name: '✍️ اليوم', value: `${today.toLocaleString()} كلمة`, inline: true },
        { name: '🎯 الهدف', value: `${goal.toLocaleString()} كلمة`, inline: true },
        { name: '📊 الإجمالي', value: `${total.toLocaleString()} كلمة`, inline: true },
        { name: `التقدم ${progress}%`, value: `\`${bar}\``, inline: false },
      )
      .setDescription(progress >= 100 ? '🎉 أحسنت! وصلت هدفك اليومي!' : '')
      .setFooter({ text: 'استخدم /setgoal لتغيير الهدف' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /mywords
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'mywords') {
    const wc = db.wordCount[uid] || { today: 0, total: 0, goal: 1000 };
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`📈 إحصائيات ${user.displayName}`)
      .addFields(
        { name: '📅 اليوم', value: `${wc.today.toLocaleString()} كلمة`, inline: true },
        { name: '🎯 الهدف اليومي', value: `${wc.goal.toLocaleString()} كلمة`, inline: true },
        { name: '📚 الإجمالي الكلي', value: `${wc.total.toLocaleString()} كلمة`, inline: true },
        { name: '🏆 التقدير', value: wc.total >= 100000 ? '🌌 Legend Writer' : wc.total >= 50000 ? '🖊️ Writer V' : wc.total >= 20000 ? '🖊️ Writer IV' : wc.total >= 5000 ? '🖊️ Writer III' : '🖊️ Writer I', inline: true },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /setgoal
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'setgoal') {
    const goal = interaction.options.getInteger('goal');
    if (!db.wordCount[uid]) db.wordCount[uid] = { today: 0, total: 0, goal: 1000 };
    db.wordCount[uid].goal = goal;
    return interaction.reply({ content: `🎯 تم تحديد هدفك اليومي: **${goal.toLocaleString()} كلمة**`, ephemeral: true });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /recommend
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'recommend') {
    const genre = interaction.options.getString('genre');
    const recs = NOVEL_RECS[genre];
    const genreNames = {
      fantasy: '🧙 Fantasy', action: '⚡ Action', romance: '💕 Romance',
      mystery: '🔍 Mystery', scifi: '🚀 Sci-Fi', horror: '👻 Horror',
      wuxia: '☁️ Wuxia/Xianxia', isekai: '🗡️ Isekai',
    };
    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle(`${genreNames[genre]} — توصيات الروايات`)
      .setDescription(recs.join('\n\n'))
      .setFooter({ text: 'Novel Nexus • Novel Recommender' });
    return interaction.reply({ embeds: [embed] });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /quote
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'quote') {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('💬 اقتباس أدبي')
      .setDescription(`*"${q.text}"*`)
      .addFields({ name: '✍️', value: `**${q.author}**`, inline: false })
      .setFooter({ text: 'Novel Nexus • Random Quote' });
    return interaction.reply({ embeds: [embed] });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /serverstats
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'serverstats') {
    const g = interaction.guild;
    const members    = g.memberCount;
    const channels   = g.channels.cache.size;
    const roles      = g.roles.cache.size;
    const bots       = g.members.cache.filter(m => m.user.bot).size;
    const humans     = members - bots;
    const online     = g.members.cache.filter(m => m.presence?.status !== 'offline' && !m.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 إحصائيات ${g.name}`)
      .setThumbnail(g.iconURL())
      .addFields(
        { name: '👥 الأعضاء', value: `${humans.toLocaleString()} عضو`, inline: true },
        { name: '🤖 البوتات', value: `${bots}`, inline: true },
        { name: '🟢 متصل الآن', value: `${online}`, inline: true },
        { name: '📁 القنوات', value: `${channels}`, inline: true },
        { name: '🎭 الرتب', value: `${roles}`, inline: true },
        { name: '📅 تأسس', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
      )
      .setFooter({ text: 'Novel Nexus • Server Stats' })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /monthlyawards
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'monthlyawards') {
    await interaction.deferReply();

    const awards = db.awards;
    if (Object.keys(awards).length === 0) {
      return interaction.editReply({ content: '❌ ما في بيانات كافية للجوائز الشهر.' });
    }

    // أفضل قارئ
    const topReader = Object.entries(awards).sort((a, b) => b[1].reads - a[1].reads)[0];
    // أفضل كاتب
    const topWriter = Object.entries(awards).sort((a, b) => b[1].words - a[1].words)[0];

    const month = new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 جوائز شهر ${month}`)
      .setDescription('تهانينا للفائزين! 🎉')
      .addFields(
        {
          name: '📚 أفضل قارئ الشهر',
          value: topReader ? `<@${topReader[0]}> — ${topReader[1].reads} كتاب` : 'لا يوجد بيانات',
          inline: false,
        },
        {
          name: '✍️ أفضل كاتب الشهر',
          value: topWriter ? `<@${topWriter[0]}> — ${topWriter[1].words.toLocaleString()} كلمة` : 'لا يوجد بيانات',
          inline: false,
        },
      )
      .setFooter({ text: 'Novel Nexus • Monthly Awards' })
      .setTimestamp();

    // أرسل في قناة الإعلانات
    const annCh = guild.channels.cache.find(c => c.name.includes('announcements'));
    if (annCh) await annCh.send({ embeds: [embed] });

    // صفّر البيانات للشهر القادم
    Object.keys(db.awards).forEach(id => { db.awards[id] = { reads: 0, words: 0, reviews: 0 }; });
    Object.keys(db.wordCount).forEach(id => { db.wordCount[id].today = 0; });

    return interaction.editReply({ content: '✅ تم إعلان الجوائز في #announcements وتصفير البيانات!' });
  }
});

client.login(TOKEN);
