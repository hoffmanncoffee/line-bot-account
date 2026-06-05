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
  'SH VERI
