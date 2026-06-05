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
const userState = {};

const MAIN_MENU = `🔧 เลือก workflow:\n\n1. ทำเอกสารบัญชี\n2. ทำข้อมูลสินค้า SLTS\n3. ทำสต็อกสินค้าห้าง\n4. ทำสต็อกสินค้าบริษัท\n\nพิมพ์เลข หรือ "0" ออก`;

const MENU_BANCHEE = `📊 เอกสารบัญชี:\n\n1. SH AUTO\n2. SH VERIFY\n3. LZ VERIFY\n4. TAX REPORT\n\nพิมพ์เลข หรือ "0" กลับ`;

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(event => {
    if (event.type === 'message') return handleMessage(event);
  }));
  res.json({ status: 'ok' });
});

async function handleMessage(event) {
  const { message, replyToken, source } = event;
  const userId = source.userId;
  const state = userState[userId];

  if (message.type === 'text') {
    const text = message.text.trim();

    // Activate
    if (text === '1212312121') {
      userState[userId] = { mode: 'main' };
      return reply(replyToken, MAIN_MENU);
    }

    // Back / Exit
    if (text === '0') {
      if (state?.mode === 'sub1') {
        userState[userId] = { mode: 'main' };
        return reply(replyToken, MAIN_MENU);
      }
      delete userState[userId];
      return reply(replyToken, '✅ ออกจากโหมดงานแล้ว');
    }

    // Main menu
    if (state?.mode === 'main') {
      if (text === '1') {
        userState[userId] = { mode: 'sub1' };
        return reply(replyToken, MENU_BANCHEE);
      }
      return reply(replyToken, '🚧 กำลังพัฒนา...');
    }

    // Sub menu บัญชี
    if (state?.mode === 'sub1') {
      const wf = { '1':'SH AUTO', '2':'SH VERIFY', '3':'LZ VERIFY', '4':'TAX REPORT' };
      if (wf[text]) {
        userState[userId] = { mode: 'working', workflow: wf[text] };
        return reply(replyToken, `✅ เข้าโหมด ${wf[text]}\n\nส่งไฟล์มาได้เลย\nพิมพ์ "0" กลับเมนู`);
      }
    }

    // Working mode
    if (state?.mode === 'working') {
      return reply(replyToken, `⚙️ โหมด: ${state.workflow}\nส่งไฟล์มาได้เลย\nพิมพ์ "0" กลับเมนู`);
    }

    // Customer mode
    return reply(replyToken, 'ขอบคุณที่ติดต่อ HOFFMANN COFFEE\nเราจะรีบตอบกลับโดยเร็ว 🙏');
  }

  // File received
  if (message.type === 'file' && state?.mode === 'working') {
    return reply(replyToken, `✅ ได้รับไฟล์\n📄 ${message.fileName}\n📏 ${(message.fileSize/1024).toFixed(1)} KB\n\n🔄 กำลังประมวลผล...`);
  }
}

async function reply(replyToken, text) {
  return client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
