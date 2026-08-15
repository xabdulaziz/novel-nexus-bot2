// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// welcome.js — الترحيب + الرتبة التلقائية
// (مدمج مع autorole.js)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { EmbedBuilder } = require('discord.js');

const GUILD_NAME  = process.env.GUILD_NAME  || 'T.G.W';
const SERVER_NAME = process.env.SERVER_NAME || 'T.G.W';

function setupWelcome(client) {
  // ── عند انضمام عضو جديد ──
  client.on('guildMemberAdd', async (member) => {
    if (member.guild.name !== GUILD_NAME || member.user.bot) return;

    // ➕ رتبة Member تلقائية (من autorole.js)
    const memberRole = member.guild.roles.cache.find(r => r.name === '📚 Member');
    if (memberRole) {
      await member.roles.add(memberRole).catch(() => {});
    }

    // 💬 رسالة ترحيب
    const welcomeCh = member.guild.channels.cache.find(
      c => c.name.toLowerCase().includes('welcome')
    );
    if (!welcomeCh) return;

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`✦ مرحباً بك في ${SERVER_NAME} ✦`)
      .setDescription([
        `> *"A reader lives a thousand lives before he dies."*`,
        `> — **George R.R. Martin**`,
        '',
        `مرحباً ${member}! 🎉`,
        `أنت العضو رقم **${member.guild.memberCount}** في مجتمعنا!`,
        '',
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        '',
        `**🚀 ابدأ رحلتك:**`,
        `> 📜 اقرأ القوانين`,
        `> 🎭 احصل على رتبتك`,
        `> 🌐 اختار مجتمعك اللغوي`,
        `> 👤 عرّف بنفسك`,
        '',
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ].join('\n'))
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 العضو', value: `${member.user.tag}`, inline: true },
        { name: '📅 انضم', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '📆 حساب منذ', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: `${SERVER_NAME} • مجتمع القراء والكتّاب | عضو #${member.guild.memberCount}` })
      .setTimestamp();

    await welcomeCh.send({ content: `${member}`, embeds: [embed] });
    console.log(`👋 رحّبنا بـ ${member.user.tag}`);
  });

  // ── عند مغادرة عضو ──
  client.on('guildMemberRemove', async (member) => {
    if (member.guild.name !== GUILD_NAME) return;

    const welcomeCh = member.guild.channels.cache.find(
      c => c.name.toLowerCase().includes('welcome')
    );
    if (!welcomeCh) return;

    const embed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setDescription(`👋 **${member.user.tag}** غادر السيرفر. نتمنى نراه مرة ثانية! 📚`)
      .setTimestamp();

    await welcomeCh.send({ embeds: [embed] });
  });
}

module.exports = { setupWelcome };
