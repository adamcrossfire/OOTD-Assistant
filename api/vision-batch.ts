// ============================================================
// Vercel Serverless Function — 截图批量识别多件衣物（Phase 1）
//
// 调用方式：POST /api/vision-batch
// Body: {
//   image: string,  // base64 dataURL（订单截图、商品列表截图等）
// }
//
// 返回: {
//   items: Array<{
//     category, subCategory, color, colorFamily, styles, season, confidence
//   }>,
//   source: 'qwen-vl' | 'openai',
// }
//
// 思路：
//   - 让多模态模型从 1 张订单/购物车截图里识别所有衣物商品
//   - 输出 JSON 数组，每件商品一条
//   - 失败时返回空数组（前端兜底为空状态）
// ============================================================

export const config = {
  runtime: 'edge',
  maxDuration: 45,
};

interface BatchRequest {
  image: string;
}

interface DetectionItem {
  category: 'top' | 'bottom' | 'outer' | 'dress' | 'shoes' | 'accessory';
  subCategory: string;
  color: string;
  colorFamily: 'warm' | 'cool' | 'neutral' | 'black' | 'white';
  styles: string[];
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  confidence: number;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位专业的时尚衣物识别 AI。用户上传的图片可能是电商 App（淘宝、京东、小红书）的订单截图、购物车截图、商品列表截图，画面里包含多件衣物商品。

请识别图中所有的衣物商品（鞋包配饰也算），严格按照以下 JSON 格式返回，不要包含任何其它文字：

{
  "items": [
    {
      "category": "top" | "bottom" | "outer" | "dress" | "shoes" | "accessory",
      "subCategory": "中文细分品类，如 'T恤'、'牛仔裤'、'西装外套'、'连衣裙'、'运动鞋'、'手提包'",
      "color": "#HEX 主色，如 #2c3e50",
      "colorFamily": "warm" | "cool" | "neutral" | "black" | "white",
      "styles": ["从这8个里选1-3个：minimal, japanese, y2k, oldmoney, street, sweet, cool, business"],
      "season": "spring" | "summer" | "autumn" | "winter" | "all",
      "confidence": 0.0-1.0
    }
  ]
}

注意：
- 只识别衣物 / 鞋 / 包 / 配饰，跳过非服饰商品（食品、家电等）
- 至少识别 1 件，最多识别 12 件
- category 严格按英文枚举返回
- subCategory 用简洁中文（2-6 字），不要写形容词
- color 必须是 6 位 HEX
- 跳过模糊不清或被严重遮挡的商品
- 只返回 JSON，不要 markdown 包裹，不要解释说明`;

async function callQwenVL(apiKey: string, dataUrl: string): Promise<string> {
  const r = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: '请识别这张截图里所有的衣物商品。' },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Qwen-VL ${r.status}: ${t}`);
  }
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Qwen-VL');
  return String(content).trim();
}

async function callOpenAIVision(apiKey: string, dataUrl: string): Promise<string> {
  const r = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: '请识别这张截图里所有的衣物商品。' },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
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

function extractJson(raw: string): any {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

const VALID_CATEGORIES = new Set(['top', 'bottom', 'outer', 'dress', 'shoes', 'accessory']);
const VALID_FAMILIES = new Set(['warm', 'cool', 'neutral', 'black', 'white']);
const VALID_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter', 'all']);
const VALID_STYLES = new Set([
  'minimal', 'japanese', 'y2k', 'oldmoney', 'street', 'sweet', 'cool', 'business',
]);

function normalize(parsed: any): DetectionItem {
  const category = VALID_CATEGORIES.has(parsed.category) ? parsed.category : 'top';
  const colorFamily = VALID_FAMILIES.has(parsed.colorFamily) ? parsed.colorFamily : 'neutral';
  const season = VALID_SEASONS.has(parsed.season) ? parsed.season : 'all';
  const stylesRaw: string[] = Array.isArray(parsed.styles) ? parsed.styles : [];
  const styles = stylesRaw.filter((s) => VALID_STYLES.has(s)).slice(0, 3);
  if (styles.length === 0) styles.push('minimal');

  let color = String(parsed.color ?? '#888888');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) color = '#888888';

  const subCategory = String(parsed.subCategory ?? '单品').slice(0, 12);
  const confidenceRaw = Number(parsed.confidence);
  const confidence =
    isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1 ? confidenceRaw : 0.85;

  return { category, subCategory, color, colorFamily, styles, season, confidence };
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
        message: '管理员未配置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: BatchRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (!body.image || !body.image.startsWith('data:image/')) {
    return new Response(JSON.stringify({ error: 'image dataURL required' }), { status: 400 });
  }

  try {
    const raw = dashKey
      ? await callQwenVL(dashKey, body.image)
      : await callOpenAIVision(openaiKey, body.image);

    const parsed = extractJson(raw);
    const itemsRaw: any[] = Array.isArray(parsed.items) ? parsed.items : [];
    const items = itemsRaw.slice(0, 12).map(normalize);

    return new Response(
      JSON.stringify({ items, source: dashKey ? 'qwen-vl' : 'openai' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'VISION_BATCH_ERROR', detail: String(err?.message ?? err) }),
      { status: 502 },
    );
  }
}
