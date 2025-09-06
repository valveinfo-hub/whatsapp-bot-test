// app.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const fs = require('fs');

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

// ✅ 拼写错误映射表
const typoMap = {
  "prise": "price",
  "prize": "price",
  "catelog": "catalog",
  "catalouge": "catalog",
  "delievery": "delivery",
  "dilivery": "delivery"
};

// ✅ 简单模糊匹配函数
function findClosestMatch(input, faqKeys) {
  input = input.toLowerCase();

  // 先检查是否在 typoMap 里
  if (typoMap[input]) {
    return typoMap[input];
  }

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const key of faqKeys) {
    let distance = levenshtein(input, key);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = key;
    }
  }
  // 允许容错距离 2
  return bestDistance <= 2 ? bestMatch : null;
}

// ✅ Levenshtein 距离算法
function levenshtein(a, b) {
  const matrix = [];
  const lenA = a.length;
  const lenB = b.length;

  for (let i = 0; i <= lenB; i++) matrix[i] = [i];
  for (let j = 0; j <= lenA; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenB; i++) {
    for (let j = 1; j <= lenA; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[lenB][lenA];
}

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/whatsapp', (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body || '';
  const lowerMsg = incomingMsg.toLowerCase();
  let reply = '';

  // === FAQ 逻辑（支持拼写纠正 + 模糊匹配） ===
  let faqKeys = Object.keys(faq);
  let matchedKey = faq[lowerMsg] ? lowerMsg : findClosestMatch(lowerMsg, faqKeys);
  if (matchedKey && faq[matchedKey]) {
    reply = faq[matchedKey];

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
