// app.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const fs = require('fs');  // ✅ 新增，用来读取 JSON

const app = express();
const port = process.env.PORT || 3000;

// 从环境变量读取 Twilio 配置
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// 短期记忆
let shortTermMemory = [];

// 长期记忆
let userName = null;
let userCompany = null;
let userCity = null;
let userPreference = null;

// ✅ 读取 FAQ 文件
let faq = {};
try {
  faq = JSON.parse(fs.readFileSync('faq.json', 'utf8'));
} catch (err) {
  console.error("⚠️ Could not load faq.json:", err);
}

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/whatsapp', (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body || '';
  const lowerMsg = incomingMsg.toLowerCase();
  let reply = '';

  // === FAQ 逻辑 ===
  if (faq[lowerMsg]) {
    reply = faq[lowerMsg];

  // === 长期记忆逻辑 ===
  } else if (lowerMsg.startsWith("my name is")) {
    userName = incomingMsg.substring(10).trim();
    reply = `👌 Nice to meet you, ${userName}! I'll remember your name.`;

  } else if (lowerMsg.includes("what is my name")) {
    reply = userName ? `🧠 Your name is ${userName}.` : "❓ I don't know your name yet.";

  } else if (lowerMsg.startsWith("i work at")) {
    userCompany = incomingMsg.substring(10).trim();
    reply = `💼 Got it, you work at ${userCompany}.`;

  } else if (lowerMsg.includes("what company")) {
    reply = userCompany ? `🧠 You work at ${userCompany}.` : "❓ I don't know your company yet.";

  } else if (lowerMsg.startsWith("i live in")) {
    userCity = incomingMsg.substring(10).trim();
    reply = `📍 Okay, you live in ${userCity}.`;

  } else if (lowerMsg.includes("where do i live")) {
    reply = userCity ? `🧠 You live in ${userCity}.` : "❓ I don't know where you live yet.";

  } else if (lowerMsg.startsWith("i like")) {
    userPreference = incomingMsg.substring(6).trim();
    reply = `⭐ Nice! I'll remember that you like ${userPreference}.`;

  } else if (lowerMsg.includes("what do i like")) {
    reply = userPreference ? `🧠 You like ${userPreference}.` : "❓ I don't know your preference yet.";

  } else if (lowerMsg.includes("forget my name")) {
    userName = null;
    reply = "🧹 I've forgotten your name.";

  } else if (lowerMsg.includes("forget company")) {
    userCompany = null;
    reply = "🧹 I've forgotten your company.";

  } else if (lowerMsg.includes("forget city")) {
    userCity = null;
    reply = "🧹 I've forgotten your city.";

  } else if (lowerMsg.includes("forget preference")) {
    userPreference = null;
    reply = "🧹 I've forgotten your preference.";

  // === 其他逻辑 ===
  } else if (lowerMsg.includes("help")) {
    reply = "ℹ️ You can ask about 'price', 'catalog', 'delivery', 'support' or introduce yourself.";

  } else {
    reply = `You said: "${incomingMsg}"\n\nI am your Render-deployed Twilio bot 🚀`;
  }

  // 保存到短期记忆
  shortTermMemory.push({ role: 'user', msg: incomingMsg });
  shortTermMemory.push({ role: 'bot', msg: reply });
  if (shortTermMemory.length > 10) {
    shortTermMemory.shift();
    shortTermMemory.shift();
  }

  twiml.message(reply);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
