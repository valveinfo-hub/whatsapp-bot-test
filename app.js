// app.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse; // ✅ 正确导入
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Twilio 配置
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// 短期记忆
let shortTermMemory = [];

// 长期记忆（从 memory.json 读取）
let memory = {
  userName: null,
  userCompany: null,
  userCity: null,
  userPreference: null
};
try {
  const data = fs.readFileSync('memory.json', 'utf8');
  memory = JSON.parse(data);
  console.log("✅ Memory loaded:", memory);
} catch (err) {
  console.error("⚠️ Could not load memory.json, using defaults.");
}

// FAQ（从 faq.json 读取）
let faq = {};
try {
  faq = JSON.parse(fs.readFileSync('faq.json', 'utf8'));
} catch (err) {
  console.error("⚠️ Could not load faq.json:", err);
}

// 拼写纠正表
const typoMap = {
  "prise": "price",
  "prize": "price",
  "catelog": "catalog",
  "catalouge": "catalog",
  "delievery": "delivery",
  "dilivery": "delivery"
};

// 模糊匹配
function findClosestMatch(input, faqKeys) {
  input = input.toLowerCase();
  if (typoMap[input]) return typoMap[input];

  let bestMatch = null;
  let bestDistance = Infinity;
  for (const key of faqKeys) {
    let distance = levenshtein(input, key);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = key;
    }
  }
  return bestDistance <= 2 ? bestMatch : null;
}

// Levenshtein 距离
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

// 保存 memory.json
function saveMemory() {
  try {
    fs.writeFileSync('memory.json', JSON.stringify(memory, null, 2));
    console.log("💾 Memory saved:", memory);
  } catch (err) {
    console.error("❌ Failed to save memory.json:", err);
  }
}

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/whatsapp', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body || '';
  // ✅ 去掉常见标点符号，避免匹配失败
  const lowerMsg = incomingMsg.toLowerCase().replace(/[?.!,:;]+/g, '').trim();
  let reply = '';

  // === FAQ ===
  let faqKeys = Object.keys(faq);
  let matchedKey = faq[lowerMsg] ? lowerMsg : findClosestMatch(lowerMsg, faqKeys);
  if (matchedKey && faq[matchedKey]) {
    reply = faq[matchedKey];

  // === 持久化记忆 ===
  } else if (lowerMsg.startsWith("my name is")) {
    memory.userName = incomingMsg.substring(10).trim();
    saveMemory();
    reply = `👌 Nice to meet you, ${memory.userName}! I'll remember your name.`;

  } else if (lowerMsg.includes("what is my name")) {
    reply = memory.userName ? `🧠 Your name is ${memory.userName}.` : "❓ I don't know your name yet.";

  } else if (lowerMsg.startsWith("i work at")) {
    memory.userCompany = incomingMsg.substring(10).trim();
    saveMemory();
    reply = `💼 Got it, you work at ${memory.userCompany}.`;

  } else if (lowerMsg.includes("what company")) {
    reply = memory.userCompany ? `🧠 You work at ${memory.userCompany}.` : "❓ I don't know your company yet.";

  } else if (lowerMsg.startsWith("i live in")) {
    memory.userCity = incomingMsg.substring(10).trim();
    saveMemory();
    reply = `📍 Okay, you live in ${memory.userCity}.`;

  } else if (lowerMsg.includes("where do i live")) {
    reply = memory.userCity ? `🧠 You live in ${memory.userCity}.` : "❓ I don't know where you live yet.";

  } else if (lowerMsg.startsWith("i like")) {
    memory.userPreference = incomingMsg.substring(6).trim();
    saveMemory();
    reply = `⭐ Nice! I'll remember that you like ${memory.userPreference}.`;

  } else if (lowerMsg.includes("what do i like")) {
    reply = memory.userPreference ? `🧠 You like ${memory.userPreference}.` : "❓ I don't know your preference yet.";

  } else if (lowerMsg.includes("forget my name")) {
    memory.userName = null;
    saveMemory();
    reply = "🧹 I've forgotten your name.";

  } else if (lowerMsg.includes("forget company")) {
    memory.userCompany = null;
    saveMemory();
    reply = "🧹 I've forgotten your company.";

  } else if (lowerMsg.includes("forget city")) {
    memory.userCity = null;
    saveMemory();
    reply = "🧹 I've forgotten your city.";

  } else if (lowerMsg.includes("forget preference")) {
    memory.userPreference = null;
    saveMemory();
    reply = "🧹 I've forgotten your preference.";

  // === 其他逻辑 ===
  } else if (lowerMsg.includes("help")) {
    reply = "ℹ️ You can ask about 'price', 'catalog', 'delivery', 'support' or introduce yourself.";

  } else {
    reply = `You said: "${incomingMsg}"\n\nI am your Render-deployed Twilio bot 🚀`;
  }

  // 短期记忆
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



