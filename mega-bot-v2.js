const {
  Client, GatewayIntentBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits
} = require('discord.js');
const { db, addModLog } = require('./shared-db');

const TOKEN      = process.env.TOKEN;
const CLIENT_ID  = process.env.CLIENT_ID;
const GUILD_NAME = process.env.GUILD_NAME || 'T.G.W';
const SERVER_NAME= process.env.SERVER_NAME || 'T.G.W';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const getRandom = arr => arr[Math.floor(Math.random()*arr.length)];

const QUOTES = [
  { text:"A reader lives a thousand lives before he dies.", author:"George R.R. Martin" },
  { text:"Not all those who wander are lost.", author:"J.R.R. Tolkien" },
  { text:"It is our choices that show what we truly are.", author:"J.K. Rowling" },
  { text:"There is no friend as loyal as a book.", author:"Ernest Hemingway" },
  { text:"Books are a uniquely portable magic.", author:"Stephen King" },
  { text:"The more that you read, the more things you will know.", author:"Dr. Seuss" },
  { text:"A book is a dream that you hold in your hands.", author:"Neil Gaiman" },
  { text:"There is no greater agony than bearing an untold story inside you.", author:"Maya Angelou" },
  { text:"If you only read the books that everyone else is reading, you can only think what everyone else is thinking.", author:"Haruki Murakami" },
  { text:"Reading is to the mind what exercise is to the body.", author:"Joseph Addison" },
];

const WRITING_TIPS = [
  "✍️ اكتب كل يوم ولو 100 كلمة — الاستمرارية أهم من الكمية",
  "📖 اقرأ في نفس النوع الذي تكتبه",
  "🎯 حدد هدفك قبل الكتابة",
  "🔄 المسودة الأولى لا تحتاج أن تكون مثالية",
  "👥 اطلب رأي قراء تجريبيين قبل النشر",
  "💬 الحوار يجب أن يكشف الشخصية لا فقط ينقل المعلومات",
  "⚡ ابدأ من أكثر لحظة توتراً",
  "🎭 كل شخصية تحتاج هدفاً وخوفاً وعيباً",
];

const NOVEL_RECS = {
  fantasy:["🧙 The Name of the Wind","🗡️ The Way of Kings","🌍 The Hobbit","⚔️ A Game of Thrones","🔮 The Final Empire"],
  action: ["⚡ Solo Leveling","🥊 The Beginning After the End","🗡️ Overlord","🔥 Re:Zero","💪 Omniscient Reader"],
  romance:["💕 Pride and Prejudice","🌹 Outlander","💝 The Notebook","🌸 Horimiya","💌 Anna and the French Kiss"],
  mystery:["🔍 And Then There Were None","🕵️ The Girl with the Dragon Tattoo","🗝️ Gone Girl","🔎 The Da Vinci Code","🌃 Big Little Lies"],
  scifi:  ["🚀 Dune","🤖 Foundation","🌌 The Hitchhiker's Guide","👾 Ender's Game","🛸 The Martian"],
  horror: ["👻 It","🏚️ The Haunting of Hill House","🧟 World War Z","🩸 Dracula","😱 The Shining"],
  wuxia:  ["☁️ Renegade Immortal","⚡ A Will Eternal","🌊 I Shall Seal the Heavens","🔥 Coiling Dragon","🌙 Against the Gods"],
  isekai: ["🗡️ Sword Art Online","🔮 That Time I Got Reincarnated as a Slime","🌸 Mushoku Tensei","⚔️ Overlord","🎮 Log Horizon"],
};

const RANDOM_BOOKS = [
  {title:"The Alchemist",author:"Paulo Coelho",genre:"Philosophy"},
  {title:"1984",author:"George Orwell",genre:"Dystopia"},
  {title:"The Little Prince",author:"Antoine de Saint-Exupéry",genre:"Classic"},
  {title:"Brave New World",author:"Aldous Huxley",genre:"Sci-Fi"},
  {title:"The Great Gatsby",author:"F. Scott Fitzgerald",genre:"Classic"},
  {title:"To Kill a Mockingbird",author:"Harper Lee",genre:"Drama"},
  {title:"Lord of the Flies",author:"William Golding",genre:"Dystopia"},
  {title:"Fahrenheit 451",author:"Ray Bradbury",genre:"Sci-Fi"},
];

const LITERARY_TERMS = {
  "protagonist":"البطل الرئيسي في القصة",
  "antagonist":"الخصم أو قوة المعارضة",
  "foreshadowing":"التلميح — إشارات مبكرة تلمح لأحداث قادمة",
  "cliffhanger":"نهاية مشوّقة تترك القارئ في تعليق",
  "plot twist":"منعطف مفاجئ يغيّر مجرى القصة",
  "worldbuilding":"بناء العالم الخيالي للرواية",
  "pov":"وجهة النظر — الزاوية التي تُروى منها القصة",
  "arc":"قوس الشخصية — تطورها عبر القصة",
  "trope":"عنصر سردي متكرر في نوع أدبي معين",
  "manhwa":"الكوميكس الكوري",
  "manhua":"الكوميكس الصيني",
  "light novel":"رواية خفيفة يابانية مصحوبة بصور أنيمي",
  "wuxia":"نوع صيني يدور حول فنون القتال",
  "xianxia":"نوع صيني يدور حول الزهد وتحقيق الخلود",
  "isekai":"نوع ياباني — انتقال شخص إلى عالم آخر",
};

const CHARACTER_TRAITS = {
  personality:["شجاع","ذكي","متهور","هادئ","غامض","ودود","مخلص","طموح","متمرد","حكيم"],
  role:       ["ساحر","محارب","لص","رامي","جاسوس","قائد","تاجر","عالم"],
  flaw:       ["متكبر","خائف من الخسارة","لا يثق بأحد","يكذب كثيراً"],
  goal:       ["الانتقام","حماية من يحب","اكتشاف الحقيقة","إنقاذ العالم","إيجاد الهوية"],
  background: ["يتيم نشأ في الشوارع","أمير فقد عرشه","محارب سابق","ابن التاجر الفقير"],
};

const TRIVIA = [
  {q:"من كتب رواية هاري بوتر؟",a:["j.k. rowling","rowling","رولينج"],pts:1,diff:"🟢 سهل"},
  {q:"من كتب رواية The Hobbit؟",a:["tolkien","j.r.r tolkien","تولكين"],pts:1,diff:"🟢 سهل"},
  {q:"من كتب رواية Dune؟",a:["frank herbert","herbert","هيربرت"],pts:1,diff:"🟢 سهل"},
  {q:"ما اسم مدرسة السحر في هاري بوتر؟",a:["hogwarts","هوغوارتس"],pts:1,diff:"🟢 سهل"},
  {q:"في Solo Leveling، ما اسم البطل الرئيسي؟",a:["sung jinwoo","jinwoo","جين وو"],pts:2,diff:"🟡 متوسط"},
  {q:"في Overlord، ما اسم الساحر الهيكل العظمي؟",a:["ainz","ainz ooal gown","آينز"],pts:2,diff:"🟡 متوسط"},
  {q:"في Dune، ما اسم الكوكب الرئيسي؟",a:["arrakis","أراكيس"],pts:2,diff:"🟡 متوسط"},
  {q:"من كتب The Name of the Wind؟",a:["patrick rothfuss","rothfuss","روثفوس"],pts:2,diff:"🟡 متوسط"},
  {q:"في The Way of Kings، ما اسم بطل الرواية الذي كان عبداً؟",a:["kaladin","كالادين"],pts:2,diff:"🟡 متوسط"},
  {q:"في Mistborn، ما اسم النظام السحري الذي يعتمد على المعادن؟",a:["allomancy","الومانسي"],pts:3,diff:"🔴 صعب"},
  {q:"ما اسم مؤلف سلسلة Renegade Immortal؟",a:["er gen","إر جن"],pts:3,diff:"🔴 صعب"},
  {q:"في هاري بوتر، ما الاسم الكامل للبروفيسور ماكغونيغال؟",a:["minerva mcgonagall","minerva","مينيرفا"],pts:3,diff:"🔴 صعب"},
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto Timeout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const handleAutoTimeout = async (member, count, reason) => {
  if (count < 3) return;
  const mins = 15 + ((count - 3) * 5);
  await member.timeout(mins * 60000).catch(() => {});
  try {
    await member.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('⏰ تايم أوت تلقائي')
      .setDescription(`تلقيت **${count} تحذير**\n**المدة:** ${mins} دقيقة\n**السبب:** ${reason}`)
      .setFooter({ text: GUILD_NAME })] });
  } catch {}
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Slash Commands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const commands = [
  new SlashCommandBuilder().setName('addbook').setDescription('📚 سجّل كتاباً').addStringOption(o=>o.setName('title').setDescription('اسم الكتاب').setRequired(true)),
  new SlashCommandBuilder().setName('mybooklist').setDescription('📖 قائمة كتبك'),
  new SlashCommandBuilder().setName('bookstats').setDescription('📊 إحصائيات قراءتك'),
  new SlashCommandBuilder().setName('randombook').setDescription('🎲 كتاب عشوائي'),
  new SlashCommandBuilder().setName('sprint').setDescription('⚡ سباق كتابة').addIntegerOption(o=>o.setName('minutes').setDescription('المدة (5-60 دقيقة)').setRequired(true).setMinValue(5).setMaxValue(60)),
  new SlashCommandBuilder().setName('wc').setDescription('✍️ سجّل كلماتك في السباق').addIntegerOption(o=>o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('wordcount').setDescription('📝 كلماتك اليومية').addIntegerOption(o=>o.setName('words').setDescription('عدد الكلمات').setRequired(true)),
  new SlashCommandBuilder().setName('mywords').setDescription('📈 إحصائيات كلماتك'),
  new SlashCommandBuilder().setName('setgoal').setDescription('🎯 هدف كلمات يومي').addIntegerOption(o=>o.setName('goal').setDescription('الهدف').setRequired(true)),
  new SlashCommandBuilder().setName('writingtip').setDescription('💡 نصيحة كتابة'),
  new SlashCommandBuilder().setName('charactergen').setDescription('🎭 شخصية رواية عشوائية'),
  new SlashCommandBuilder().setName('recommend').setDescription('🤖 توصيات روايات').addStringOption(o=>o.setName('genre').setDescription('النوع').setRequired(true).addChoices(
    {name:'🧙 Fantasy',value:'fantasy'},{name:'⚡ Action',value:'action'},{name:'💕 Romance',value:'romance'},
    {name:'🔍 Mystery',value:'mystery'},{name:'🚀 Sci-Fi',value:'scifi'},{name:'👻 Horror',value:'horror'},
    {name:'☁️ Wuxia',value:'wuxia'},{name:'🗡️ Isekai',value:'isekai'},
  )),
  new SlashCommandBuilder().setName('define').setDescription('📖 تعريف مصطلح أدبي').addStringOption(o=>o.setName('term').setDescription('المصطلح').setRequired(true)),
  new SlashCommandBuilder().setName('quote').setDescription('💬 اقتباس أدبي'),
  new SlashCommandBuilder().setName('poll').setDescription('📊 تصويت سريع')
    .addStringOption(o=>o.setName('question').setDescription('السؤال').setRequired(true))
    .addStringOption(o=>o.setName('option1').setDescription('خيار 1').setRequired(true))
    .addStringOption(o=>o.setName('option2').setDescription('خيار 2').setRequired(true))
    .addStringOption(o=>o.setName('option3').setDescription('خيار 3'))
    .addStringOption(o=>o.setName('option4').setDescription('خيار 4')),
  new SlashCommandBuilder().setName('serverstats').setDescription('📊 إحصائيات السيرفر'),
  new SlashCommandBuilder().setName('quiz').setDescription('🎮 أسئلة الروايات').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('pts').setDescription('🏅 نقاطك في Quiz'),
  new SlashCommandBuilder().setName('top').setDescription('🏆 توب 10 لاعبين'),
  new SlashCommandBuilder().setName('monthlyawards').setDescription('🏆 جوائز الشهر').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  // ── أوامر التحذيرات ──
  new SlashCommandBuilder().setName('warn').setDescription('⚠️ تحذير لعضو')
    .addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true))
    .addStringOption(o=>o.setName('reason').setDescription('السبب').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('warnings').setDescription('📋 تحذيرات عضو')
    .addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)),
  new SlashCommandBuilder().setName('removewarn').setDescription('🗑️ حذف تحذير')
    .addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o=>o.setName('index').setDescription('رقم التحذير').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(c=>c.toJSON());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ready
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('clientReady', async () => {
  console.log(`✅ Mega Bot: ${client.user.tag}`);
  const guild = client.guilds.cache.find(g=>g.name===GUILD_NAME);
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); return; }
  console.log(`🏠 ${guild.name}`);

  const rest = new REST({version:'10'}).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), {body:commands});
  console.log('✅ الأوامر سُجّلت!');

  // Language Roles message
  const langCh = guild.channels.cache.find(c=>c.name.includes('language-roles'));
  if (langCh) {
    const msgs = await langCh.messages.fetch({limit:5});
    if (!msgs.find(m=>m.author.id===client.user.id)) {
      const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('🌍 اختر مجتمعك اللغوي').setDescription([
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🇬🇧 **English** — Western Novels • Fantasy • Romance',
        '🇨🇳 **Chinese** — Wuxia • Xianxia • Manhua',
        '🇯🇵 **Japanese** — Light Novel • Isekai • Manga',
        '🇰🇷 **Korean** — Manhwa • Web Novel',
        '🇸🇦 **Arabic** — روايات عربية • أدب',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '✅ يمكنك اختيار **أكثر من رتبة** | ❌ اضغط مرة ثانية **لإلغاء**',
      ].join('\n')).setFooter({text:`${SERVER_NAME} • Language Communities`});
      const r1=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('lang_cn').setLabel('🇨🇳 Chinese').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('lang_jp').setLabel('🇯🇵 Japanese').setStyle(ButtonStyle.Success),
      );
      const r2=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_kr').setLabel('🇰🇷 Korean').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_ar').setLabel('🇸🇦 Arabic').setStyle(ButtonStyle.Danger),
      );
      await langCh.send({embeds:[embed],components:[r1,r2]});
      console.log('✅ رسالة Language Roles أُرسلت!');
    }
  }

  // Daily Quote
  const sendQ = async () => {
    const g=client.guilds.cache.find(x=>x.name===GUILD_NAME);
    const ch=g?.channels.cache.find(c=>c.name.includes('qotd'));
    if (!ch) return;
    const q=getRandom(QUOTES);
    await ch.send({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس اليوم').setDescription(`*"${q.text}"*`).addFields({name:'✍️',value:`**${q.author}**`}).setTimestamp()]});
  };
  const now=new Date(),next=new Date();next.setHours(9,0,0,0);
  if(now>=next)next.setDate(next.getDate()+1);
  setTimeout(()=>{sendQ();setInterval(sendQ,86400000);},next-now);
  console.log('🔄 Mega Bot جاهز!');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Interactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('interactionCreate', async (interaction) => {

  // ── Buttons ──
  if (interaction.isButton()) {
    const roleMap={
      'lang_en':'🇬🇧 English Novel Reader',
      'lang_cn':'🇨🇳 Chinese Novel Reader',
      'lang_jp':'🇯🇵 Japanese Novel Reader',
      'lang_kr':'🇰🇷 Korean Novel Reader',
      'lang_ar':'🇸🇦 Arabic Novel Reader',
    };
    const roleName=roleMap[interaction.customId];
    if (!roleName) return;
    await interaction.deferReply({ephemeral:true});
    const role=interaction.guild.roles.cache.find(r=>r.name===roleName);
    if (!role) return interaction.editReply({content:'❌ ما لقيت الرتبة! تواصل مع الإدارة.'});
    const has=interaction.member.roles.cache.has(role.id);
    try {
      if (has) { await interaction.member.roles.remove(role); return interaction.editReply({content:`✅ أُزيلت رتبة **${roleName}**`}); }
      else { await interaction.member.roles.add(role); return interaction.editReply({content:`🎉 حصلت على رتبة **${roleName}**! تحقق من القنوات الجديدة 👀`}); }
    } catch(e) { return interaction.editReply({content:`❌ خطأ: ${e.message}`}); }
  }

  if (!interaction.isChatInputCommand()) return;
  const {commandName,user,guild} = interaction;
  const uid = user.id;

  // ── Book Tracker ──
  if (commandName==='addbook') {
    const title=interaction.options.getString('title');
    if (!db.books[uid]) db.books[uid]=[];
    db.books[uid].push({title,date:new Date().toLocaleDateString('ar-SA')});
    if (!db.awards[uid]) db.awards[uid]={reads:0,words:0};
    db.awards[uid].reads++;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('📚 تم التسجيل!').addFields({name:'📖',value:title,inline:true},{name:'📊 إجمالي',value:`${db.books[uid].length} كتاب`,inline:true})],ephemeral:true});
  }
  if (commandName==='mybooklist') {
    const books=db.books[uid];
    if (!books?.length) return interaction.reply({content:'📚 ما سجّلت كتاباً! استخدم `/addbook`',ephemeral:true});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`📚 كتب ${user.displayName}`).setDescription(books.map((b,i)=>`${i+1}. **${b.title}** — ${b.date}`).join('\n').slice(0,2000)).setFooter({text:`إجمالي: ${books.length}`})],ephemeral:true});
  }
  if (commandName==='bookstats') {
    const books=db.books[uid]||[];
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9B59B6).setTitle(`📊 ${user.displayName}`).addFields({name:'📚 الإجمالي',value:`${books.length}`,inline:true},{name:'🏆',value:books.length>=20?'🌌 Legend':books.length>=10?'📓 V':books.length>=5?'📕 IV':'📗 I',inline:true})],ephemeral:true});
  }
  if (commandName==='randombook') {
    const b=getRandom(RANDOM_BOOKS);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x1ABC9C).setTitle('🎲 كتاب عشوائي!').addFields({name:'📖',value:b.title,inline:true},{name:'✍️',value:b.author,inline:true},{name:'🏷️',value:b.genre,inline:true})]});
  }

  // ── Writing ──
  if (commandName==='sprint') {
    const mins=interaction.options.getInteger('minutes');
    const chId=interaction.channelId;
    if (db.sprints[chId]?.active) return interaction.reply({content:'⚡ في سباق شغّال!',ephemeral:true});
    const end=Date.now()+mins*60000;
    db.sprints[chId]={active:true,endTime:end,participants:{}};
    await interaction.reply({embeds:[new EmbedBuilder().setColor(0xE67E22).setTitle('⚡ سباق بدأ!').setDescription(`**المدة:** ${mins} دقيقة\n**ينتهي:** <t:${Math.floor(end/1000)}:R>\n\nسجّل كلماتك بـ \`/wc\``)]});
    setTimeout(async()=>{
      db.sprints[chId].active=false;
      const parts=Object.entries(db.sprints[chId].participants).sort((a,b)=>b[1]-a[1]);
      if (!parts.length){await interaction.channel.send('⏰ انتهى السباق! ما سجّل أحد.');return;}
      await interaction.channel.send({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🏁 النتائج!').setDescription(parts.slice(0,3).map(([id,w],i)=>`${'🥇🥈🥉'[i]} <@${id}> — **${w} كلمة**`).join('\n'))]});
      delete db.sprints[chId];
    },mins*60000);
    return;
  }
  if (commandName==='wc') {
    const words=interaction.options.getInteger('words');
    const chId=interaction.channelId;
    if (!db.sprints[chId]?.active) return interaction.reply({content:'❌ ما في سباق!',ephemeral:true});
    db.sprints[chId].participants[uid]=(db.sprints[chId].participants[uid]||0)+words;
    if (!db.awards[uid]) db.awards[uid]={reads:0,words:0};
    db.awards[uid].words+=words;
    return interaction.reply({content:`✅ **${words} كلمة** لـ ${user.displayName}! إجمالي: **${db.sprints[chId].participants[uid]}**`});
  }
  if (commandName==='wordcount') {
    const words=interaction.options.getInteger('words');
    if (!db.wordCount[uid]) db.wordCount[uid]={today:0,total:0,goal:1000};
    db.wordCount[uid].today+=words; db.wordCount[uid].total+=words;
    if (!db.awards[uid]) db.awards[uid]={reads:0,words:0};
    db.awards[uid].words+=words;
    const {today,total,goal}=db.wordCount[uid];
    const pct=Math.min(Math.round(today/goal*100),100);
    const bar='█'.repeat(Math.floor(pct/10))+'░'.repeat(10-Math.floor(pct/10));
    return interaction.reply({embeds:[new EmbedBuilder().setColor(pct>=100?0x57F287:0x5865F2).setTitle('📝 كلماتك').addFields({name:'✍️ اليوم',value:`${today.toLocaleString()}`,inline:true},{name:'🎯 الهدف',value:`${goal.toLocaleString()}`,inline:true},{name:`${pct}%`,value:`\`${bar}\``,inline:false}).setDescription(pct>=100?'🎉 وصلت هدفك!':'')],ephemeral:true});
  }
  if (commandName==='mywords') {
    const wc=db.wordCount[uid]||{today:0,total:0,goal:1000};
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9B59B6).setTitle(`📈 ${user.displayName}`).addFields({name:'📅 اليوم',value:`${wc.today.toLocaleString()}`,inline:true},{name:'🎯 الهدف',value:`${wc.goal.toLocaleString()}`,inline:true},{name:'📚 الكلي',value:`${wc.total.toLocaleString()}`,inline:true})],ephemeral:true});
  }
  if (commandName==='setgoal') {
    const goal=interaction.options.getInteger('goal');
    if (!db.wordCount[uid]) db.wordCount[uid]={today:0,total:0,goal:1000};
    db.wordCount[uid].goal=goal;
    return interaction.reply({content:`🎯 هدفك: **${goal.toLocaleString()} كلمة**`,ephemeral:true});
  }
  if (commandName==='writingtip') return interaction.reply({embeds:[new EmbedBuilder().setColor(0x9B59B6).setTitle('💡 نصيحة كتابة').setDescription(getRandom(WRITING_TIPS))]});
  if (commandName==='charactergen') {
    const c=CHARACTER_TRAITS;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xE74C3C).setTitle('🎭 شخصية عشوائية').addFields(
      {name:'⚔️ الدور',value:getRandom(c.role),inline:true},{name:'🧠 الشخصية',value:getRandom(c.personality),inline:true},
      {name:'💔 العيب',value:getRandom(c.flaw),inline:true},{name:'🎯 الهدف',value:getRandom(c.goal),inline:true},
      {name:'📜 الخلفية',value:getRandom(c.background),inline:false}
    ).setFooter({text:'استخدمها في روايتك القادمة! ✨'})]});
  }

  // ── Info ──
  if (commandName==='recommend') {
    const genre=interaction.options.getString('genre');
    const labels={fantasy:'🧙 Fantasy',action:'⚡ Action',romance:'💕 Romance',mystery:'🔍 Mystery',scifi:'🚀 Sci-Fi',horror:'👻 Horror',wuxia:'☁️ Wuxia',isekai:'🗡️ Isekai'};
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x1ABC9C).setTitle(`${labels[genre]} — توصيات`).setDescription(NOVEL_RECS[genre].join('\n\n'))]});
  }
  if (commandName==='define') {
    const term=interaction.options.getString('term').toLowerCase();
    const def=LITERARY_TERMS[term];
    if (!def) return interaction.reply({content:`❌ ما لقيت تعريف لـ "${term}"\nالمتاح: ${Object.keys(LITERARY_TERMS).join(', ')}`,ephemeral:true});
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x3498DB).setTitle(`📖 ${term}`).setDescription(def)]});
  }
  if (commandName==='quote') {
    const q=getRandom(QUOTES);
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('💬 اقتباس').setDescription(`*"${q.text}"*`).addFields({name:'✍️',value:`**${q.author}**`})]});
  }

  // ── Poll ──
  if (commandName==='poll') {
    const q=interaction.options.getString('question');
    const opts=[interaction.options.getString('option1'),interaction.options.getString('option2'),interaction.options.getString('option3'),interaction.options.getString('option4')].filter(Boolean);
    const emojis=['1️⃣','2️⃣','3️⃣','4️⃣'];
    const msg=await interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${q}`).setDescription(opts.map((o,i)=>`${emojis[i]} ${o}`).join('\n')).setFooter({text:`بواسطة ${user.displayName}`})],fetchReply:true});
    for (let i=0;i<opts.length;i++) await msg.react(emojis[i]);
  }

  if (commandName==='serverstats') {
    const g=interaction.guild;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0x5865F2).setTitle(`📊 ${g.name}`).addFields({name:'👥 الأعضاء',value:`${g.memberCount-g.members.cache.filter(m=>m.user.bot).size}`,inline:true},{name:'🤖 بوتات',value:`${g.members.cache.filter(m=>m.user.bot).size}`,inline:true},{name:'📁 قنوات',value:`${g.channels.cache.size}`,inline:true},{name:'🎭 رتب',value:`${g.roles.cache.size}`,inline:true}).setTimestamp()]});
  }

  // ── Quiz ──
  if (commandName==='quiz') {
    if (db.activeTriviaGame) return interaction.reply({content:'⚠️ في لعبة شغّالة!',ephemeral:true});
    const q=getRandom(TRIVIA);
    db.activeTriviaGame={question:q.q,answers:q.a,points:q.pts,diff:q.diff,channelId:interaction.channelId,answered:false};
    await interaction.reply({embeds:[new EmbedBuilder().setColor(0xF39C12).setTitle('🎮 سؤال Trivia!').setDescription(`**${q.q}**`).addFields({name:'⭐ النقاط',value:`${q.pts}`,inline:true},{name:'🎯 الصعوبة',value:q.diff,inline:true}).setFooter({text:'اكتب إجابتك في الدردشة! عندك 30 ثانية'})]});
    db.activeTriviaGame.timeout=setTimeout(async()=>{
      if (db.activeTriviaGame?.answered===false) {
        await interaction.channel.send({embeds:[new EmbedBuilder().setColor(0xED4245).setTitle('⏰ انتهى الوقت!').setDescription(`الإجابة: **${q.a[0]}**`)]});
        db.activeTriviaGame=null;
      }
    },30000);
    return;
  }
  if (commandName==='pts') {
    const pts=db.trivia[uid]||{points:0,correct:0};
    const rank=Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points).findIndex(([id])=>id===uid)+1;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xF1C40F).setTitle(`🏅 ${user.displayName}`).addFields({name:'⭐ النقاط',value:`${pts.points}`,inline:true},{name:'✅ صح',value:`${pts.correct}`,inline:true},{name:'🏆 ترتيبك',value:rank>0?`توب ${rank}`:'؟',inline:true})],ephemeral:true});
  }
  if (commandName==='top') {
    const sorted=Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points).slice(0,10);
    if (!sorted.length) return interaction.reply({content:'❌ ما في بيانات! العب `/quiz`',ephemeral:true});
    const myRank=Object.entries(db.trivia).sort((a,b)=>b[1].points-a[1].points).findIndex(([id])=>id===uid)+1;
    return interaction.reply({embeds:[new EmbedBuilder().setColor(0xFFD700).setTitle('🏆 توب 10').setDescription(sorted.map(([id,d],i)=>`${'🥇🥈🥉'[i]||`${i+1}.`} <@${id}> — **${d.points} نقطة**`).join('\n')).addFields({name:'━━━━━━━',value:`أنت: توب **${myRank||'?'}** | نقاطك: **${db.trivia[uid]?.points||0}**`})]});
  }

  // ── Monthly Awards ──
  if (commandName==='monthlyawards') {
    await interaction.deferReply();
    if (!Object.keys(db.awards).length) return interaction.editReply({content:'❌ ما في بيانات.'});
    const topR=Object.entries(db.awards).sort((a,b)=>b[1].reads-a[1].reads)[0];
    const topW=Object.entries(db.awards).sort((a,b)=>b[1].words-a[1].words)[0];
    const embed=new EmbedBuilder().setColor(0xFFD700).setTitle(`🏆 جوائز ${new Date().toLocaleDateString('ar-SA',{month:'long',year:'numeric'})}`).addFields(
      {name:'📚 أفضل قارئ',value:topR?`<@${topR[0]}> — ${topR[1].reads} كتاب`:'لا يوجد',inline:false},
      {name:'✍️ أفضل كاتب',value:topW?`<@${topW[0]}> — ${topW[1].words.toLocaleString()} كلمة`:'لا يوجد',inline:false},
    ).setTimestamp();
    const annCh=guild.channels.cache.find(c=>c.name.includes('announcements'));
    if (annCh) await annCh.send({embeds:[embed]});
    Object.keys(db.awards).forEach(id=>{db.awards[id]={reads:0,words:0};});
    return interaction.editReply({content:'✅ تم الإعلان!'});
  }

  // ── Warnings ──
  if (commandName==='warn') {
    const target=interaction.options.getMember('member');
    const reason=interaction.options.getString('reason');
    if (!db.warnings[target.id]) db.warnings[target.id]=[];
    db.warnings[target.id].push({reason,by:user.tag,byId:user.id,time:new Date().toISOString(),removed:false});
    const count=db.warnings[target.id].filter(w=>!w.removed).length;
    addModLog('تحذير',target.user.tag,reason,user.tag);
    try { await target.send({embeds:[new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تحذير').addFields({name:'📋 السبب',value:reason},{name:'👮 بواسطة',value:user.tag},{name:'⚠️ عدد تحذيراتك',value:`${count}`}).setDescription(count>=3?'🔴 وصلت للحد الأقصى — سيُطبق تايم أوت!':'').setFooter({text:GUILD_NAME})]}); } catch {}
    await interaction.reply({embeds:[new EmbedBuilder().setColor(0xFEA500).setTitle('⚠️ تم التحذير').addFields({name:'👤 العضو',value:target.user.tag,inline:true},{name:'📋 السبب',value:reason,inline:true},{name:'⚠️ الإجمالي',value:`${count}`,inline:true})]});
    if (count>=3) await handleAutoTimeout(target,count,reason);
  }
  if (commandName==='warnings') {
    const target=interaction.options.getMember('member');
    const warns=db.warnings[target.id]?.filter(w=>!w.removed)||[];
    return interaction.reply({embeds:[new EmbedBuilder().setColor(warns.length>=3?0xED4245:0xFEA500).setTitle(`⚠️ تحذيرات ${target.user.tag}`).setDescription(warns.length===0?'✅ لا يوجد تحذيرات':warns.map((w,i)=>`**${i+1}.** ${w.reason}\n> 👮 ${w.by} | 🕒 ${new Date(w.time).toLocaleDateString('ar-SA')}`).join('\n\n')).addFields({name:'📊',value:`${warns.length} تحذير`,inline:true})],ephemeral:true});
  }
  if (commandName==='removewarn') {
    const target=interaction.options.getMember('member');
    const index=interaction.options.getInteger('index')-1;
    const warns=db.warnings[target.id]?.filter(w=>!w.removed)||[];
    if (index<0||index>=warns.length) return interaction.reply({content:'❌ رقم غير صحيح!',ephemeral:true});
    let c=0;
    for (let i=0;i<(db.warnings[target.id]||[]).length;i++) {
      if (!db.warnings[target.id][i].removed) {
        if (c===index){db.warnings[target.id][i].removed=true;db.warnings[target.id][i].removedBy=user.tag;db.warnings[target.id][i].removedTime=new Date().toISOString();break;}
        c++;
      }
    }
    addModLog('حذف تحذير',target.user.tag,warns[index].reason,user.tag);
    return interaction.reply({content:`✅ حُذف التحذير رقم ${index+1} من ${target.user.tag}`});
  }
});

// ── Trivia Answers ──
client.on('messageCreate', async (message) => {
  if (message.author.bot||!db.activeTriviaGame) return;
  if (message.channelId!==db.activeTriviaGame.channelId||db.activeTriviaGame.answered) return;
  const ans=message.content.trim().toLowerCase();
  if (!db.activeTriviaGame.answers.some(a=>ans.includes(a.toLowerCase()))) return;
  db.activeTriviaGame.answered=true;
  clearTimeout(db.activeTriviaGame.timeout);
  const pts=db.activeTriviaGame.points;
  const uid=message.author.id;
  if (!db.trivia[uid]) db.trivia[uid]={points:0,correct:0};
  db.trivia[uid].points+=pts; db.trivia[uid].correct+=1;
  await message.reply({embeds:[new EmbedBuilder().setColor(0x57F287).setTitle('🎉 إجابة صحيحة!').setDescription(`${message.author} حصل على **${pts} نقطة**!\nإجمالي: **${db.trivia[uid].points}**`)]});
  db.activeTriviaGame=null;
});

client.login(TOKEN);
