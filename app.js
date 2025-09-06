// app.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// 从环境变量读取 Twilio 配置
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// 短期记忆存储（只保存最近 5 条对话）
let shortTermMemory = [];

// 长期变量记忆
let userName = null;
let userCompany = null;
let userCity = null;
let userPreference = null;

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook 路径
app.post('/whatsapp', (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body || '';
  let reply = '';

  // === 长期记忆逻辑 ===
  if (incomingMsg.toLowerCase().startsWith("my name is")) {
    userName = incomingMsg.substring(10).trim();
    reply = `👌 Nice to meet you, ${userName}! I'll remember your name.`;

  } else if (incomingMsg.toLowerCase().includes("what is my name")) {
    reply = userName ? `🧠 Your name is ${userName}.` : "❓ I don't know your name yet.";

  } else if (incomingMsg.toLowerCase().startsWith("i work at")) {
    userCompany = incomingMsg.substring(10).trim();
    reply = `💼 Got it, you work at ${userCompany}.`;

  } else if (incomingMsg.toLowerCase().includes("what company")) {
    reply = userCompany ? `🧠 You work at ${userCompany}.` : "❓ I don't know your company yet.";

  } else if (incomingMsg.toLowerCase().startsWith("i live in")) {
    userCity = incomingMsg.substring(10).trim();
    reply = `📍 Okay, you live in ${userCity}.`;

  } else if (incomingMsg.toLowerCase().includes("where do i live")) {
    reply = userCity ? `🧠 You live in ${userCity}.` : "❓ I don't know where you live yet.";

  } else if (incomingMsg.toLowerCase().startsWith("i like")) {
    userPreference = incomingMsg.substring(6).trim();
    reply = `⭐ Nice! I'll remember that you like ${userPreference}.`;

  } else if (incomingMsg.toLowerCase().includes("what do i like")) {
    reply = userPreference ? `🧠 You like ${userPreference}.` : "❓ I don't know your preference yet.";

  } else if (incomingMsg.toLowerCase().includes("forget my name")) {
    userName = null;
    reply = "🧹 I've forgotten your name.";

  } else if (incomingMsg.toLowerCase().includes("forget company")) {
    userCompany = null;
    reply = "🧹 I've forgotten your company.";

  } else if (incomingMsg.toLowerCase().includes("forget city")) {
    userCity = null;
    reply = "🧹 I've forgotten your city.";

  } else if (incomingMsg.toLowerCase().includes("forget preference")) {
    userPreference = null;
    reply = "🧹 I've forgotten your preference.";

  // === FAQ 逻辑 ===
  } else if (incomingMsg.toLowerCase().includes('price')) {
    reply = "💲 Our pricing depends on the product type. Please contact sales at sales@alwayflow.com for a quote.";

  } else if (incomingMsg.toLowerCase().includes('catalog')) {
    reply = "📘 Here is our product catalog: https://example.com/catalog";

  } else if (incomingMsg.toLowerCase().includes('delivery')) {
    reply = "🚚 Standard delivery time is 7–10 business days, depending on location.";

  // === 其他逻辑 ===
  } else if (incomingMsg.toLowerCase().includes('hello')) {
    reply = `👋 Hi! I remember you said hello!`;

  } else if (incomingMsg.toLowerCase().includes('help')) {
    reply = `ℹ️ You can introduce yourself ("My name is..."), company ("I work at..."), city ("I live in..."), or preference ("I like...").\nYou can also type "catalog", "price", or "delivery" to get quick info.`;

  } else if (incomingMsg.toLowerCase().includes('memory')) {
    let memoryDump = shortTermMemory.map(m => `${m.role}: ${m.msg}`).join('\n');
    reply = `🧠 Here is what I remember so far:\n${memoryDump || "(empty)"}`;

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

  // 返回回复
  twiml.message(reply);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
