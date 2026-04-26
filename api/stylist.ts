// ============================================================
// Vercel Serverless Function — AI 搭配理由生成（阶段 3）
//
// 调用方式：POST /api/stylist
// Body: {
//   look: { items: [{category, subCategory, color, colorFamily}], styles: [...], occasion: '通勤' },
//   weather: { temp: number, condition?: string },
// }
//
// 返回: { comment: string }
//
// 环境变量（在 Vercel Settings → Environment Variables 配置）:
//   DASHSCOPE_API_KEY  —— 阿里云百炼 API key（推荐，便宜稳定）
//                         申请地址 https://bailian.console.aliyun.com/?apiKey=1#/api-key
//   OPENAI_API_KEY     —— 备选，如果想用 OpenAI 也可以
//
// 模型：qwen-plus（输入 0.8 元/百万 token，输出 2 元/百万 token，千次理由约 1 元）
// ============================================================

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

interface StylistRequest {
  look: {
    items: Array<{
      category: string;
      subCategory: string;
      color: string;
      colorFamily: string;
    }>;
    styles: string[];
    occasion: string;
  };
  weather: {
    temp: number;
    condition?: string;
  };
  stylePack?: {
    name: string;
    description?: string;
    keywords?: string[];
  } | null;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位深谙小红书穿搭语言的中文造型师。
- 用 1-2 句话点评一套搭配，60-90 字之间。
- 语气像穿搭博主：松弛、具体、有画面感，**不要套话不要空洞形容词**。
- 必须落到具体单品和颜色上，不要只说「整体协调」。
- 必须呼应当天的天气（温度/雨雪）和场合。
- 不要使用 emoji，不要分点，直接出文案。`;

function buildUserPrompt(req: StylistRequest): string {
  const itemsDesc = req.look.items
    .map((i) => `${i.subCategory}（${i.color}，${i.colorFamily}调）`)
    .join('、');
  const stylesDesc = req.look.styles.join('、') || '无特定风格';
  const tempDesc = `${req.weather.temp}°C`;
  const condDesc = req.weather.condition ? `，天气${req.weather.condition}` : '';
  const sp = req.stylePack;
  const styleHint = sp
    ? `\n用户指定今日风格为《${sp.name}》：${sp.description ?? ''}。关键词：${(sp.keywords ?? []).join('/')}。评论要明确体现这个风格的氛围感。`
    : '';

  return `今天搭配：${itemsDesc}。
风格标签：${stylesDesc}。
场合：${req.look.occasion}。
天气：${tempDesc}${condDesc}。${styleHint}

请用一位小红书博主的口吻给出 60-90 字的造型点评。`;
}

async function callQwen(apiKey: string, system: string, user: string): Promise<string> {
  const r = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Qwen ${r.status}: ${t}`);
  }
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Qwen');
  return String(content).trim();
}

async function callOpenAI(apiKey: string, system: string, user: string): Promise<string> {
  const r = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI ${r.status}: ${t}`);
  }
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return String(content).trim();
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const env = (globalThis as any).process?.env ?? {};
  const dashKey = env.DASHSCOPE_API_KEY ?? '';
  const openaiKey = env.OPENAI_API_KEY ?? '';

  if (!dashKey && !openaiKey) {
    return new Response(
      JSON.stringify({
        error: 'NO_API_KEY',
        message: '管理员未配置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。前端将使用本地模板。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: StylistRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (!body.look || !Array.isArray(body.look.items) || body.look.items.length === 0) {
    return new Response(JSON.stringify({ error: 'look.items required' }), { status: 400 });
  }

  const userPrompt = buildUserPrompt(body);

  try {
    let comment: string;
    if (dashKey) {
      // 优先国产
      comment = await callQwen(dashKey, SYSTEM_PROMPT, userPrompt);
    } else {
      comment = await callOpenAI(openaiKey, SYSTEM_PROMPT, userPrompt);
    }
    return new Response(
      JSON.stringify({ comment, source: dashKey ? 'qwen' : 'openai' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'LLM_ERROR', detail: String(err?.message ?? err) }),
      { status: 502 },
    );
  }
}
