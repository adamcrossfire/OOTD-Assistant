// ============================================================
// Vercel Serverless Function — 参考衣橱·AI 实时生成搭配
//
// 用于「参考衣橱」模式（用户自己衣橱<5件或主动切换时）：
// 按 风格 + 场合 + DressCode + 性别 + 天气 调通义万相 wan2.2-t2i 生图
//
// 调用：POST /api/inspiration
// Body: {
//   stylePack?: { name, description?, keywords?, colors? },
//   styles?: string[],          // ['极简','日系']
//   occasion: string,           // '通勤','约会','运动','面试','派对','日常'
//   dressCode: string,          // 'casual','smart-casual','formal','sporty'
//   gender: 'male' | 'female',
//   weather?: { temp?: number, condition?: string },
//   variantSeed?: number,       // 同条件多次生成时换 seed
// }
//
// 返回: { image: string, items: Array<{category, subCategory, color, colorFamily}>, prompt: string }
//
// 环境变量：
//   DASHSCOPE_API_KEY  —— 阿里云百炼，wan2.2-t2i 单张约 0.04 元
// ============================================================

export const config = {
  runtime: 'edge',
  maxDuration: 60,
};

const DASHSCOPE_T2I_URL =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const DASHSCOPE_TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks/';

interface InspirationRequest {
  stylePackId?: string | null;
  stylePack?: { name?: string; description?: string; keywords?: string[]; colors?: string[] } | null;
  styles?: string[];
  occasion: string;
  dressCode: string;
  gender: 'male' | 'female';
  weather?: { temp?: number; condition?: string };
  variantSeed?: number;
}

const OCCASION_EN: Record<string, string> = {
  '通勤': 'office commute',
  '约会': 'romantic date',
  '运动': 'casual workout',
  '面试': 'job interview',
  '派对': 'evening party',
  '日常': 'casual everyday',
  '出行': 'travel weekend',
};

const DC_EN: Record<string, string> = {
  'casual': 'casual',
  'smart-casual': 'smart casual',
  'formal': 'formal business attire',
  'sporty': 'sporty athleisure',
};

const STYLE_EN: Record<string, string> = {
  '极简': 'minimalist clean lines',
  '日系': 'Japanese soft layering',
  'Y2K': 'Y2K nostalgic 2000s',
  '老钱风': 'old money quiet luxury',
  '街头': 'streetwear urban',
  '甜美': 'sweet feminine',
  '酷感': 'cool edgy',
  '商务': 'sharp business',
};

function styleSummary(req: InspirationRequest): string {
  const parts: string[] = [];
  if (req.stylePack?.name) {
    parts.push(req.stylePack.name);
    if (req.stylePack.keywords?.length) parts.push(req.stylePack.keywords.slice(0, 4).join(', '));
  }
  if (req.styles?.length) parts.push(req.styles.map((s) => STYLE_EN[s] ?? s).join(', '));
  return parts.join(', ');
}

function buildPrompt(req: InspirationRequest): string {
  const subject =
    req.gender === 'male'
      ? 'a tall asian male model in his late 20s, friendly natural look'
      : 'a slim asian female model in her mid 20s, natural makeup, elegant pose';
  const oc = OCCASION_EN[req.occasion] ?? req.occasion;
  const dc = DC_EN[req.dressCode] ?? req.dressCode;
  const styleStr = styleSummary(req);
  const palette = req.stylePack?.colors?.length
    ? `dominant color palette: ${req.stylePack.colors.slice(0, 4).join(', ')}.`
    : '';
  const tempHint =
    typeof req.weather?.temp === 'number'
      ? req.weather.temp >= 24
        ? 'light summer fabrics, breathable, short sleeves or skirts.'
        : req.weather.temp >= 16
          ? 'spring layering, light jacket or knit cardigan.'
          : req.weather.temp >= 8
            ? 'autumn layering, warm sweater, trousers, optional coat.'
            : 'winter outfit, thick coat, warm knits, scarf or boots.'
      : '';
  return [
    `Full-body fashion editorial photo of ${subject} wearing a complete styled outfit for ${oc}, ${dc} dress code.`,
    styleStr ? `Style direction: ${styleStr}.` : '',
    palette,
    tempHint,
    `Standing pose, slight 3/4 angle, soft daylight, neutral seamless studio background (warm beige #f5efe6).`,
    `Photorealistic, magazine-quality, sharp focus on garments. No text, no logos, no watermark.`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** 简单语义解析：根据 dressCode + occasion + gender 推断会出现的单品类别（作为 look.items 占位） */
function inferItems(req: InspirationRequest): Array<{
  category: string;
  subCategory: string;
  color: string;
  colorFamily: string;
}> {
  const female = req.gender === 'female';
  const oc = req.occasion;
  const palette = req.stylePack?.colors ?? ['#1a1a1a', '#f5efe6', '#8b4513'];
  const c1 = palette[0] ?? '#1a1a1a';
  const c2 = palette[1] ?? '#f5efe6';
  const c3 = palette[2] ?? c1;
  const fam = (hex: string) => {
    const h = hex.toLowerCase();
    if (h === '#000000' || h === '#1a1a1a' || h === '#222222') return '黑';
    if (h === '#ffffff' || h.includes('f5')) return '米白';
    if (h.includes('8b4') || h.includes('d2b')) return '驼/棕';
    if (h.includes('1e3') || h.includes('468')) return '蓝';
    return '中性';
  };
  if (req.dressCode === 'sporty' || oc === '运动') {
    return [
      { category: 'top', subCategory: female ? '运动背心' : 'T 恤', color: c1, colorFamily: fam(c1) },
      { category: 'bottom', subCategory: female ? '紧身运动裤' : '运动短裤', color: c2, colorFamily: fam(c2) },
      { category: 'shoes', subCategory: '跑鞋', color: c3, colorFamily: fam(c3) },
    ];
  }
  if (req.dressCode === 'formal' || oc === '面试') {
    return [
      { category: 'top', subCategory: female ? '白衬衫' : '衬衫', color: '#ffffff', colorFamily: '米白' },
      { category: 'bottom', subCategory: female ? '西裤' : '西裤', color: c1, colorFamily: fam(c1) },
      { category: 'outer', subCategory: '西装外套', color: c1, colorFamily: fam(c1) },
      { category: 'shoes', subCategory: '皮鞋', color: c1, colorFamily: fam(c1) },
    ];
  }
  if (oc === '约会' && female) {
    return [
      { category: 'top', subCategory: '针织上衣', color: c2, colorFamily: fam(c2) },
      { category: 'bottom', subCategory: '半身裙', color: c1, colorFamily: fam(c1) },
      { category: 'shoes', subCategory: '乐福鞋', color: c3, colorFamily: fam(c3) },
    ];
  }
  // 通勤 / 日常 / 派对
  return [
    { category: 'top', subCategory: female ? '针织衫' : 'T 恤', color: c2, colorFamily: fam(c2) },
    { category: 'bottom', subCategory: female ? '直筒裤' : '休闲裤', color: c1, colorFamily: fam(c1) },
    { category: 'outer', subCategory: '风衣', color: c3, colorFamily: fam(c3) },
    { category: 'shoes', subCategory: female ? '乐福鞋' : '小白鞋', color: '#ffffff', colorFamily: '米白' },
  ];
}

async function callWan(prompt: string, seed: number, apiKey: string): Promise<string> {
  // 1. 异步任务提交 —— 改用 wanx2.1-t2i-flash（更快、质量接近，单张 2-5s）
  const submit = await fetch(DASHSCOPE_T2I_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx2.1-t2i-flash',
      input: { prompt },
      parameters: { size: '720*1280', n: 1, seed },
    }),
  });
  if (!submit.ok) throw new Error(`submit ${submit.status}: ${await submit.text()}`);
  const sj = await submit.json();
  const taskId = sj.output?.task_id;
  if (!taskId) throw new Error('no task_id');

  // 2. 轮询（flash 一般 2-5s，间隔压到 800ms）
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 800));
    const r = await fetch(`${DASHSCOPE_TASK_URL}${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) continue;
    const j = await r.json();
    const status = j.output?.task_status;
    if (status === 'SUCCEEDED') {
      const url = j.output?.results?.[0]?.url;
      if (!url) throw new Error('no image url');
      return url;
    }
    if (status === 'FAILED' || status === 'UNKNOWN') {
      throw new Error(`task ${status}: ${JSON.stringify(j.output)}`);
    }
  }
  throw new Error('task timeout');
}

// ============================================================
// 预生成池：常见 stylePack + occasion + gender 组合已预生成 2 张静态图
// 命中直接返回 URL，避免实时调 wan API
// 预生成脚本：scripts/build-inspo-pool.ts
// 文件路径：/inspo-pool/<gender>-<stylePackId>-<occasion>-<variant>.webp（静态文件）
// ============================================================

const POOL_BASE = '/inspo-pool';

const OCCASION_KEY: Record<string, string> = {
  '通勤': 'commute',
  '约会': 'date',
  '运动': 'sport',
  '面试': 'interview',
  '派对': 'party',
  '日常': 'casual',
  '出行': 'travel',
};

/** 预生成池覆盖的 stylePack id（同步保持与 build-inspo-pool.ts一致） */
const POOL_STYLE_IDS = new Set([
  'minimal', 'old-money', 'maillard', 'french', 'preppy',
  'qing-leng', 'la-mei', 'pure-desire', 'jk', 'y2k',
  'techwear', 'gorpcore', 'city-boy', 'amekaji', 'salaryman',
]);
/** 预生成池覆盖的场合 */
const POOL_OCCASIONS = new Set(['commute', 'date', 'casual', 'party']);
/** 预生成变体数（每个组合 N 张） */
const POOL_VARIANTS = 2;

/** 判断请求是否可命中预生成池，命中返回 URL、未命中返回 null */
function tryHitPool(req: InspirationRequest, seed: number): string | null {
  // 用户自定义 stylePack 不在池里
  const styleId = req.stylePackId ?? undefined;
  if (!styleId || !POOL_STYLE_IDS.has(styleId)) return null;
  const ocKey = OCCASION_KEY[req.occasion] ?? 'casual';
  if (!POOL_OCCASIONS.has(ocKey)) return null;
  const gender = req.gender === 'male' ? 'male' : 'female';
  const variant = Math.abs(seed) % POOL_VARIANTS;
  return `${POOL_BASE}/${gender}-${styleId}-${ocKey}-${variant}.webp`;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  const apiKey = (globalThis as any).process?.env?.DASHSCOPE_API_KEY ?? '';
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'NO_API_KEY',
        message: '管理员未配置 DASHSCOPE_API_KEY；前端会用占位图兜底。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: InspirationRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const prompt = buildPrompt(body);
  const seed =
    typeof body.variantSeed === 'number' ? body.variantSeed % 2147483647 : Math.floor(Math.random() * 2147483647);
  const items = inferItems(body);

  // 先查预生成池，命中直接返回（0 延迟）
  const poolUrl = tryHitPool(body, seed);
  if (poolUrl) {
    return new Response(
      JSON.stringify({ image: poolUrl, items, prompt: '[pool-hit]', source: 'pool' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const imageUrl = await callWan(prompt, seed, apiKey);
    return new Response(
      JSON.stringify({ image: imageUrl, items, prompt, source: 'wan-flash' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'wan failed', detail: String(err?.message ?? err) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
