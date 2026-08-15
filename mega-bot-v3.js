// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// mega-bot-v3.js — البوت الرئيسي (الأوامر + التريفيا + السباقات)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits
} = require('discord.js');
const { db, addModLog } = require('./shared-db');

const GUILD_NAME  = process.env.GUILD_NAME  || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';

const getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// البيانات الثابتة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QUOTES = [
  { text: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { text: "It is our choices that show what we truly are.", author: "J.K. Rowling" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "A book is a dream that you hold in your hands.", author: "Neil Gaiman" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
  { text: "If you only read the books everyone else is reading, you can only think what everyone else is thinking.", author: "Haruki Murakami" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "One must always be careful of books, for words have the power to change us.", author: "Cassandra Clare" },
  { text: "Until I feared I would lose it, I never loved to read.", author: "Harper Lee" },
];

const WRITING_TIPS = [
  "✍️ اكتب كل يوم ولو 100 كلمة — الاستمرارية أهم من الكمية",
  "📖 اقرأ في نفس النوع الذي تكتبه — الأفضل يتعلم من الأفضل",
  "🎯 حدد هدفك قبل الكتابة — من أين تبدأ ومن أين تنتهي",
  "🔄 المسودة الأولى لا تحتاج أن تكون مثالية — فقط أكملها",
  "👥 اطلب رأي قراء تجريبيين قبل النشر",
  "🌍 ابنِ عالمك أولاً ثم اكتب قصتك",
  "💬 الحوار يكشف الشخصية لا فقط ينقل المعلومات",
  "⚡ ابدأ من أكثر لحظة توتراً في قصتك",
  "🎭 كل شخصية تحتاج هدفاً وخوفاً وعيباً",
  "📝 الفصل الأول مهمته دفع القارئ لقراءة الفصل الثاني",
];

const NOVEL_RECS = {
  fantasy: ["🧙 **The Name of the Wind** — Patrick Rothfuss", "🗡️ **The Way of Kings** — Brandon Sanderson", "🌍 **The Hobbit** — J.R.R. Tolkien", "⚔️ **A Game of Thrones** — George R.R. Martin", "🔮 **The Final Empire** — Brandon Sanderson"],
  action:  ["⚡ **Solo Leveling** — Chugong", "🥊 **The Beginning After the End** — TurtleMe", "🗡️ **Overlord** — Kugane Maruyama", "🔥 **Re:Zero** — Tappei Nagatsuki", "💪 **Omniscient Reader** — sing shong"],
  romance: ["💕 **Pride and Prejudice** — Jane Austen", "🌹 **Outlander** — Diana Gabaldon", "💝 **The Notebook** — Nicholas Sparks", "🌸 **Horimiya** — HERO", "💌 **Anna and the French Kiss** — Stephanie Perkins"],
  mystery: ["🔍 **And Then There Were None** — Agatha Christie", "🕵️ **The Girl with the Dragon Tattoo** — Stieg Larsson", "🗝️ **Gone Girl** — Gillian Flynn", "🔎 **The Da Vinci Code** — Dan Brown", "🌃 **Big Little Lies** — Liane Moriarty"],
  scifi:   ["🚀 **Dune** — Frank Herbert", "🤖 **Foundation** — Isaac Asimov", "🌌 **The Hitchhiker\'s Guide** — Douglas Adams", "👾 **Ender\'s Game** — Orson Scott Card", "🛸 **The Martian** — Andy Weir"],
  horror:  ["👻 **It** — Stephen King", "🏚️ **The Haunting of Hill House** — Shirley Jackson", "🧟 **World War Z** — Max Brooks", "🩸 **Dracula** — Bram Stoker", "😱 **The Shining** — Stephen King"],
  wuxia:   ["☁️ **Renegade Immortal** — Er Gen", "⚡ **A Will Eternal** — Er Gen", "🌊 **I Shall Seal the Heavens** — Er Gen", "🔥 **Coiling Dragon** — I Eat Tomatoes", "🌙 **Against the Gods** — Mars Gravity"],
  isekai:  ["🗡️ **Sword Art Online** — Reki Kawahara", "🔮 **That Time I Got Reincarnated as a Slime** — Fuse", "🌸 **Mushoku Tensei** — Rifujin na Magonote", "⚔️ **Overlord** — Kugane Maruyama", "🎮 **Log Horizon** — Mamare Touno"],
};

const RANDOM_BOOKS = [
  { title: "The Alchemist", author: "Paulo Coelho", genre: "Philosophy" },
  { title: "1984", author: "George Orwell", genre: "Dystopia" },
  { title: "The Little Prince", author: "Antoine de Saint-Exupéry", genre: "Classic" },
  { title: "Brave New World", author: "Aldous Huxley", genre: "Sci-Fi" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Drama" },
  { title: "Lord of the Flies", author: "William Golding", genre: "Dystopia" },
  { title: "Fahrenheit 451", author: "Ray Bradbury", genre: "Sci-Fi" },
  { title: "The Road", author: "Cormac McCarthy", genre: "Post-Apocalyptic" },
  { title: "Of Mice and Men", author: "John Steinbeck", genre: "Drama" },
];

const LITERARY_TERMS = {
  protagonist: "البطل الرئيسي في القصة — الشخصية التي تتمحور حولها الأحداث",
  antagonist: "الخصم أو قوة المعارضة التي تواجه البطل",
  foreshadowing: "التلميح — إشارات مبكرة تلمح لأحداث قادمة",
  cliffhanger: "نهاية مشوّقة تترك القارئ في تعليق وترقّب",
  "plot twist": "منعطف مفاجئ يغيّر مجرى القصة",
  worldbuilding: "بناء العالم — عملية إنشاء الكون الخيالي للرواية",
  pov: "وجهة النظر — الزاوية التي تُروى منها القصة",
  arc: "قوس الشخصية — تطورها عبر مسار القصة",
  trope: "عنصر سردي متكرر في نوع أدبي معين",
  manhwa: "الكوميكس الكوري — يُقرأ من اليسار لليمين",
  manhua: "الكوميكس الصيني",
  "light novel": "رواية خفيفة يابانية مصحوبة بصور أنيمي",
  wuxia: "نوع صيني يدور حول فنون القتال والبطولة",
  xianxia: "نوع صيني يدور حول الزهد وتحقيق الخلود",
  isekai: "نوع ياباني — انتقال شخص إلى عالم آخر",
};

const CHARACTER_TRAITS = {
  personality: ["شجاع", "ذكي", "متهور", "هادئ", "غامض", "ودود", "مخلص", "طموح", "متمرد", "حكيم", "ساخر"],
  role: ["ساحر", "محارب", "لص", "شفاء", "رامي", "جاسوس", "قائد", "تاجر", "عالم"],
  flaw: ["متكبر", "خائف من الخسارة", "لا يثق بأحد", "مدمن على السلطة", "يكذب كثيراً"],
  goal: ["الانتقام", "حماية من يحب", "اكتشاف الحقيقة", "تحقيق الشهرة", "إنقاذ العالم", "إيجاد الهوية"],
  background: ["يتيم نشأ في الشوارع", "أمير فقد عرشه", "محارب سابق", "عالم مجنون", "ابن التاجر الفقير"],
};

const BOOK_FACTS = [
  "📚 أكثر كتاب مبيعاً في التاريخ هو الكتاب المقدس بأكثر من 5 مليار نسخة",
  "📖 شكسبير أضاف أكثر من 1700 كلمة إلى اللغة الإنجليزية",
  "🔥 كتاب Don Quixote يُعتبر أول رواية حديثة في التاريخ",
  "⚡ رواية A Tale of Two Cities لديكنز هي أكثر الروايات مبيعاً بـ 200 مليون نسخة",
  "🌍 هاري بوتر تُرجم لأكثر من 80 لغة حول العالم",
  "📝 جي كي رولينج كانت تكتب على مناديل في المقاهي قبل نجاح هاري بوتر",
  "🎭 رواية 1984 لجورج أورويل كُتبت وهو مريض جداً وتوفي بعد نشرها بأشهر",
  "🌟 رواية Dune استغرق فرانك هيربرت 6 سنوات ليكتبها",
  "💡 كلمة Robot وردت لأول مرة في مسرحية كتبها كاريل تشابيك عام 1920",
  "📚 المكتبة الوطنية في باريس تمتلك أكثر من 14 مليون كتاب",
];

const TRIVIA = [
  { q: "من كتب رواية هاري بوتر؟", a: ["j.k. rowling", "rowling", "جيه كي رولينج", "رولينج"], pts: 1, diff: "🟢 سهل" },
  { q: "من كتب رواية The Hobbit (الهوبيت)؟", a: ["tolkien", "j.r.r tolkien", "تولكين"], pts: 1, diff: "🟢 سهل" },
  { q: "من كتب رواية Dune (الكثيب)؟", a: ["frank herbert", "herbert", "فرانك هيربرت"], pts: 1, diff: "🟢 سهل" },
  { q: "ما اسم مدرسة السحر في هاري بوتر؟", a: ["hogwarts", "هوغوارتس", "هوجوارتس"], pts: 1, diff: "🟢 سهل" },
  { q: "كم عدد أجزاء The Lord of the Rings؟", a: ["3", "ثلاثة", "three"], pts: 1, diff: "🟢 سهل" },
  { q: "من كتب Pride and Prejudice؟", a: ["jane austen", "austen", "جين أوستن"], pts: 1, diff: "🟢 سهل" },
  { q: "في Solo Leveling، ما اسم البطل الرئيسي؟", a: ["sung jinwoo", "jinwoo", "سونغ جين وو", "جين وو"], pts: 2, diff: "🟡 متوسط" },
  { q: "في Overlord، ما اسم الساحر الهيكل العظمي؟", a: ["ainz", "ainz ooal gown", "آينز"], pts: 2, diff: "🟡 متوسط" },
  { q: "في Dune، ما اسم الكوكب الرئيسي؟", a: ["arrakis", "أراكيس", "dune"], pts: 2, diff: "🟡 متوسط" },
  { q: "من كتب The Name of the Wind؟", a: ["patrick rothfuss", "rothfuss", "روثفوس"], pts: 2, diff: "🟡 متوسط" },
  { q: "في The Way of Kings، ما اسم البطل الذي كان عبداً؟", a: ["kaladin", "كالادين"], pts: 2, diff: "🟡 متوسط" },
  { q: "ما المصطلح الياباني لرواية الانتقال لعالم آخر؟", a: ["isekai", "إيسيكاي"], pts: 2, diff: "🟡 متوسط" },
  { q: "في Mistborn، ما اسم النظام السحري المعتمد على المعادن؟", a: ["allomancy", "الومانسي"], pts: 3, diff: "🔴 صعب" },
  { q: "ما اسم مؤلف سلسلة Renegade Immortal؟", a: ["er gen", "إر جن", "ارجن"], pts: 3, diff: "🔴 صعب" },
  { q: "ما الاسم الكامل للبروفيسور ماكغونيغال في هاري بوتر؟", a: ["minerva mcgonagall", "minerva", "مينيرفا"], pts: 3, diff: "🔴 صعب" },
  { q: "كم عدد كتب The Stormlight Archive المخطط لها؟", a: ["10", "عشرة", "ten"], pts: 3, diff: "🔴 صعب" },
  { q: "في Foundation، ما اسم علم التنبؤ بالمستقبل؟", a: ["psychohistory", "السيكوتاريخ"], pts: 3, diff: "🔴 صعب" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// دوال مساعدة
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const handleAutoTimeout = async (member, count, reason) => {
  if (count < 3) return;
  const mins = 15 + ((count - 3) * 5);
  await member.timeout(mins * 60000).catch(() => {});
  try {
    await member.send({ embeds: [new EmbedBuilder()
      .setColor(0xED4245).setTitle('⏰ تايم أوت تلقائي')
      .setDescription(`تلقيت **${count} تحذير**\n**المدة:** ${mins} دقيقة\n**السبب:** ${reason}\n\n> كل تحذير إضافي فوق 3 يضيف 5 دقائق`)
      .setFooter({ text: GUILD_NAME })] });
  } catch {}
};

const notifyAdmins = async (guild, winner, reason, points) => {
  const modCh = guild.channels.cache.find(c =>
    c.name.includes('moderation-logs') || c.name.includes('staff-chat')
  );
  if (!modCh) return;
  await modCh.send({ embeds: [new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🏆 عضو يستحق نقاط!')
    .setDescription(`**${winner.user.tag}** فاز وأثبت استحقاقه للنقاط`)
    .addFields(
      { name: '🎯 السبب', value: reason, inline: true },
      { name: '⭐ النقاط المقترحة', value: `${points} نقطة`, inline: true },
      { name: '💡 لإعطائه النقاط', value: `\`/addpoints @${winner.user.tag} ${points}\``, inline: false },
    )
    .setThumbnail(winner.user.displayAvatarURL())
    .setTimestamp()] });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Slash Commands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = [
  // Book Tracker
  new SlashCommandBuilder().setName('addbook').setDescription('📚 سجّل كتاباً أنهيت قراءته').addStringOption(o => o.setName('title').setDescription('اسم الكتاب').setRequired(true)),
  new SlashCommandBuilder().setName('mybooklist').setDescription('📖 قائمة كتبك'),
  new SlashCommandBuilder().setName('bookstats').setDescription('📊 إحصائيات قراءتك'),
  new SlashCommandBuilder().setName('randombook').setDescription('🎲 كتاب عشوائي للقراءة'),
  new SlashCommandBuilder().setName('review').setDescription('⭐ اكتب مراجعة لكتاب أو رواية')
    .addStringOption(o => o.setName('title').setDescription('اسم الكتاب/الرواية').setRequired(true))
    .addIntegerOption(o => o.setName('rating').setDescription('التقييم من 10').setRequired(true).setMinValue(1).setMaxValue(10))
    .addStringOption(o => o.setName('review').setDescription('مراجعتك').setRequired(true)),

  // Writing
  new SlashCommandBuilder().setName('sprint').setDescription('⚡ ابدأ سباق كتابة').addIntegerOption(o => o.setName('minutes').setDescription('المدة (5-60)').setRequired(true).setMinValue(5).setMaxValue(60)),
  new SlashCommandBuilder().setName('wc').setDescription('✍️ سجّل كلماتك في السباق').addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('wordcount').setDescription('📝 سجّل كلماتك اليومية').addIntegerOption(o => o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('mywords').setDescription('📈 إحصائيات كلماتك'),
  new SlashCommandBuilder().setName('setgoal').setDescription('🎯 هدف كلمات يومي').addIntegerOption(o => o.setName('goal').setDescription('الهدف').setRequired(true)),
  new SlashCommandBuilder().setName('writingtip').setDescription('💡 نصيحة كتابة عشوائية'),
  new SlashCommandBuilder().setName('charactergen').setDescription('🎭 شخصية رواية عشوائية'),

  // Info & Fun
  new SlashCommandBuilder().setName('recommend').setDescription('🤖 توصيات روايات').addStringOption(o => o.setName('genre').setDescription('النوع').setRequired(true).addChoices(
    { name: '🧙 Fantasy', value: 'fantasy' }, { name: '⚡ Action', value: 'action' }, { name: '💕 Romance', value: 'romance' },
    { name: '🔍 Mystery', value: 'mystery' }, { name: '🚀 Sci-Fi', value: 'scifi' }, { name: '👻 Horror', value: 'horror' },
    { name: '☁️ Wuxia', value: 'wuxia' }, { name: '🗡️ Isekai', value: 'isekai' },
  )),
  new SlashCommandBuilder().setName('define').setDescription('📖 تعريف مصطلح أدبي').addStringOption(o => o.setName('term').setDescription('المصطلح').setRequired(true)),
  new SlashCommandBuilder().setName('quote').setDescription('💬 اقتباس أدبي عشوائي'),
  new SlashCommandBuilder().setName('fact').setDescription('💡 حقيقة عشوائية عن الكتب والأدب'),
  new SlashCommandBuilder().setName('versus').setDescription('⚔️ تصويت بين روايتين أو كاتبين')
    .addStringOption(o => o.setName('option1').setDescription('الخيار الأول').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('الخيار الثاني').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('📊 تصويت سريع')
    .addStringOption(o => o.setName('question').setDescription('السؤال').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('خيار 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('خيار 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('خيار 3'))
    .addStringOption(o => o.setName('option4').setDescription('خيار 4')),
  new SlashCommandBuilder().setName('serverstats').setDescription('📊 إحصائيات السيرفر'),

  // Points System
  new SlashCommandBuilder().setName('quiz').setDescription('🎮 أسئلة الروايات التنافسية').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('pts').setDescription('🏅 نقاطك التنافسية'),
  new SlashCommandBuilder().setName('top').setDescription('🏆 توب 10 لاعبين'),
  new SlashCommandBuilder().setName('addpoints').setDescription('➕ أضف نقاط لعضو (أدمن)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('عدد النقاط').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(true)),
  new SlashCommandBuilder().setName('removepoints').setDescription('➖ اسحب نقاط من عضو (أدمن)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('عدد النقاط').setRequired(true).setMinValue(1))
    .addStringOption(o => o.setName('reason').setDescription('السبب')),
  new SlashCommandBuilder().setName('setpoints').setDescription('🔧 اضبط نقاط عضو بدقة (أدمن)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('الرصيد الجديد').setRequired(true).setMinValue(0)),

  // Challenges
  new SlashCommandBuilder().setName('readingchallenge').setDescription('📚 سجّل في تحدي القراءة الشهري'),
  new SlashCommandBuilder().setName('bookclub').setDescription('📖 شارك في نادي الكتاب الأسبوعي'),
  new SlashCommandBuilder().setName('authorprofile').setDescription('✍️ سجّل بروفايل روايتك')
    .addStringOption(o => o.setName('title').setDescription('اسم الرواية').setRequired(true))
    .addStringOption(o => o.setName('genre').setDescription('النوع').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('وصف قصير').setRequired(true))
    .addStringOption(o => o.setName('status').setDescription('الحالة').setRequired(true).addChoices(
      { name: '🟢 مستمرة', value: 'ongoing' }, { name: '✅ مكتملة', value: 'completed' }, { name: '⏸️ متوقفة', value: 'hiatus' }
    )),

  // Moderation
  new SlashCommandBuilder().setName('purge').setDescription('🗑️ احذف رسائل').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('عدد الرسائل (2-100)').setRequired(true).setMinValue(2).setMaxValue(100)),
  new SlashCommandBuilder().setName('announce').setDescription('📢 أرسل إعلاناً منسقاً').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(o => o.setName('title').setDescription('عنوان الإعلان').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('محتوى الإعلان').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('اللون').addChoices(
      { name: '🟡 ذهبي', value: 'gold' }, { name: '🔵 أزرق', value: 'blue' }, { name: '🟢 أخضر', value: 'green' }, { name: '🔴 أحمر', value: 'red' }
    )),

  // Warnings
  new SlashCommandBuilder().setName('warn').setDescription('⚠️ تحذير لعضو').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(true)),
  new SlashCommandBuilder().setName('warnings').setDescription('📋 تحذيرات عضو')
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)),
  new SlashCommandBuilder().setName('removewarn').setDescription('🗑️ حذف تحذير').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('index').setDescription('رقم التحذير').setRequired(true).setMinValue(1)),

  // Monthly Awards
  new SlashCommandBuilder().setName('monthlyawards').setDescription('🏆 جوائز الشهر').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(c => c.toJSON());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Setup function — called from index.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function setupMegaBot(client) {
  const TOKEN = process.env.TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;

  // ── Ready: register commands + daily quote ──
  client.once('ready', async () => {
    console.log(`✅ Mega Bot v3: ${client.user.tag}`);
    const guild = client.guilds.cache.find(g => g.name === GUILD_NAME);
    if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
    console.log(`🏠 ${guild.name}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commands });
    console.log('✅ الأوامر سُجّلت!');

    // Language Roles message
    const langCh = guild.channels.cache.find(c => c.name.includes('language-roles'));
    if (langCh) {
      const msgs = await langCh.messages.fetch({ limit: 5 });
      if (!msgs.find(m => m.author.id === client.user.id)) {
        const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🌍 اختر مجتمعك اللغوي').setDescription([
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '🇬🇧 **English** — Western Novels • Fantasy • Romance',
          '🇨🇳 **Chinese** — Wuxia • Xianxia • Manhua',
          '🇯🇵 **Japanese** — Light Novel • Isekai • Manga',
          '🇰🇷 **Korean** — Manhwa • Web Novel',
          '🇸🇦 **Arabic** — روايات عربية • أدب',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '✅ يمكنك اختيار **أكثر من رتبة** | ❌ اضغط مرة ثانية **لإلغاء**',
        ].join('\n')).setFooter({ text: `${SERVER_NAME} • Language Communities` });
        const r1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('lang_cn').setLabel('🇨🇳 Chinese').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('lang_jp').setLabel('🇯🇵 Japanese').setStyle(ButtonStyle.Success),
        );
        const r2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lang_kr').setLabel('🇰🇷 Korean').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('lang_ar').setLabel('🇸🇦 Arabic').setStyle(ButtonStyle.Danger),
        );
        await langCh.send({ embeds: [embed], components: [r1, r2] });
      }
    }

    // Daily Quote at 9 AM
    const sendQ = async () => {
      const g = client.guilds.cache.find(x => x.name === GUILD_NAME);
      const ch = g?.channels.cache.find(c => c.name.includes('qotd'));
      if (!ch) return;
      const q = getRandom(QUOTES);
      await ch.send({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس اليوم').setDescription(`*"${q.text}"*`).addFields({ name: '✍️', value: `**${q.author}**` }).setTimestamp()] });
    };
    const now = new Date(), next = new Date();
    next.setHours(9, 0, 0, 0);
    if (now >= next) next.setDate(next.getDate() + 1);
    setTimeout(() => { sendQ(); setInterval(sendQ, 86400000); }, next - now);
    console.log('🔄 Bot v3 جاهز!');
  });

  // ── Interactions ──
  client.on('interactionCreate', async (interaction) => {
    // Buttons (Language Roles)
    if (interaction.isButton()) {
      const roleMap = {
        lang_en: '🇬🇧 English Novel Reader', lang_cn: '🇨🇳 Chinese Novel Reader',
        lang_jp: '🇯🇵 Japanese Novel Reader', lang_kr: '🇰🇷 Korean Novel Reader', lang_ar: '🇸🇦 Arabic Novel Reader',
      };
      if (roleMap[interaction.customId]) {
        await interaction.deferReply({ ephemeral: true });
        const role = interaction.guild.roles.cache.find(r => r.name === roleMap[interaction.customId]);
        if (!role) return interaction.editReply({ content: '❌ ما لقيت الرتبة!' });
        const has = interaction.member.roles.cache.has(role.id);
        try {
          has ? await interaction.member.roles.remove(role) : await interaction.member.roles.add(role);
          return interaction.editReply({ content: has ? `✅ أُزيلت رتبة **${roleMap[interaction.customId]}**` : `🎉 حصلت على رتبة **${roleMap[interaction.customId]}**! تحقق من القنوات 👀` });
        } catch (e) { return interaction.editReply({ content: `❌ ${e.message}` }); }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, user, guild } = interaction;
    const uid = user.id;

    // ━━━━ Book Tracker ━━━━
    if (commandName === 'addbook') {
      const title = interaction.options.getString('title');
      if (!db.books[uid]) db.books[uid] = [];
      db.books[uid].push({ title, date: new Date().toLocaleDateString('ar-SA') });
      if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0 };
      db.awards[uid].reads++;
      if (!db.trivia[uid]) db.trivia[uid] = { points: 0, correct: 0 };
      db.trivia[uid].points += 2;
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('📚 تم التسجيل! +2 نقطة').addFields({ name: '📖', value: title, inline: true }, { name: '📊 إجمالي', value: `${db.books[uid].length} كتاب`, inline: true }, { name: '⭐ نقاطك', value: `${db.trivia[uid].points}`, inline: true })], ephemeral: true });
    }
    if (commandName === 'mybooklist') {
      const books = db.books[uid];
      if (!books?.length) return interaction.reply({ content: '📚 ما سجّلت كتاباً! استخدم `/addbook`', ephemeral: true });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📚 كتب ${user.displayName}`).setDescription(books.map((b, i) => `${i + 1}. **${b.title}** — ${b.date}`).join('\n').slice(0, 2000)).setFooter({ text: `إجمالي: ${books.length} كتاب` })], ephemeral: true });
    }
    if (commandName === 'bookstats') {
      const books = db.books[uid] || [];
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle(`📊 ${user.displayName}`).addFields({ name: '📚 الإجمالي', value: `${books.length}`, inline: true }, { name: '⭐ نقاطي', value: `${db.trivia[uid]?.points || 0}`, inline: true }, { name: '🏆', value: books.length >= 20 ? '🌌 Legend' : books.length >= 10 ? '📓 V' : books.length >= 5 ? '📕 IV' : '📗 I', inline: true })], ephemeral: true });
    }
    if (commandName === 'randombook') {
      const b = getRandom(RANDOM_BOOKS);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1ABC9C).setTitle('🎲 كتاب عشوائي!').addFields({ name: '📖', value: b.title, inline: true }, { name: '✍️', value: b.author, inline: true }, { name: '🏷️', value: b.genre, inline: true }).setFooter({ text: 'جرّب قراءته! 😊' })] });
    }
    if (commandName === 'review') {
      const title = interaction.options.getString('title');
      const rating = interaction.options.getInteger('rating');
      const review = interaction.options.getString('review');
      const stars = '⭐'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(0, 5 - rating));
      if (!db.trivia[uid]) db.trivia[uid] = { points: 0, correct: 0 };
      db.trivia[uid].points += 3;
      const reviewCh = guild.channels.cache.find(c => c.name.includes('review-center'));
      const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle(`⭐ مراجعة: ${title}`).setDescription(review).addFields({ name: 'التقييم', value: `${stars} ${rating}/10`, inline: true }, { name: 'بواسطة', value: `${user}`, inline: true }).setTimestamp();
      if (reviewCh) await reviewCh.send({ embeds: [embed] });
      await notifyAdmins(guild, interaction.member, `مراجعة: ${title}`, 3);
      return interaction.reply({ content: `✅ نُشرت مراجعتك! حصلت على **+3 نقاط** 🎉`, ephemeral: true });
    }

    // ━━━━ Writing ━━━━
    if (commandName === 'sprint') {
      const mins = interaction.options.getInteger('minutes');
      const chId = interaction.channelId;
      if (db.sprints[chId]?.active) return interaction.reply({ content: '⚡ في سباق شغّال!', ephemeral: true });
      const end = Date.now() + mins * 60000;
      db.sprints[chId] = { active: true, endTime: end, participants: {} };
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE67E22).setTitle('⚡ سباق الكتابة بدأ!').setDescription(`**المدة:** ${mins} دقيقة\n**ينتهي:** \n\nسجّل كلماتك بـ \`/wc\`\n*الفائز يحصل على نقاط إضافية!*`).setFooter({ text: 'النقاط أُضيفت للفائزين!' })] });
      setTimeout(async () => {
        if (!db.sprints[chId]) return;
        db.sprints[chId].active = false;
        const parts = Object.entries(db.sprints[chId].participants).sort((a, b) => b[1] - a[1]);
        if (!parts.length) { await interaction.channel.send('⏰ انتهى السباق! ما سجّل أحد.'); delete db.sprints[chId]; return; }
        const podiumPts = [5, 3, 2];
        for (let i = 0; i < Math.min(parts.length, 3); i++) {
          const [id, w] = parts[i];
          if (!db.trivia[id]) db.trivia[id] = { points: 0, correct: 0 };
          db.trivia[id].points += podiumPts[i] || 0;
        }
        const podium = parts.slice(0, 3).map(([id, w], i) => `${'🥇🥈🥉'[i]} <@${id}> — **${w} كلمة** (+${podiumPts[i]} نقطة)`).join('\n');
        await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏁 نتائج السباق!').setDescription(podium).setFooter({ text: 'النقاط أُضيفت للفائزين!' })] });
        const winner = await guild.members.fetch(parts[0][0]).catch(() => null);
        if (winner) await notifyAdmins(guild, winner, `فاز في سباق الكتابة بـ ${parts[0][1]} كلمة`, 5);
        delete db.sprints[chId];
      }, mins * 60000);
      return;
    }
    if (commandName === 'wc') {
      const words = interaction.options.getInteger('words');
      const chId = interaction.channelId;
      if (!db.sprints[chId]?.active) return interaction.reply({ content: '❌ ما في سباق! استخدم `/sprint`', ephemeral: true });
      db.sprints[chId].participants[uid] = (db.sprints[chId].participants[uid] || 0) + words;
      if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0 };
      db.awards[uid].words += words;
      return interaction.reply({ content: `✅ **${words} كلمة** لـ ${user.displayName}! إجمالي: **${db.sprints[chId].participants[uid]}**` });
    }
    if (commandName === 'wordcount') {
      const words = interaction.options.getInteger('words');
      if (!db.wordCount[uid]) db.wordCount[uid] = { today: 0, total: 0, goal: 1000 };
      db.wordCount[uid].today += words; db.wordCount[uid].total += words;
      if (!db.awards[uid]) db.awards[uid] = { reads: 0, words: 0 };
      db.awards[uid].words += words;
      const { today, total, goal } = db.wordCount[uid];
      const pct = Math.min(Math.round(today / goal * 100), 100);
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      if (pct >= 100) {
        if (!db.trivia[uid]) db.trivia[uid] = { points: 0, correct: 0 };
        db.trivia[uid].points += 3;
      }
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(pct >= 100 ? 0x57F287 : 0x5865F2).setTitle('📝 كلماتك').addFields({ name: '✍️ اليوم', value: `${today.toLocaleString()}`, inline: true }, { name: '🎯 الهدف', value: `${goal.toLocaleString()}`, inline: true }, { name: `${pct}%`, value: `\`\`${bar}\`\``, inline: false }).setDescription(pct >= 100 ? '🎉 وصلت هدفك! +3 نقاط' : '')], ephemeral: true });
    }
    if (commandName === 'mywords') {
      const wc = db.wordCount[uid] || { today: 0, total: 0, goal: 1000 };
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle(`📈 ${user.displayName}`).addFields({ name: '📅 اليوم', value: `${wc.today.toLocaleString()}`, inline: true }, { name: '🎯 الهدف', value: `${wc.goal.toLocaleString()}`, inline: true }, { name: '📚 الكلي', value: `${wc.total.toLocaleString()}`, inline: true })], ephemeral: true });
    }
    if (commandName === 'setgoal') {
      const goal = interaction.options.getInteger('goal');
      if (!db.wordCount[uid]) db.wordCount[uid] = { today: 0, total: 0, goal: 1000 };
      db.wordCount[uid].goal = goal;
      return interaction.reply({ content: `🎯 هدفك اليومي: **${goal.toLocaleString()} كلمة**`, ephemeral: true });
    }
    if (commandName === 'writingtip') return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle('💡 نصيحة كتابة').setDescription(getRandom(WRITING_TIPS)).setFooter({ text: `${SERVER_NAME} • Writing Tips` })] });
    if (commandName === 'charactergen') {
      const c = CHARACTER_TRAITS;
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('🎭 شخصية عشوائية').addFields({ name: '⚔️ الدور', value: getRandom(c.role), inline: true }, { name: '🧠 الشخصية', value: getRandom(c.personality), inline: true }, { name: '💔 العيب', value: getRandom(c.flaw), inline: true }, { name: '🎯 الهدف', value: getRandom(c.goal), inline: true }, { name: '📜 الخلفية', value: getRandom(c.background), inline: false }).setFooter({ text: 'استخدمها في روايتك القادمة! ✨' })] });
    }

    // ━━━━ Info & Fun ━━━━
    if (commandName === 'recommend') {
      const genre = interaction.options.getString('genre');
      const labels = { fantasy: '🧙 Fantasy', action: '⚡ Action', romance: '💕 Romance', mystery: '🔍 Mystery', scifi: '🚀 Sci-Fi', horror: '👻 Horror', wuxia: '☁️ Wuxia', isekai: '🗡️ Isekai' };
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x1ABC9C).setTitle(`${labels[genre]} — توصيات`).setDescription(NOVEL_RECS[genre].join('\n\n')).setFooter({ text: `${SERVER_NAME} • Novel Recommender` })] });
    }
    if (commandName === 'define') {
      const term = interaction.options.getString('term').toLowerCase();
      const def = LITERARY_TERMS[term];
      if (!def) return interaction.reply({ content: `❌ ما لقيت تعريف لـ "${term}"\nالمتاح: ${Object.keys(LITERARY_TERMS).join(', ')}`, ephemeral: true });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3498DB).setTitle(`📖 ${term}`).setDescription(def).setFooter({ text: `${SERVER_NAME} • Literary Dictionary` })] });
    }
    if (commandName === 'quote') {
      const q = getRandom(QUOTES);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس أدبي').setDescription(`*"${q.text}"*`).addFields({ name: '✍️', value: `**${q.author}**` }).setFooter({ text: `${SERVER_NAME} • Literary Quotes` })] });
    }
    if (commandName === 'fact') {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9B59B6).setTitle('💡 هل تعلم؟').setDescription(getRandom(BOOK_FACTS)).setFooter({ text: `${SERVER_NAME} • Book Facts` })] });
    }
    if (commandName === 'versus') {
      const op1 = interaction.options.getString('option1');
      const op2 = interaction.options.getString('option2');
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle('⚔️ المعركة الأدبية!').setDescription(`**${op1}** ضد **${op2}**\n\nصوّت بـ 1️⃣ أو 2️⃣`).addFields({ name: '1️⃣', value: op1, inline: true }, { name: '⚔️', value: 'VS', inline: true }, { name: '2️⃣', value: op2, inline: true }).setFooter({ text: `بواسطة ${user.displayName}` })], fetchReply: true });
      await msg.react('1️⃣'); await msg.react('2️⃣');
      return;
    }
    if (commandName === 'poll') {
      const q = interaction.options.getString('question');
      const opts = [interaction.options.getString('option1'), interaction.options.getString('option2'), interaction.options.getString('option3'), interaction.options.getString('option4')].filter(Boolean);
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${q}`).setDescription(opts.map((o, i) => `${emojis[i]} ${o}`).join('\n')).setFooter({ text: `بواسطة ${user.displayName}` })], fetchReply: true });
      for (let i = 0; i < opts.length; i++) await msg.react(emojis[i]);
      return;
    }
    if (commandName === 'serverstats') {
      const g = guild;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL()).addFields({ name: '👥 الأعضاء', value: `${g.memberCount - bots}`, inline: true }, { name: '🤖 بوتات', value: `${bots}`, inline: true }, { name: '📁 قنوات', value: `${g.channels.cache.size}`, inline: true }, { name: '🎭 رتب', value: `${g.roles.cache.size}`, inline: true }).setTimestamp()] });
    }

    // ━━━━ Points System ━━━━
    if (commandName === 'quiz') {
      if (db.activeTriviaGame) return interaction.reply({ content: '⚠️ في لعبة شغّالة!', ephemeral: true });
      const q = getRandom(TRIVIA);
      db.activeTriviaGame = { question: q.q, answers: q.a, points: q.pts, diff: q.diff, channelId: interaction.channelId, answered: false };
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF39C12).setTitle('🎮 سؤال تنافسي!').setDescription(`**${q.q}**`).addFields({ name: '⭐ النقاط', value: `${q.pts} نقطة`, inline: true }, { name: '🎯 الصعوبة', value: q.diff, inline: true }).setFooter({ text: 'اكتب إجابتك في الدردشة! عندك 30 ثانية' })] });
      db.activeTriviaGame.timeout = setTimeout(async () => {
        if (db.activeTriviaGame?.answered === false) {
          await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('⏰ انتهى الوقت!').setDescription(`الإجابة الصحيحة: **${q.a[0]}**`)] });
          db.activeTriviaGame = null;
        }
      }, 30000);
      return;
    }
    if (commandName === 'pts') {
      const pts = db.trivia[uid] || { points: 0, correct: 0 };
      const allSorted = Object.entries(db.trivia).sort((a, b) => b[1].points - a[1].points);
      const rank = allSorted.findIndex(([id]) => id === uid) + 1;
      const tier = pts.points >= 500 ? '💎 Diamond' : pts.points >= 200 ? '🥇 Gold' : pts.points >= 100 ? '🥈 Silver' : pts.points >= 50 ? '🥉 Bronze' : '🔵 Starter';
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle(`🏅 نقاط ${user.displayName}`).addFields({ name: '⭐ إجمالي النقاط', value: `${pts.points}`, inline: true }, { name: '✅ إجابات صح', value: `${pts.correct}`, inline: true }, { name: '🏆 الترتيب', value: rank > 0 ? `توب ${rank}` : '-', inline: true }, { name: '💎 المستوى', value: tier, inline: false })], ephemeral: true });
    }
    if (commandName === 'top') {
      const sorted = Object.entries(db.trivia).sort((a, b) => b[1].points - a[1].points).slice(0, 10);
      if (!sorted.length) return interaction.reply({ content: '❌ ما في بيانات بعد!', ephemeral: true });
      const myRank = Object.entries(db.trivia).sort((a, b) => b[1].points - a[1].points).findIndex(([id]) => id === uid) + 1;
      const myPts = db.trivia[uid]?.points || 0;
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 التصنيف التنافسي').setDescription(sorted.map(([id, d], i) => { const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`; return `${medal} <@${id}> — **${d.points} نقطة**`; }).join('\n')).addFields({ name: '━━━━━━━━━━━━', value: `ترتيبك: **توب ${myRank || '?'}** | نقاطك: **${myPts}**`, inline: false }).setFooter({ text: `${SERVER_NAME} • Competitive Rankings` })] });
    }

    // ━━━━ Points Admin ━━━━
    if (commandName === 'addpoints') {
      const target = interaction.options.getMember('member');
      const points = interaction.options.getInteger('points');
      const reason = interaction.options.getString('reason');
      if (!db.trivia[target.id]) db.trivia[target.id] = { points: 0, correct: 0 };
      db.trivia[target.id].points += points;
      addModLog('إضافة نقاط', target.user.tag, `+${points}: ${reason}`, user.tag);
      try { await target.send({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('⭐ حصلت على نقاط!').addFields({ name: '➕ النقاط المضافة', value: `+${points}`, inline: true }, { name: '📊 رصيدك الآن', value: `${db.trivia[target.id].points}`, inline: true }, { name: '📋 السبب', value: reason, inline: false }).setFooter({ text: GUILD_NAME })] }); } catch {}
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('✅ تمت إضافة النقاط').addFields({ name: '👤 العضو', value: target.user.tag, inline: true }, { name: '➕ المضاف', value: `${points}`, inline: true }, { name: '📊 الرصيد الجديد', value: `${db.trivia[target.id].points}`, inline: true }, { name: '📋 السبب', value: reason, inline: false })], ephemeral: true });
    }
    if (commandName === 'removepoints') {
      const target = interaction.options.getMember('member');
      const points = interaction.options.getInteger('points');
      const reason = interaction.options.getString('reason') || 'بدون سبب';
      if (!db.trivia[target.id]) db.trivia[target.id] = { points: 0, correct: 0 };
      db.trivia[target.id].points = Math.max(0, db.trivia[target.id].points - points);
      addModLog('سحب نقاط', target.user.tag, `-${points}: ${reason}`, user.tag);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('➖ تم سحب النقاط').addFields({ name: '👤 العضو', value: target.user.tag, inline: true }, { name: '➖ المسحوب', value: `${points}`, inline: true }, { name: '📊 الرصيد الجديد', value: `${db.trivia[target.id].points}`, inline: true })], ephemeral: true });
    }
    if (commandName === 'setpoints') {
      const target = interaction.options.getMember('member');
      const points = interaction.options.getInteger('points');
      if (!db.trivia[target.id]) db.trivia[target.id] = { points: 0, correct: 0 };
      const old = db.trivia[target.id].points;
      db.trivia[target.id].points = points;
      addModLog('ضبط نقاط', target.user.tag, `${old} → ${points}`, user.tag);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('🔧 تم ضبط النقاط').addFields({ name: '👤 العضو', value: target.user.tag, inline: true }, { name: '📊 القديم', value: `${old}`, inline: true }, { name: '📊 الجديد', value: `${points}`, inline: true })], ephemeral: true });
    }

    // ━━━━ Challenges ━━━━
    if (commandName === 'readingchallenge') {
      if (!db.readingChallenge) db.readingChallenge = {};
      if (db.readingChallenge[uid]) return interaction.reply({ content: `📚 أنت مسجّل بالفعل! كتبك هذا الشهر: **${db.readingChallenge[uid].books}**`, ephemeral: true });
      db.readingChallenge[uid] = { books: db.books[uid]?.length || 0, startDate: new Date().toISOString() };
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('📚 تم التسجيل في تحدي القراءة!').setDescription(`مرحباً ${user}!\nسجّلت في **تحدي القراءة الشهري** 🎉\n\nاستخدم \`/addbook\` لتسجيل كتبك وتجمع نقاط!\n*في نهاية الشهر يُعلن الفائز ويحصل على جائزة!*`).setFooter({ text: `${SERVER_NAME} • Reading Challenge` })] });
    }
    if (commandName === 'bookclub') {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle('📖 نادي الكتاب الأسبوعي').setDescription(['**كيف يعمل نادي الكتاب؟**', '', '📅 كل أسبوع نختار كتاباً أو رواية للقراءة الجماعية', '💬 نناقشها في قنوات الديسكورد', '⭐ من أنهاها يحصل على **+10 نقاط** ومراجعة منظمة', '', '📚 للمشاركة: اقرأ الكتاب المحدد واكتب مراجعتك بـ `/review`', '', '*تابع `#book-of-the-month` لمعرفة الكتاب الحالي!*'].join('\n')).setFooter({ text: `${SERVER_NAME} • Book Club` })] });
    }
    if (commandName === 'authorprofile') {
      const title = interaction.options.getString('title');
      const genre = interaction.options.getString('genre');
      const desc = interaction.options.getString('description');
      const status = interaction.options.getString('status');
      const statusLabel = { ongoing: '🟢 مستمرة', completed: '✅ مكتملة', hiatus: '⏸️ متوقفة' };
      if (!db.trivia[uid]) db.trivia[uid] = { points: 0, correct: 0 };
      db.trivia[uid].points += 5;
      const pubCh = guild.channels.cache.find(c => c.name.includes('original novels') || c.name.includes('author'));
      const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle(`📖 ${title}`).setDescription(desc).addFields({ name: '🏷️ النوع', value: genre, inline: true }, { name: '📊 الحالة', value: statusLabel[status], inline: true }, { name: '✍️ المؤلف', value: `${user}`, inline: true }).setTimestamp();
      if (pubCh) await pubCh.send({ embeds: [embed] });
      await notifyAdmins(guild, interaction.member, `نشر بروفايل رواية: ${title}`, 5);
      return interaction.reply({ content: `✅ نُشر بروفايل روايتك! حصلت على **+5 نقاط** 🎉`, ephemeral: true });
    }

    // ━━━━ Moderation ━━━━
    if (commandName === 'purge') {
      const amount = interaction.options.getInteger('amount');
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
      return interaction.editReply({ content: `✅ حُذفت **${deleted?.size || 0}** رسالة` });
    }
    if (commandName === 'announce') {
      const title = interaction.options.getString('title');
      const msg = interaction.options.getString('message');
      const colorMap = { gold: 0xFFD700, blue: 0x5865F2, green: 0x57F287, red: 0xED4245 };
      const color = colorMap[interaction.options.getString('color') || 'gold'];
      const annCh = guild.channels.cache.find(c => c.name.includes('announcements'));
      if (!annCh) return interaction.reply({ content: '❌ ما لقيت قناة الإعلانات!', ephemeral: true });
      await annCh.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`📢 ${title}`).setDescription(msg).setFooter({ text: `${SERVER_NAME}` }).setTimestamp()] });
      return interaction.reply({ content: '✅ تم نشر الإعلان!', ephemeral: true });
    }

    // ━━━━ Warnings ━━━━
    if (commandName === 'warn') {
      const target = interaction.options.getMember('member');
      const reason = interaction.options.getString('reason');
      if (!db.warnings[target.id]) db.warnings[target.id] = [];
      db.warnings[target.id].push({ reason, by: user.tag, byId: user.id, time: new Date().toISOString(), removed: false });
      const count = db.warnings[target.id].filter(w => !w.removed).length;
      addModLog('تحذير', target.user.tag, reason, user.tag);
      try { await target.send({ embeds: [new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تلقيت تحذيراً').addFields({ name: '📋 السبب', value: reason }, { name: '👮 بواسطة', value: user.tag }, { name: '⚠️ عدد تحذيراتك', value: `${count}` }).setDescription(count >= 3 ? '🔴 وصلت للحد الأقصى — سيُطبق تايم أوت تلقائياً!' : '').setFooter({ text: GUILD_NAME })] }); } catch {}
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تم التحذير').addFields({ name: '👤', value: target.user.tag, inline: true }, { name: '📋', value: reason, inline: true }, { name: '⚠️', value: `${count}`, inline: true })] });
      if (count >= 3) await handleAutoTimeout(target, count, reason);
    }
    if (commandName === 'warnings') {
      const target = interaction.options.getMember('member');
      const warns = db.warnings[target.id]?.filter(w => !w.removed) || [];
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(warns.length >= 3 ? 0xED4245 : 0xFEA500).setTitle(`⚠️ تحذيرات ${target.user.tag}`).setDescription(warns.length === 0 ? '✅ لا يوجد تحذيرات' : warns.map((w, i) => `**${i + 1}.** ${w.reason}\n> 👮 ${w.by} | 🕒 ${new Date(w.time).toLocaleDateString('ar-SA')}`).join('\n\n')).addFields({ name: '📊', value: `${warns.length} تحذير فعّال`, inline: true })], ephemeral: true });
    }
    if (commandName === 'removewarn') {
      const target = interaction.options.getMember('member');
      const index = interaction.options.getInteger('index') - 1;
      const warns = db.warnings[target.id]?.filter(w => !w.removed) || [];
      if (index < 0 || index >= warns.length) return interaction.reply({ content: '❌ رقم غير صحيح!', ephemeral: true });
      let c = 0;
      for (let i = 0; i < (db.warnings[target.id] || []).length; i++) {
        if (!db.warnings[target.id][i].removed) { if (c === index) { db.warnings[target.id][i].removed = true; db.warnings[target.id][i].removedBy = user.tag; db.warnings[target.id][i].removedTime = new Date().toISOString(); break; } c++; }
      }
      addModLog('حذف تحذير', target.user.tag, warns[index].reason, user.tag);
      return interaction.reply({ content: `✅ حُذف التحذير رقم ${index + 1} من ${target.user.tag}` });
    }

    // ━━━━ Monthly Awards ━━━━
    if (commandName === 'monthlyawards') {
      await interaction.deferReply();
      const topR = Object.entries(db.awards || {}).sort((a, b) => b[1].reads - a[1].reads)[0];
      const topW = Object.entries(db.awards || {}).sort((a, b) => b[1].words - a[1].words)[0];
      const topP = Object.entries(db.trivia || {}).sort((a, b) => b[1].points - a[1].points)[0];
      const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 جوائز ${new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`).setDescription('تهانينا للفائزين! 🎉').addFields(
        { name: '📚 أفضل قارئ', value: topR ? `<@${topR[0]}> — ${topR[1].reads} كتاب` : 'لا يوجد', inline: false },
        { name: '✍️ أفضل كاتب', value: topW ? `<@${topW[0]}> — ${topW[1].words.toLocaleString()} كلمة` : 'لا يوجد', inline: false },
        { name: '⭐ أعلى نقاط', value: topP ? `<@${topP[0]}> — ${topP[1].points} نقطة` : 'لا يوجد', inline: false },
      ).setTimestamp();
      const annCh = guild.channels.cache.find(c => c.name.includes('announcements'));
      if (annCh) await annCh.send({ embeds: [embed] });
      Object.keys(db.awards || {}).forEach(id => { db.awards[id] = { reads: 0, words: 0 }; });
      return interaction.editReply({ content: '✅ تم الإعلان!' });
    }
  });

  // ━━━━ Trivia Answers (message listener) ━━━━
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !db.activeTriviaGame) return;
    if (message.channelId !== db.activeTriviaGame.channelId || db.activeTriviaGame.answered) return;
    const ans = message.content.trim().toLowerCase();
    if (!db.activeTriviaGame.answers.some(a => ans.includes(a.toLowerCase()))) return;
    db.activeTriviaGame.answered = true;
    clearTimeout(db.activeTriviaGame.timeout);
    const pts = db.activeTriviaGame.points;
    const uid = message.author.id;
    if (!db.trivia[uid]) db.trivia[uid] = { points: 0, correct: 0 };
    db.trivia[uid].points += pts;
    db.trivia[uid].correct += 1;
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🎉 إجابة صحيحة!').setDescription(`${message.author} حصل على **+${pts} نقطة**!\nإجمالي نقاطه: **${db.trivia[uid].points}**`).setFooter({ text: 'استخدم /pts لترى نقاطك الكاملة' })] });
    const winner = await message.guild.members.fetch(uid).catch(() => null);
    if (winner) await notifyAdmins(message.guild, winner, 'أجاب صح على سؤال Trivia', pts);
    db.activeTriviaGame = null;
  });
}

module.exports = { setupMegaBot };
