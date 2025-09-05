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

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook 路径
app.post('/whatsapp', (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse; // ✅ 正确导入方式
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body || '';

  // 把用户输入存入短期记忆
  shortTermMemory.push({ role: 'user', msg: incomingMsg });
  // 保留最近 5 条
  if (shortTermMemory.length > 5) {
    shortTermMemory.shift();
  }

  // 简单逻辑分支
  let reply = '';
  if (incomingMsg.toLowerCase().includes('hello')) {
    reply = '👋 Hi! I remember you said hello!';
  } else if (incomingMsg.toLowerCase().includes('memory')) {
    // 查看记忆
    reply = '🧠 Here is what I remember so far:\n' +
      shortTermMemory.map(m => `${m.role}: ${m.msg}`).join('\n');
  } else {
    reply = `You said: "${incomingMsg}"\n\n(Recent context: ${shortTermMemory.length} msgs stored)`;
  }

  // 把 Bot 回复存入记忆
  shortTermMemory.push({ role: 'bot', msg: reply });
  if (shortTermMemory.length > 5) {
    shortTermMemory.shift();
  }

  twiml.message(reply);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
