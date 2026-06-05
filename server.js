const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: config.channelAccessToken,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
const userState = {};

const MAIN_MENU = `🔧 เลือก workflow:\n\n1. ทำเอกสารบัญชี\n2. ทำข้อมูลสินค้า SLTS\n3. ทำสต็อกสินค้าห้าง\n4. ทำสต็อกสินค้าบริษัท\n\nพิมพ์เลข หรือ "0" ออก`;
const MENU_BANCHEE = `📊 เอกสารบัญชี:\n\n1. SH AUTO\n2. SH VERIFY\n3. LZ VERIFY\n4. TAX REPORT\n\nพิมพ์เลข หรือ "0" กลับ`;

const SYSTEM_PROMPTS = {
  'SH AUTO': 'คุณเป็นผู้ช่วยตรวจสอบข้อมูลบัญชีจาก Shopee วิเคราะห์และสรุปผลเป็นภาษาไทย',
  'SH VERIFY': 'คุณเป็นผู้ช่วยตรวจสอบใบเสร็จและใบสรุปของ Shopee ว่าตรงกันหรือมีรายการขาดหาย',
  'LZ VERIFY': 'คุณเป็นผู้ช่วยตรวจสอบใบเสร็จและใบสรุปของ Lazada ว่าตรงกันหรือมีรายการขาดหาย',
  'TAX REPORT': 'คุณเป็นผู้ช่วยสรุปยอดขายสำหรับส่งสรรพากร สรุปเป็นรายงานที่ชัดเจน'
};

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

    if (text === '1212312121') {
      userState[userId] = { mode: 'main' };
      return reply(replyToken, MAIN_MENU);
    }

    if (text === '0') {
      if (state?.mode === 'sub1') {
        userState[userId] = { mode: 'main' };
        return reply(replyToken, MAIN_MENU);
      }
      if (state?.mode === 'working') {
        userState[userId] = { mode: 'sub1' };
        return reply(replyToken, MENU_BANCHEE);
      }
      delete userState[userId];
      return reply(replyToken, '✅ ออกจากโหมดงานแล้ว');
    }

    if (state?.mode === 'main') {
      if (text === '1') {
        userState[userId] = { mode: 'sub1' };
        return reply(replyToken, MENU_BANCHEE);
      }
      return reply(replyToken, '🚧 กำลังพัฒนา...');
    }

    if (state?.mode === 'sub1') {
      const wf = { '1':'SH AUTO', '2':'SH VERIFY', '3':'LZ VERIFY', '4':'TAX REPORT' };
      if (wf[text]) {
        userState[userId] = { mode: 'working', workflow: wf[text], history: [] };
        return reply(replyToken, `✅ เข้าโหมด ${wf[text]}\n\nส่งไฟล์มาได้เลย\nพิมพ์ "0" กลับเมนู`);
      }
    }

    if (state?.mode === 'working') {
      state.history.push({ role: 'user', content: text });
      const response = await callClaude(state.workflow, state.history);
      state.history.push({ role: 'assistant', content: response });
      return reply(replyToken, response);
    }

    return reply(replyToken, 'ขอบคุณที่ติดต่อ HOFFMANN COFFEE\nเราจะรีบตอบกลับโดยเร็ว 🙏');
  }

  if ((message.type === 'file' || message.type === 'image') && state?.mode === 'working') {
    await reply(replyToken, `⏳ ได้รับไฟล์\nกำลังวิเคราะห์...`);
    try {
      const fileContent = await blobClient.getMessageContent(message.id);
      const chunks = [];
      for await (const chunk of fileContent) chunks.push(chunk);
      const base64 = Buffer.concat(chunks).toString('base64');
      const mediaType = message.type === 'image' ? 'image/jpeg' : 'application/pdf';

      const userMessage = {
        role: 'user',
        content: [
          { type: message.type === 'image' ? 'image' : 'document', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `วิเคราะห์ไฟล์นี้สำหรับ workflow: ${state.workflow}` }
        ]
      };

      state.history.push(userMessage);
      const response = await callClaude(state.workflow, state.history);
      state.history.push({ role: 'assistant', content: response });

      await client.pushMessage({ to: userId, messages: [{ type: 'text', text: response }] });
    } catch (err) {
      await client.pushMessage({ to: userId, messages: [{ type: 'text', text: `❌ Error: ${err.message}` }] });
    }
  }
}

async function callClaude(workflow, history) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: SYSTEM_PROMPTS[workflow] || 'คุณเป็นผู้ช่วยวิเคราะห์ข้อมูล',
    messages: history
  });
  return response.content[0].text;
}

async function reply(replyToken, text) {
  return client.replyMessage({ replyToken, messages: [{ type: 'text', text }] });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
