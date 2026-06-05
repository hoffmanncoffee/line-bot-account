const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const app = express();

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(event => {
    if (event.type === 'message') {
      return handleMessage(event);
    }
  }));
  res.json({ status: 'ok' });
});

async function handleMessage(event) {
  const { message, replyToken } = event;
  if (message.type === 'file') {
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: `✅ ได้รับไฟล์!\n📄 ชื่อ: ${message.fileName}\n📏 ขนาด: ${(message.fileSize/1024).toFixed(1)} KB` }]
    });
  } else if (message.type === 'image') {
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: '✅ ได้รับรูปภาพ!' }]
    });
  } else if (message.type === 'text') {
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: `ได้รับ: "${message.text}"\n\nส่งไฟล์มาได้เลย!` }]
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
