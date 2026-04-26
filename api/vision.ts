// ============================================================
// Vercel Serverless Function — AI 衣物图像识别（阶段 4）
//
// 调用方式：POST /api/vision
// Body: {
//   image: string,  // base64 dataURL，例如 "data:image/jpeg;base64,..."
// }
//
// 返回: {
//   category, subCategory, color, colorFamily, styles, season, confidence
// }
//
// 环境变量：
//   DASHSCOPE_API_KEY  —— 阿里云百炼 API key（推荐，用 qwen-vl-plus）
//   OPENAI_API_KEY     —— 备选，用 gpt-4o-mini（也支持视觉）
//
// 模型：qwen-vl-plus（多模态，对中文衣物语义识别准确）
// ============================================================

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

interface VisionRequest {
  image: string; // dataURL
}

interface DetectionResult {
  category: 'top' | 'bottom' | 'outer' | 'dress' | 'shoes' | 'accessory';
  subCategory: string;
  color: string; // HEX
  colorFamily: 'warm' | 'cool' | 'neutral' | 'black' | 'white';
  styles: string[];
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
  confidence: number;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位专业的时尚衣物识别 AI。用户上传一张衣物照片，你需要严格按照如下 JSON 格式返回识别结果，不要包含任何其它文字：

{
  "category": "top" | "bottom" | "outer" | "dress" | "shoes" | "accessory",
  "subCategory": "中文细分品类，如 'T恤'、'牛仔裤'、'西装外套'、'连衣裙'、'运动鞋'",
  "color": "#HEX 主色，如 #2c3e50",
  "colorFamily": "warm" | "cool" | "neutral" | "black" | "white",
  "styles": ["从这8个里选1-3个：minimal, japanese, y2k, oldmoney, street, sweet, cool, business"],
  "season": "spring" | "summer" | "autumn" | "winter" | "all",
  "confidence": 0.0-1.0
}

注意：
- category 严格按照英文枚举返回
- subCategory 用简洁中文（2-6 字），不要写形容词
- color 必须是 6 位 HEX
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
            { type: 'text', text: '请识别这张衣物图片。' },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
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
            { type: 'text', text: '请识别这张衣物图片。' },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
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

/** 从模型返回的文本里提取 JSON（去掉 markdown 包裹） */
function extractJson(raw: string): any {
  // 去掉 ```json ... ``` 包裹
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  // 找到第一个 { 和最后一个 }
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

function normalize(parsed: any): DetectionResult {
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
    isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0.85;

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
        message: '管理员未配置 DASHSCOPE_API_KEY 或 OPENAI_API_KEY。前端将使用本地采色 fallback。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: VisionRequest;
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
    const result = normalize(parsed);

    return new Response(
      JSON.stringify({ ...result, source: dashKey ? 'qwen-vl' : 'openai' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'VISION_ERROR', detail: String(err?.message ?? err) }),
      { status: 502 },
    );
  }
}
