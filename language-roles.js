const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.TOKEN; 

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ]
});;

// الرتب وإعداداتها
const LANGUAGE_ROLES = [
  {
    name: '🇨🇳 Chinese Novel Reader',
    emoji: '🇨🇳',
    label: 'Chinese Novels',
    description: 'روايات صينية | Wuxia, Xianxia, Xuanhuan',
    style: ButtonStyle.Danger, // أحمر
  },
  {
    name: '🇯🇵 Japanese Novel Reader',
    emoji: '🇯🇵',
    label: 'Japanese Novels',
    description: 'روايات يابانية | Light Novel, Manga, Isekai',
    style: ButtonStyle.Primary, // أزرق
  },
  {
    name: '🇰🇷 Korean Novel Reader',
    emoji: '🇰🇷',
    label: 'Korean Novels',
    description: 'روايات كورية | Manhwa, Web Novel',
    style: ButtonStyle.Success, // أخضر
  },
  {
    name: '🇸🇦 Arabic Novel Reader',
    emoji: '🇸🇦',
    label: 'Arabic Novels',
    description: 'روايات عربية | قصص، أدب عربي',
    style: ButtonStyle.Secondary, // رمادي
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// عند تشغيل البوت — يرسل رسالة الرتب
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.once('clientReady', async () => {
  console.log(`✅ البوت شغّال: ${client.user.tag}`);

  const guild = client.guilds.cache.find(g => g.name === 'T.G.W');
  if (!guild) { console.log('❌ ما لقيت السيرفر!'); process.exit(1); }
  console.log(`🏠 السيرفر: ${guild.name}\n`);

  // ابحث عن قناة language-roles
  const langCh = guild.channels.cache.find(c => c.name.toLowerCase().includes('language-roles'));
  if (!langCh) { console.log('❌ ما لقيت قناة language-roles!'); process.exit(1); }

  // احذف الرسائل القديمة
  await langCh.bulkDelete(10).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  // الإيمبيد الرئيسي
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🌍 اختر مجتمعك اللغوي')
    .setDescription([
      '> اختر الرتبة اللغوية المناسبة لتصل إلى',
      '> قنوات المجتمع الخاصة بك!',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🇨🇳 **Chinese Novels**',
      '> Wuxia • Xianxia • Xuanhuan • Manhua',
      '',
      '🇯🇵 **Japanese Novels**',
      '> Light Novel • Isekai • Manga • Webcomic',
      '',
      '🇰🇷 **Korean Novels**',
      '> Manhwa • Web Novel • Korean Fantasy',
      '',
      '🇸🇦 **Arabic Novels**',
      '> روايات عربية • أدب • قصص',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '✅ يمكنك اختيار **أكثر من رتبة** في نفس الوقت',
      '❌ اضغط على الزر مرة ثانية **لإلغاء** الرتبة',
    ].join('\n'))
    .setFooter({ text: 'Novel Nexus • Language Communities' })
    .setTimestamp();

  // أزرار الرتب — صف واحد لكل زرين
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lang_cn')
      .setLabel('🇨🇳 Chinese Novels')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('lang_jp')
      .setLabel('🇯🇵 Japanese Novels')
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lang_kr')
      .setLabel('🇰🇷 Korean Novels')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('lang_ar')
      .setLabel('🇸🇦 Arabic Novels')
      .setStyle(ButtonStyle.Secondary),
  );

  await langCh.send({ embeds: [embed], components: [row1, row2] });
  console.log('✅ رسالة الرتب أُرسلت في #language-roles!\n');
  console.log('🔄 البوت شغّال ومنتظر تفاعل الأعضاء...');
  console.log('⚠️  لا تغلق هذه النافذة — البوت يحتاج يكون شغّالاً دائماً');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// عند الضغط على زر
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // خريطة الأزرار والرتب
  const roleMap = {
    'lang_cn': '🇨🇳 Chinese Novel Reader',
    'lang_jp': '🇯🇵 Japanese Novel Reader',
    'lang_kr': '🇰🇷 Korean Novel Reader',
    'lang_ar': '🇸🇦 Arabic Novel Reader',
  };

  const roleName = roleMap[interaction.customId];
  if (!roleName) return;

  await interaction.deferReply({ ephemeral: true });

  const guild   = interaction.guild;
  const member  = interaction.member;

  // ابحث عن الرتبة
  const role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    return interaction.editReply({
      content: '❌ ما لقيت الرتبة! تواصل مع الإدارة.',
    });
  }

  // تحقق هل عنده الرتبة أو لا
  const hasRole = member.roles.cache.has(role.id);

  try {
    if (hasRole) {
      // عنده الرتبة — اسحبها
      await member.roles.remove(role);
      await interaction.editReply({
        content: `✅ تم إزالة رتبة **${roleName}** منك!\nلن تعود ترى قنوات هذا المجتمع.`,
      });
      console.log(`➖ ${member.user.tag} أزال رتبة: ${roleName}`);
    } else {
      // ما عنده الرتبة — أضفها
      await member.roles.add(role);
      await interaction.editReply({
        content: `🎉 حصلت على رتبة **${roleName}**!\nتحقق من القنوات الجديدة اللي ظهرت لك 👀`,
      });
      console.log(`➕ ${member.user.tag} حصل على رتبة: ${roleName}`);
    }
  } catch (err) {
    console.error('خطأ:', err.message);
    await interaction.editReply({
      content: '❌ صار خطأ! تأكد إن البوت عنده صلاحية Manage Roles وإن رتبته فوق رتبة الأعضاء.',
    });
  }
});

client.login(TOKEN);
