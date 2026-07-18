const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits
} = require('discord.js');

const TOKEN     = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
}); 

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// قاعدة بيانات في الذاكرة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const db = {
  books:     {},  // { userId: [{title, date}] }
  wordCount: {},  // { userId: { today, total, goal } }
  sprints:   {},  // { channelId: { active, endTime, participants } }
  awards:    {},  // { userId: { reads, words } }
  trivia:    {},  // { userId: { points, correct, wrong } }
  activeTriviaGame: null, // { question, answer, points, channelId, timeout }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// اقتباسات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QUOTES = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "It is our choices that show what we truly are.", author: "J.K. Rowling" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "A book is a dream that you hold in your hands.", author: "Neil Gaiman" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking.", author: "Haruki Murakami" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "One must always be careful of books, for words have the power to change us.", author: "Cassandra Clare" },
  { text: "Until I feared I would lose it, I never loved to read.", author: "Harper Lee" },
];

const WRITING_TIPS = [
  "✍️ اكتب كل يوم ولو 100 كلمة — الاستمرارية أهم من الكمية",
  "📖 اقرأ في نفس النوع الذي تكتبه — الأفضل يتعلم من الأفضل",
  "🎯 حدد هدفك قبل الكتابة — من أين تبدأ ومن أين تنتهي",
  "🗣️ اكتب كما تتكلم — الطبيعية أفضل من التكلف",
  "⏰ حدد وقتاً ثابتاً للكتابة — الدماغ يحتاج روتين",
  "🔄 المسودة الأولى لا تحتاج أن تكون مثالية — فقط أكملها",
  "👥 اطلب رأي قراء تجريبيين قبل النشر",
  "🌍 ابنِ عالمك أولاً ثم اكتب قصتك",
  "💬 الحوار يجب أن يكشف الشخصية لا فقط ينقل المعلومات",
  "⚡ ابدأ من أكثر لحظة توتراً — لا تبدأ من الصفر",
  "🎭 كل شخصية تحتاج هدفاً وخوفاً وعيباً",
  "📝 الفصل الأول مهمته الوحيدة: دفع القارئ لقراءة الفصل الثاني",
];

const NOVEL_RECS = {
  fantasy: ["🧙 **The Name of the Wind** — Patrick Rothfuss","🗡️ **The Way of Kings** — Brandon Sanderson","🌍 **The Hobbit** — J.R.R. Tolkien","⚔️ **A Game of Thrones** — George R.R. Martin","🔮 **The Final Empire** — Brandon Sanderson"],
  action:  ["⚡ **Solo Leveling** — Chugong","🥊 **The Beginning After the End** — TurtleMe","🗡️ **Overlord** — Kugane Maruyama","🔥 **Re:Zero** — Tappei Nagatsuki","💪 **Omniscient Reader** — sing shong"],
  romance: ["💕 **Pride and Prejudice** — Jane Austen","🌹 **Outlander** — Diana Gabaldon","💝 **The Notebook** — Nicholas Sparks","🌸 **Horimiya** — HERO","💌 **Anna and the French Kiss** — Stephanie Perkins"],
  mystery: ["🔍 **And Then There Were None** — Agatha Christie","🕵️ **The Girl with the Dragon Tattoo** — Stieg Larsson","🗝️ **Gone Girl** — Gillian Flynn","🔎 **The Da Vinci Code** — Dan Brown","🌃 **Big Little Lies** — Liane Moriarty"],
  scifi:   ["🚀 **Dune** — Frank Herbert","🤖 **Foundation** — Isaac Asimov","🌌 **The Hitchhiker's Guide** — Douglas Adams","👾 **Ender's Game** — Orson Scott Card","🛸 **The Martian** — Andy Weir"],
  horror:  ["👻 **It** — Stephen King","🏚️ **The Haunting of Hill House** — Shirley Jackson","🧟 **World War Z** — Max Brooks","🩸 **Dracula** — Bram Stoker","😱 **The Shining** — Stephen King"],
  wuxia:   ["☁️ **Renegade Immortal** — Er Gen","⚡ **A Will Eternal** — Er Gen","🌊 **I Shall Seal the Heavens** — Er Gen","🔥 **Coiling Dragon** — I Eat Tomatoes","🌙 **Against the Gods** — Mars Gravity"],
  isekai:  ["🗡️ **Sword Art Online** — Reki Kawahara","🔮 **That Time I Got Reincarnated as a Slime** — Fuse","🌸 **Mushoku Tensei** — Rifujin na Magonote","⚔️ **Overlord** — Kugane Maruyama","🎮 **Log Horizon** — Mamare Touno"],
};

const RANDOM_BOOKS = [
  { title: "The Alchemist", author: "Paulo Coelho", genre: "Philosophy" },
  { title: "1984", author: "George Orwell", genre: "Dystopia" },
  { title: "The Little Prince", author: "Antoine de Saint-Exupéry", genre: "Classic" },
  { title: "Animal Farm", author: "George Orwell", genre: "Satire" },
  { title: "Brave New World", author: "Aldous Huxley", genre: "Sci-Fi" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Drama" },
  { title: "The Catcher in the Rye", author: "J.D. Salinger", genre: "Coming-of-age" },
  { title: "Lord of the Flies", author: "William Golding", genre: "Dystopia" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", genre: "Sci-Fi" },
  { title: "The Road", author: "Cormac McCarthy", genre: "Post-Apocalyptic" },
  { title: "Of Mice and Men", author: "John Steinbeck", genre: "Drama" },
];

const LITERARY_TERMS = {
  "protagonist": "البطل الرئيسي في القصة — الشخصية التي تتمحور حولها الأحداث",
  "antagonist": "الخصم أو قوة المعارضة التي تواجه البطل",
  "foreshadowing": "التلميح — إشارات مبكرة في القصة تلمح لأحداث قادمة",
  "cliffhanger": "نهاية مشوّقة تترك القارئ في تعليق وترقّب",
  "plot twist": "منعطف مفاجئ يغيّر مجرى القصة بشكل غير متوقع",
  "worldbuilding": "بناء العالم — عملية إنشاء الكون الخيالي للرواية",
  "pov": "وجهة النظر — الزاوية التي تُروى منها القصة",
  "arc": "قوس الشخصية — تطور شخصية ما عبر مسار القصة",
  "trope": "عنصر سردي متكرر ومألوف في نوع أدبي معين",
  "genre": "النوع الأدبي — تصنيف الأعمال الأدبية حسب خصائصها",
  "manhwa": "الكوميكس الكوري — يُقرأ من اليسار لليمين",
  "manhua": "الكوميكس الصيني",
  "light novel": "رواية خفيفة يابانية مصحوبة بصور أنيمي",
  "wuxia": "نوع صيني يدور حول فنون القتال والبطولة",
  "xianxia": "نوع صيني يدور حول الزهد وتحقيق الخلود",
  "isekai": "نوع ياباني يتناول انتقال شخص إلى عالم آخر",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// أسئلة Trivia للروايات والكتب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TRIVIA_QUESTIONS = [
  // سهلة (1 نقطة)
  { q: "من كتب رواية هاري بوتر؟", a: ["j.k. rowling","rowling","جيه كي رولينج","رولينج"], points: 1, diff: "🟢 سهل" },
  { q: "من كتب رواية The Hobbit (الهوبيت)؟", a: ["tolkien","j.r.r tolkien","تولكين"], points: 1, diff: "🟢 سهل" },
  { q: "في أي دولة تدور أحداث رواية 1984 لجورج أورويل؟", a: ["oceania","أوقيانوسيا","اوقيانوسيا"], points: 1, diff: "🟢 سهل" },
  { q: "ما اسم الساحر المساعد في هاري بوتر الذي يدرّس الدفاع ضد السحر الأسود في الجزء الثالث؟", a: ["lupin","لوبين","ريموس لوبين"], points: 1, diff: "🟢 سهل" },
  { q: "كم عدد أجزاء سلسلة The Lord of the Rings؟", a: ["3","ثلاثة","three"], points: 1, diff: "🟢 سهل" },
  { q: "من كتب رواية Dune (الكثيب)؟", a: ["frank herbert","herbert","فرانك هيربرت"], points: 1, diff: "🟢 سهل" },
  { q: "ما اسم مدرسة السحر في هاري بوتر؟", a: ["hogwarts","هوغوارتس","هوجوارتس"], points: 1, diff: "🟢 سهل" },
  { q: "من كتب رواية Pride and Prejudice؟", a: ["jane austen","austen","جين أوستن"], points: 1, diff: "🟢 سهل" },

  // متوسطة (2 نقطة)
  { q: "في Solo Leveling، ما اسم البطل الرئيسي؟", a: ["sung jinwoo","jinwoo","سونغ جين وو","جين وو"], points: 2, diff: "🟡 متوسط" },
  { q: "في رواية Overlord، ما اسم شخصية الساحر الهيكل العظمي؟", a: ["ainz","ainz ooal gown","آينز","ainz ooal"], points: 2, diff: "🟡 متوسط" },
  { q: "في Re:Zero، كم مرة يموت سوباروا تقريباً قبل أن يتعلم الحقيقة عن قدرته؟", a: ["كثير","لا محدود","infinite","يعود للنقطة السابقة"], points: 2, diff: "🟡 متوسط" },
  { q: "ما اسم الجزيرة في رواية Lord of the Flies؟", a: ["مجهولة","unnamed","بدون اسم","لم تذكر"], points: 2, diff: "🟡 متوسط" },
  { q: "في Dune، ما اسم الكوكب الرئيسي الذي تدور فيه الأحداث؟", a: ["arrakis","أراكيس","dune"], points: 2, diff: "🟡 متوسط" },
  { q: "من كتب رواية The Name of the Wind؟", a: ["patrick rothfuss","rothfuss","باتريك روثفوس"], points: 2, diff: "🟡 متوسط" },
  { q: "في The Way of Kings، ما اسم بطل الرواية الذي كان عبداً؟", a: ["kaladin","كالادين"], points: 2, diff: "🟡 متوسط" },
  { q: "ما المصطلح الياباني للرواية التي تحكي عن انتقال شخص إلى عالم آخر؟", a: ["isekai","إيسيكاي","اسيكاي"], points: 2, diff: "🟡 متوسط" },

  // صعبة (3 نقاط)
  { q: "في رواية Foundation لإسحاق أسيموف، ما اسم علم التنبؤ بالمستقبل الذي طوّره هاري سيلدون؟", a: ["psychohistory","السيكوتاريخ","علم النفس التاريخي"], points: 3, diff: "🔴 صعب" },
  { q: "في Mistborn لبراندون ساندرسون، ما اسم النظام السحري الذي يعتمد على ابتلاع المعادن؟", a: ["allomancy","الومانسي"], points: 3, diff: "🔴 صعب" },
  { q: "من هو مؤلف سلسلة Coiling Dragon الصينية؟", a: ["i eat tomatoes","آي ييت توماتوز","томатос"], points: 3, diff: "🔴 صعب" },
  { q: "في رواية The Stormlight Archive، ما اسم الكائنات العملاقة التي يقاتلها أبطال الرواية؟", a: ["chasmfiends","شاسم فيندز","الوحوش الضخمة"], points: 3, diff: "🔴 صعب" },
  { q: "ما اسم مؤلف سلسلة Renegade Immortal الصينية؟", a: ["er gen","إر جن","ارجن"], points: 3, diff: "🔴 صعب" },
  { q: "في هاري بوتر، ما هو الاسم الكامل للبروفيسور ماكغونيغال؟", a: ["minerva mcgonagall","minerva","مينيرفا"], points: 3, diff: "🔴 صعب" },
  { q: "في Mushoku Tensei، ما اسم المعلم الذي يدرّب رودس على السيف؟", a: ["ghislaine","غيسلين","gislaine"], points: 3, diff: "🔴 صعب" },
  { q: "كم عدد الكتب في سلسلة The Stormlight Archive المخطط لها؟", a: ["10","عشرة","ten"], points: 3, diff: "🔴 صعب" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الشخصيات العشوائية
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CHARACTER_TRAITS = {
  personality: ["شجاع","ذكي","متهور","هادئ","غامض","ودود","متشكك","مخلص","طموح","متمرد","حكيم","ساخر"],
  role:        ["ساحر","محارب","لص","شفاء","رامي","راهب","جاسوس","قائد","تاجر","عالم"],
  flaw:        ["متكبر","خائف من الخسارة","لا يثق بأحد","مدمن على السلطة","يكذب كثيراً","يهرب من مسؤولياته"],
  goal:        ["الانتقام","حماية من يحب","اكتشاف الحقيقة","تحقيق الشهرة","إنقاذ العالم","إيجاد الهوية","الثروة"],
  background:  ["يتيم نشأ في الشوارع","أمير فقد عرشه","محارب سابق","عالم مجنون","ابن التاجر الفقير","جاسوس متقاعد"],
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// الأوامر
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = [
  // Book Tracker
  new SlashCommandBuilder().setName('addbook').setDescription('📚 سجّل كتاباً أنهيت قراءته').addStringOption(o => o.setName('title').setDescription('اسم الكتاب').setRequired(true)),
  new SlashCommandBuilder().setName('mybooklist').setDescription('📖 شوف قائمة كتبك'),
  new SlashCommandBuilder().setName('bookstats').setDescription('📊 إحصائيات قراءتك'),
  new SlashCommandBuilder().setName('randombook').setDescription('🎲 كتاب عشوائي للقراءة'),

  // Writing
  new SlashCommandBuilder().setName('sprint').setDescription('⚡ ابدأ سباق كتابة').addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق (5-60)').setRequired(true).setMinValue(5).setMaxValue(60)),
  new SlashCommandBuilder().setName('wc').setDescription('✍️ سجّل كلماتك في السباق').addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('wordcount').setDescription('📝 سجّل كلماتك اليومية').addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('mywords').setDescription('📈 إحصائيات كلماتك'),
  new SlashCommandBuilder().setName('setgoal').setDescription('🎯 هدف الكلمات اليومي').addIntegerOption(o => o.setName('goal').setDescription('الهدف').setRequired(true)),
  new SlashCommandBuilder().setName('writingtip').setDescription('💡 نصيحة كتابة عشوائية'),
  new SlashCommandBuilder().setName('charactergen').setDescription('🎭 اصنع شخصية رواية عشوائية'),

  // Novel Recommender & Info
  new SlashCommandBuilder().setName('recommend').setDescription('🤖 توصيات روايات').addStringOption(o => o.setName('genre').setDescription('النوع').setRequired(true).addChoices(
    { name: '🧙 Fantasy', value: 'fantasy' },{ name: '⚡ Action', value: 'action' },
    { name: '💕 Romance', value: 'romance' },{ name: '🔍 Mystery', value: 'mystery' },
    { name: '🚀 Sci-Fi', value: 'scifi' },  { name: '👻 Horror', value: 'horror' },
    { name: '☁️ Wuxia/Xianxia', value: 'wuxia' },{ name: '🗡️ Isekai', value: 'isekai' },
  )),
  new SlashCommandBuilder().setName('define').setDescription('📖 تعريف مصطلح أدبي').addStringOption(o => o.setName('term').setDescription('المصطلح').setRequired(true)),
  new SlashCommandBuilder().setName('quote').setDescription('💬 اقتباس أدبي عشوائي'),

  // Community
  new SlashCommandBuilder().setName('poll').setDescription('📊 سوّي تصويت سريع').addStringOption(o => o.setName('question').setDescription('سؤال التصويت').setRequired(true)).addStringOption(o => o.setName('option1').setDescription('الخيار الأول').setRequired(true)).addStringOption(o => o.setName('option2').setDescription('الخيار الثاني').setRequired(true)).addStringOption(o => o.setName('option3').setDescription('الخيار الثالث')).addStringOption(o => o.setName('option4').setDescription('الخيار الرابع')),
  new SlashCommandBuilder().setName('serverstats').setDescription('📊 إحصائيات السيرفر'),

  // Trivia (هيلبر وأعلى فقط)
  new SlashCommandBuilder().setName('quiz').setDescription('🎮 ابدأ لعبة أسئلة الروايات').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('pts').setDescription('🏅 شوف نقاطك في Trivia'),
  new SlashCommandBuilder().setName('top').setDescription('🏆 أفضل 10 لاعبين في Trivia'),

  // Admin
  new SlashCommandBuilder().setName('monthlyawards').setDescription('🏆 جوائز الشهر (أدمن)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(c => c.toJSON());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// تشغيل البوت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('clientReady', async () => {
  console.log(`✅ البوت شغّال: ${client.user.tag}`);
  const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
  console.log(`🏠 السيرفر: ${guild.name}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commands });
  console.log('✅ الأوامر سُجّلت!\n');

  // Language Roles
  const langCh = guild.channels.cache.find(c => c.name.includes('language-roles'));
  if (langCh) {
    const msgs = await langCh.messages.fetch({ limit: 5 });
    if (!msgs.find(m => m.author.id === client.user.id)) {
      const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🌍 اختر مجتمعك اللغوي').setDescription([
        '> اختر الرتبة اللغوية للوصول إلى قنوات المجتمع الخاص!','',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🇬🇧 **English** — Western Novels • Fantasy • Romance',
        '🇨🇳 **Chinese** — Wuxia • Xianxia • Manhua',
        '🇯🇵 **Japanese** — Light Novel • Isekai • Manga',
        '🇰🇷 **Korean** — Manhwa • Web Novel',
        '🇸🇦 **Arabic** — روايات عربية • أدب',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '✅ يمكنك اختيار **أكثر من رتبة** | ❌ اضغط مرة ثانية **لإلغاء**',
      ].join('\n')).setFooter({ text: `${SERVER_NAME} • Language Communities` });
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('lang_cn').setLabel('🇨🇳 Chinese').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lang_jp').setLabel('🇯🇵 Japanese').setStyle(ButtonStyle.Success),
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_kr').setLabel('🇰🇷 Korean').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_ar').setLabel('🇸🇦 Arabic').setStyle(ButtonStyle.Danger),
      );
      await langCh.send({ embeds: [embed], components: [row1, row2] });
    }
  }

  // شرح البوت في server-guide
  const guideCh = guild.channels.cache.find(c => c.name.includes('server-guide'));
  if (guideCh) {
    const msgs = await guideCh.messages.fetch({ limit: 20 });
    if (!msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('ميزات البوت'))) {
      await new Promise(r => setTimeout(r, 2000));
      const guideEmbed = new EmbedBuilder().setColor(0x5865F2).setTitle('🤖 ميزات البوت الحصرية').setDescription(`جميع أوامر ${SERVER_NAME} Bot:`).addFields(
        { name: '📚 Book Tracker', value: '`/addbook` `/mybooklist` `/bookstats` `/randombook`', inline: false },
        { name: '⚡ Writing Sprint', value: '`/sprint [دقائق]` `/wc [كلمات]`', inline: false },
        { name: '📝 Word Count', value: '`/wordcount` `/mywords` `/setgoal`', inline: false },
        { name: '💡 للكتّاب', value: '`/writingtip` `/charactergen`', inline: false },
        { name: '🤖 توصيات', value: '`/recommend [نوع]`', inline: false },
        { name: '📖 معلومات', value: '`/define [مصطلح]` `/quote` `/randombook`', inline: false },
        { name: '📊 مجتمع', value: '`/poll` `/serverstats`', inline: false },
        { name: '🎮 Trivia (هيلبر+)', value: '`/quiz` — أسئلة روايات تنافسية مع نقاط', inline: false },
        { name: '🏅 نقاط Trivia', value: '`/pts` `/top`', inline: false },
        { name: '🏆 جوائز (أدمن)', value: '`/monthlyawards`', inline: false },
      ).setFooter({ text: `${SERVER_NAME} Bot • Slash Commands` });
      await guideCh.send({ embeds: [guideEmbed] });
    }
  }

  // Daily Quote كل يوم 9 صباحاً
  const sendDailyQuote = async () => {
    const g = client.guilds.cache.find(x => x.name === GUILD_NAME);
    if (!g) return;
    const ch = g.channels.cache.find(c => c.name.includes('qotd'));
    if (!ch) return;
    const q = getRandom(QUOTES);
    await ch.send({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس اليوم').setDescription(`*"${q.text}"*`).addFields({ name: '✍️', value: `**${q.author}**` }).setFooter({ text: `${SERVER_NAME} • Daily Quote` }).setTimestamp()] });
  };
  const now = new Date(); const next9 = new Date(); next9.setHours(9,0,0,0);
  if (now >= next9) next9.setDate(next9.getDate()+1);
  setTimeout(() => { sendDailyQuote(); setInterval(sendDailyQuote, 86400000); }, next9 - now);

  console.log('🔄 البوت شغّال وجاهز!');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة التفاعلات
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('interactionCreate', async (interaction) => {

  // ── Language Role Buttons ──
  if (interaction.isButton()) {
    const roleMap = {
      'lang_en': '🇬🇧 English Novel Reader',
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

  // ── /addbook ──
  if (commandName === 'addbook') {
    const title = interaction.options.getString('title');
    if (!db.books[uid]) db.books[uid] = [];
    db.books[uid].push({ title, date: new Date().toLocaleDateString('ar-SA') });
    if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0 };
    db.awards[uid].reads++;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('📚 تم تسجيل الكتاب!').addFields({ name: '📖', value: title, inline: true },{ name: '📊 إجمالي', value: `${db.books[uid].length} كتاب`, inline: true })], ephemeral: true });
  }

  // ── /mybooklist ──
  if (commandName === 'mybooklist') {
    const books = db.books[uid];
    if (!books?.length) return interaction.reply({ content: '📚 ما سجّلت كتاباً بعد! استخدم `/addbook`', ephemeral: true });
    const list = books.map((b,i) => `${i+1}. **${b.title}** — ${b.date}`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📚 كتب ${user.displayName}`).setDescription(list.slice(0,2000)).setFooter({ text: `إجمالي: ${books.length} كتاب` })], ephemeral: true });
  }

  // ── /bookstats ──
  if (commandName === 'bookstats') {
    const books = db.books[uid] || [];
    const thisMonth = books.filter(b => { const d = new Date(); return new Date().getMonth() === d.getMonth(); });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle(`📊 إحصائيات ${user.displayName}`).addFields({ name: '📚 الإجمالي', value: `${books.length}`, inline: true },{ name: '📅 هذا الشهر', value: `${thisMonth.length}`, inline: true },{ name: '🏆', value: books.length>=20?'🌌 Legend':books.length>=10?'📓 Reader V':books.length>=5?'📕 Reader IV':'📗 Reader I', inline: true })], ephemeral: true });
  }

  // ── /randombook ──
  if (commandName === 'randombook') {
    const book = getRandom(RANDOM_BOOKS);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1ABC9C).setTitle('🎲 كتاب عشوائي لك!').addFields({ name: '📖 الكتاب', value: book.title, inline: true },{ name: '✍️ المؤلف', value: book.author, inline: true },{ name: '🏷️ النوع', value: book.genre, inline: true }).setFooter({ text: 'جرّب قراءته! قد يعجبك 😊' })] });
  }

  // ── /sprint ──
  if (commandName === 'sprint') {
    const mins = interaction.options.getInteger('minutes');
    const chId = interaction.channelId;
    if (db.sprints[chId]?.active) return interaction.reply({ content: '⚡ في سباق شغّال! سجّل كلماتك بـ `/wc`', ephemeral: true });
    const endTime = Date.now() + mins * 60000;
    db.sprints[chId] = { active: true, endTime, participants: {} };
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setTitle('⚡ سباق الكتابة بدأ!').setDescription(`**المدة:** ${mins} دقيقة\n**ينتهي:** <t:${Math.floor(endTime/1000)}:R>\n\nاكتب وسجّل كلماتك بـ \`/wc\``).setFooter({ text: `بدأه: ${user.displayName}` })] });
    setTimeout(async () => {
      db.sprints[chId].active = false;
      const parts = Object.entries(db.sprints[chId].participants).sort((a,b)=>b[1]-a[1]);
      if (!parts.length) { await interaction.channel.send('⏰ انتهى السباق! ما سجّل أحد.'); return; }
      const podium = parts.slice(0,3).map(([id,w],i)=>`${'🥇🥈🥉'[i]} <@${id}> — **${w} كلمة**`).join('\n');
      await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏁 النتائج!').setDescription(podium)] });
      delete db.sprints[chId];
    }, mins * 60000);
    return;
  }

  // ── /wc ──
  if (commandName === 'wc') {
    const words = interaction.options.getInteger('words');
    const chId  = interaction.channelId;
    if (!db.sprints[chId]?.active) return interaction.reply({ content: '❌ ما في سباق! استخدم `/sprint`', ephemeral: true });
    db.sprints[chId].participants[uid] = (db.sprints[chId].participants[uid]||0) + words;
    if (!db.awards[uid]) db.awards[uid] = { reads:0, words:0 };
    db.awards[uid].words += words;
    return interaction.reply({ content: `✅ **${words} كلمة** لـ ${user.displayName}! إجمالي: **${db.sprints[chId].participants[uid]}**` });
  }

  // ── /wordcount ──
  if (commandName === 'wordcount') {
    const words = interaction.options.getInteger('words');
    if (!db.wordCount[uid]) db.wordCount[uid] = { today:0, total:0, goal:1000 };
    db.wordCount[uid].today += words; db.wordCount[uid].total += words;
    if (!db.awards[uid]) db.awards[uid] = { reads:0, words:0 };
    db.awards[uid].words += words;
    const { today, total, goal } = db.wordCount[uid];
    const pct = Math.min(Math.round(today/goal*100), 100);
    const bar = '█'.repeat(Math.floor(pct/10)) + '░'.repeat(10-Math.floor(pct/10));
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(pct>=100?0x57F287:0x5865F2).setTitle('📝 كلماتك').addFields({ name: '✍️ اليوم', value: `${today.toLocaleString()}`, inline:true },{ name: '🎯 الهدف', value: `${goal.toLocaleString()}`, inline:true },{ name: '📊 الإجمالي', value: `${total.toLocaleString()}`, inline:true },{ name: `${pct}%`, value: `\`${bar}\``, inline:false }).setDescription(pct>=100?'🎉 وصلت هدفك!':'')], ephemeral: true });
  }

  // ── /mywords ──
  if (commandName === 'mywords') {
    const wc = db.wordCount[uid] || { today:0, total:0, goal:1000 };
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle(`📈 ${user.displayName}`).addFields({ name: '📅 اليوم', value: `${wc.today.toLocaleString()}`, inline:true },{ name: '🎯 الهدف', value: `${wc.goal.toLocaleString()}`, inline:true },{ name: '📚 الكلي', value: `${wc.total.toLocaleString()}`, inline:true })], ephemeral: true });
  }

  // ── /setgoal ──
  if (commandName === 'setgoal') {
    const goal = interaction.options.getInteger('goal');
    if (!db.wordCount[uid]) db.wordCount[uid] = { today:0, total:0, goal:1000 };
    db.wordCount[uid].goal = goal;
    return interaction.reply({ content: `🎯 هدفك اليومي: **${goal.toLocaleString()} كلمة**`, ephemeral: true });
  }

  // ── /writingtip ──
  if (commandName === 'writingtip') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle('💡 نصيحة كتابة').setDescription(getRandom(WRITING_TIPS)).setFooter({ text: `${SERVER_NAME} • Writing Tips` })] });
  }

  // ── /charactergen ──
  if (commandName === 'charactergen') {
    const c = CHARACTER_TRAITS;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('🎭 شخصية عشوائية').addFields(
      { name: '⚔️ الدور', value: getRandom(c.role), inline: true },
      { name: '🧠 الشخصية', value: getRandom(c.personality), inline: true },
      { name: '💔 العيب', value: getRandom(c.flaw), inline: true },
      { name: '🎯 الهدف', value: getRandom(c.goal), inline: true },
      { name: '📜 الخلفية', value: getRandom(c.background), inline: false },
    ).setFooter({ text: 'استخدمها في روايتك القادمة! ✨' })] });
  }

  // ── /recommend ──
  if (commandName === 'recommend') {
    const genre = interaction.options.getString('genre');
    const labels = { fantasy:'🧙 Fantasy', action:'⚡ Action', romance:'💕 Romance', mystery:'🔍 Mystery', scifi:'🚀 Sci-Fi', horror:'👻 Horror', wuxia:'☁️ Wuxia', isekai:'🗡️ Isekai' };
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1ABC9C).setTitle(`${labels[genre]} — توصيات`).setDescription(NOVEL_RECS[genre].join('\n\n')).setFooter({ text: `${SERVER_NAME} • Novel Recommender` })] });
  }

  // ── /define ──
  if (commandName === 'define') {
    const term = interaction.options.getString('term').toLowerCase();
    const def  = LITERARY_TERMS[term];
    if (!def) return interaction.reply({ content: `❌ ما لقيت تعريف لـ "${term}"\nالمصطلحات المتاحة: ${Object.keys(LITERARY_TERMS).join(', ')}`, ephemeral: true });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle(`📖 ${term}`).setDescription(def).setFooter({ text: `${SERVER_NAME} • Literary Dictionary` })] });
  }

  // ── /quote ──
  if (commandName === 'quote') {
    const q = getRandom(QUOTES);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس').setDescription(`*"${q.text}"*`).addFields({ name: '✍️', value: `**${q.author}**` })] });
  }

  // ── /poll ──
  if (commandName === 'poll') {
    const q  = interaction.options.getString('question');
    const o1 = interaction.options.getString('option1');
    const o2 = interaction.options.getString('option2');
    const o3 = interaction.options.getString('option3');
    const o4 = interaction.options.getString('option4');
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣'];
    const opts = [o1,o2,o3,o4].filter(Boolean);
    const desc = opts.map((o,i) => `${emojis[i]} ${o}`).join('\n');
    const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${q}`).setDescription(desc).setFooter({ text: `بواسطة ${user.displayName}` })], fetchReply: true });
    for (let i = 0; i < opts.length; i++) await msg.react(emojis[i]);
  }

  // ── /serverstats ──
  if (commandName === 'serverstats') {
    const g = interaction.guild;
    const bots   = g.members.cache.filter(m=>m.user.bot).size;
    const humans = g.memberCount - bots;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL()).addFields({ name:'👥 الأعضاء', value:`${humans}`, inline:true },{ name:'🤖 بوتات', value:`${bots}`, inline:true },{ name:'📁 قنوات', value:`${g.channels.cache.size}`, inline:true },{ name:'🎭 رتب', value:`${g.roles.cache.size}`, inline:true },{ name:'📅 تأسس', value:`<t:${Math.floor(g.createdTimestamp/1000)}:D>`, inline:true }).setTimestamp()] });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // /trivia — لعبة الأسئلة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (commandName === 'quiz') {
    if (db.activeTriviaGame) {
      return interaction.reply({ content: '⚠️ في لعبة أسئلة شغّالة الحين! انتهي منها أول.', ephemeral: true });
    }

    const q = getRandom(TRIVIA_QUESTIONS);
    db.activeTriviaGame = {
      question: q.q,
      answers: q.a,
      points: q.points,
      diff: q.diff,
      channelId: interaction.channelId,
      answered: false,
    };

    const embed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('🎮 سؤال Trivia!')
      .setDescription(`**${q.q}**`)
      .addFields(
        { name: '⭐ النقاط', value: `${q.points} نقطة`, inline: true },
        { name: '🎯 الصعوبة', value: q.diff, inline: true },
      )
      .setFooter({ text: 'اكتب إجابتك في الدردشة! عندك 30 ثانية' });

    await interaction.reply({ embeds: [embed] });

    // إلغاء السؤال بعد 30 ثانية
    db.activeTriviaGame.timeout = setTimeout(async () => {
      if (db.activeTriviaGame?.answered === false) {
        await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('⏰ انتهى الوقت!').setDescription(`الإجابة الصحيحة: **${q.a[0]}**`)] });
        db.activeTriviaGame = null;
      }
    }, 30000);
    return;
  }

  // ── /mypoints ──
  if (commandName === 'pts') {
    const pts = db.trivia[uid] || { points: 0, correct: 0, wrong: 0 };
    const allSorted = Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points);
    const rank = allSorted.findIndex(([id])=>id===uid) + 1;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle(`🏅 نقاط ${user.displayName}`).addFields(
      { name: '⭐ إجمالي النقاط', value: `${pts.points}`, inline: true },
      { name: '✅ إجابات صحيحة', value: `${pts.correct}`, inline: true },
      { name: '🏆 ترتيبك', value: rank > 0 ? `توب ${rank}` : 'غير مصنّف', inline: true },
    )], ephemeral: true });
  }

  // ── /trivialeaderboard ──
  if (commandName === 'top') {
    const sorted = Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points).slice(0,10);
    if (!sorted.length) return interaction.reply({ content: '❌ ما في بيانات بعد! العب `/quiz` أول.', ephemeral: true });
    const medals = ['🥇','🥈','🥉'];
    const list = sorted.map(([id, data], i) =>
      `${medals[i] || `${i+1}.`} <@${id}> — **${data.points} نقطة** (${data.correct} صح)`
    ).join('\n');
    const myRank = Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points).findIndex(([id])=>id===uid)+1;
    const myPts  = db.trivia[uid]?.points || 0;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 أفضل 10 لاعبين').setDescription(list).addFields({ name: '━━━━━━━━━━━━', value: `أنت: توب **${myRank || '?'}** | نقاطك: **${myPts}**`, inline: false }).setFooter({ text: `${SERVER_NAME} • Trivia Leaderboard` })] });
  }

  // ── /monthlyawards ──
  if (commandName === 'monthlyawards') {
    await interaction.deferReply();
    if (!Object.keys(db.awards).length) return interaction.editReply({ content: '❌ ما في بيانات.' });
    const topReader = Object.entries(db.awards).sort((a,b)=>b[1].reads-a[1].reads)[0];
    const topWriter = Object.entries(db.awards).sort((a,b)=>b[1].words-a[1].words)[0];
    const month = new Date().toLocaleDateString('ar-SA',{month:'long',year:'numeric'});
    const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 جوائز ${month}`).setDescription('تهانينا! 🎉').addFields(
      { name: '📚 أفضل قارئ', value: topReader ? `<@${topReader[0]}> — ${topReader[1].reads} كتاب` : 'لا يوجد', inline: false },
      { name: '✍️ أفضل كاتب', value: topWriter ? `<@${topWriter[0]}> — ${topWriter[1].words.toLocaleString()} كلمة` : 'لا يوجد', inline: false },
    ).setTimestamp();
    const annCh = guild.channels.cache.find(c=>c.name.includes('announcements'));
    if (annCh) await annCh.send({ embeds: [embed] });
    Object.keys(db.awards).forEach(id => { db.awards[id] = { reads:0, words:0 }; });
    return interaction.editReply({ content: '✅ تم الإعلان وتصفير البيانات!' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// معالجة إجابات Trivia من الدردشة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!db.activeTriviaGame) return;
  if (message.channelId !== db.activeTriviaGame.channelId) return;
  if (db.activeTriviaGame.answered) return;

  const userAnswer = message.content.trim().toLowerCase();
  const isCorrect  = db.activeTriviaGame.answers.some(a => userAnswer.includes(a.toLowerCase()));

  if (isCorrect) {
    db.activeTriviaGame.answered = true;
    clearTimeout(db.activeTriviaGame.timeout);

    const pts = db.activeTriviaGame.points;
    const uid = message.author.id;
    if (!db.trivia[uid]) db.trivia[uid] = { points:0, correct:0, wrong:0 };
    db.trivia[uid].points  += pts;
    db.trivia[uid].correct += 1;

    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🎉 إجابة صحيحة!').setDescription(`${message.author} حصل على **${pts} نقطة**!\nإجمالي نقاطه: **${db.trivia[uid].points}**`).setFooter({ text: 'استخدم /mypoints لترى نقاطك' })] });
    db.activeTriviaGame = null;
  }
});

client.login(TOKEN);
