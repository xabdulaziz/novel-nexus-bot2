// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// shared-db.js — قاعدة بيانات مشتركة
// يستخدمها server.js و mega-bot-v2.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const db = {
  warnings:  {},  // { userId: [{reason,by,byId,time,removed,removedBy,removedTime}] }
  blacklist: [],  // [{ type,targetId,name,scope,channelId,addedAt }]
  accessLogs:[],  // سجل دخول الداشبورد
  actionLogs:[],  // سجل التعديلات
  ipLogs:    [],  // سجل الـ IPs
  modLogs:   [],  // سجل الإدارة
  books:     {},  // { userId: [{title,date}] }
  wordCount: {},  // { userId: {today,total,goal} }
  sprints:   {},  // { channelId: {active,endTime,participants} }
  awards:    {},  // { userId: {reads,words} }
  trivia:    {},  // { userId: {points,correct} }
  activeTriviaGame: null,
};

const addActionLog = (action, details, ip) => {
  const entry = { time: new Date().toISOString(), action, details, ip };
  db.actionLogs.unshift(entry);
  db.ipLogs.unshift({ time: entry.time, ip, action, details });
  if (db.actionLogs.length > 200) db.actionLogs.pop();
  if (db.ipLogs.length > 200) db.ipLogs.pop();
};

const addModLog = (type, target, reason, by) => {
  db.modLogs.unshift({ time: new Date().toISOString(), type, target, reason, by });
  if (db.modLogs.length > 200) db.modLogs.pop();
};

module.exports = { db, addActionLog, addModLog };
