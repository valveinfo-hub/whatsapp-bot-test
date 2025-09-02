const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

// 从环境变量读取 Twilio 配置
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook 路径
app.post('/whatsapp', (req, res) => {
  const twiml = new MessagingResponse();

  const incomingMsg = req.body.Body || '';

  if (incomingMsg.toLowerCase().includes('hello')) {
    twiml.message('👋 Hi! Thanks for messaging our WhatsApp bot on Render!');
  } else if (incomingMsg.toLowerCase().includes('help')) {
    twiml.message('ℹ️ You can type "hello" to get a greeting, or just chat with me!');
  } else if (incomingMsg.toLowerCase().includes('send')) {
    // 示例：主动发送一条消息
    twilioClient.messages
      .create({
        from: 'whatsapp:+14155238886', // Twilio Sandbox号码
        to: req.body.From,             // 用户号码
        body: '📩 This is an active message sent using Twilio API!'
      })
      .then(message => console.log(`主动消息已发送: ${message.sid}`))
      .catch(err => console.error(err));

    twiml.message('✅ I have sent you an active WhatsApp message!');
  } else {
    twiml.message(`You said: "${incomingMsg}"\n\nI am your Render-deployed Twilio bot 🚀`);
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
