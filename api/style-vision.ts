// ============================================================
// Vercel Serverless Function — 小红书穿搭风格识别（Phase 2）
//
// 调用方式：POST /api/style-vision
// Body: { image: string }   // dataURL
//
// 返回：
//   { name, description, colors[], emojis[], keywords[], paletteHint[],
//     seasons[], source: 'qwen-vl' | 'openai' }
//
// 模型：qwen-vl-plus（中文穿搭语义识别准）
// ============================================================

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

interface VisionRequest {
  image: string;
}

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一位专业的小红书穿搭风格分析师。用户上传一张穿搭照片或风格 moodboard，请识别它的整体风格画像。严格按照如下 JSON 格式返回，不要包含任何其它文字：

{
  "name": "中文风格名（4-8 字，如 '清冷感'、'美拉德'、'老钱风'、'多巴胺'）",
  "description": "一句话描述整体氛围（10-25 字）",
  "colors": ["#HEX", "#HEX", "#HEX", "#HEX"],
  "emojis": ["3-5 个最能代表这个风格的关键单品 emoji，如 👔 👖 👞 🎀"],
  "keywords": ["5-8 个中文风格关键词，如 '低腰', '焦糖色', '叠穿', '马面裙'"],
  "paletteHint": ["从 warm/cool/neutral/black/white 里选 1-3 个，描述主色调"],
  "seasons": ["从 spring/summer/autumn/winter/all 里选 1-3 个适合的季节"]
}

注意：
- name 要简洁有辨识度，可以参考小红书热词（如清冷、纯欲、老钱、多巴胺、美拉德、纯欲、千金、辣妹、JK、新中式、Y2K、原宿、法式、机能、山系、极简、千金、学院 等）
- colors 用主色提取，颜色要有代表性
- emojis 必须是 unicode emoji，不要文字
- keywords 要具体（说出穿搭里的关键单品/质感/剪裁），不要太宽泛
- 只返回 JSON，不要 markdown 包裹，不要解释`;

async function callQwenVL(apiKey: string, dataUrl: string): Promise<string> {
  const r = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: '请分析这张穿搭图的风格画像。' },
          ],
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    }),
  });
  if (!r.ok) throw new Error(`Qwen-VL ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Qwen-VL');
  return String(content).trim();
}

async function callOpenAIVision(apiKey: string, dataUrl: string): Promise<string> {
  const r = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: '请分析这张穿搭图的风格画像。' },
          ],
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return String(content).trim();
}

function extractJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  return JSON.parse(cleaned.slice(start, end + 1));
}

const VALID_FAMILIES = new Set(['warm', 'cool', 'neutral', 'black', 'white']);
const VALID_SEASONS = new Set(['spring', 'summer', 'autumn', 'winter', 'all']);

function normalize(parsed: any) {
  const name = String(parsed.name ?? '自定义风格').slice(0, 12);
  const description = String(parsed.description ?? '').slice(0, 40);
  const colorsRaw: string[] = Array.isArray(parsed.colors) ? parsed.colors : [];
  const colors = colorsRaw
    .filter((c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
    .slice(0, 4);
  while (colors.length < 3) colors.push('#cccccc');

  const emojisRaw: string[] = Array.isArray(parsed.emojis) ? parsed.emojis : [];
  const emojis = emojisRaw.filter((e) => typeof e === 'string' && e.length > 0).slice(0, 5);
  while (emojis.length < 3) emojis.push('👕');

  const keywordsRaw: string[] = Array.isArray(parsed.keywords) ? parsed.keywords : [];
  const keywords = keywordsRaw
    .filter((k) => typeof k === 'string' && k.length > 0)
    .map((k) => String(k).slice(0, 12))
    .slice(0, 8);
  if (keywords.length === 0) keywords.push('自定义');

  const paletteRaw: string[] = Array.isArray(parsed.paletteHint) ? parsed.paletteHint : [];
  const paletteHint = paletteRaw.filter((p) => VALID_FAMILIES.has(p)).slice(0, 3);

  const seasonsRaw: string[] = Array.isArray(parsed.seasons) ? parsed.seasons : [];
  const seasons = seasonsRaw.filter((s) => VALID_SEASONS.has(s)).slice(0, 3);
  if (seasons.length === 0) seasons.push('all');

  return { name, description, colors, emojis, keywords, paletteHint, seasons };
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
      JSON.stringify({ error: 'NO_API_KEY', message: '管理员未配置 API Key' }),
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
