import 'dotenv/config';
import OpenAI from 'openai';

// OpenAI SDK를 쓰되 baseURL만 Upstage로 지정
const client = new OpenAI({
  apiKey: process.env.UPSTAGE_API_KEY,
  baseURL: 'https://api.upstage.ai/v1',
});

async function main() {
  const res = await client.chat.completions.create({
    model: 'solar-pro2',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: '안녕, Solar Pro 2!' },
    ],
  });

  console.log(res.choices[0].message.content);
}

main().catch(err => {
  console.error('API 호출 실패:', err?.response?.data || err);
});
