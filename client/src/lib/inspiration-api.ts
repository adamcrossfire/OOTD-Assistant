// ============================================================
// 参考衣橱 API 客户端
// 调 /api/inspiration（通义万相 wan2.x t2i），失败时 fallback 占位图
// ============================================================
import type { Look, DressCode, Occasion, Style, Gender } from '../types';
import type { StylePack } from '../../../shared/styles-library';

export interface InspirationLook extends Look {
  inspirationImage: string;
  source: 'inspiration';
}

interface ApiResponse {
  image: string;
  items: Array<{ category: string; subCategory: string; color: string; colorFamily: string }>;
  prompt: string;
}

// Demo 占位图（API key 未配/失败时降级，保证零中断体验）
const DEMO_FEMALE = [
  '/tryon-demo/tryon_female_1.jpg',
  '/tryon-demo/tryon_female_2.jpg',
  '/tryon-demo/tryon_female_3.jpg',
];
const DEMO_MALE = [
  '/tryon-demo/tryon_male_1.jpg',
  '/tryon-demo/tryon_male_2.jpg',
  '/tryon-demo/tryon_male_3.jpg',
];

function pickDemo(gender: Gender | null | undefined, seed: number): string {
  const list = gender === 'female' ? DEMO_FEMALE : DEMO_MALE;
  return list[Math.abs(seed) % list.length];
}

/** 根据条件估算 weatherRange（用于「今日就穿」的兼容字段） */
function estimateWeatherRange(temp: number): { min: number; max: number } {
  return { min: Math.max(temp - 6, -10), max: Math.min(temp + 6, 38) };
}

/** 把后端返回的 items 转成前端 Item 类型（占位 id/season） */
function toLookItems(rawItems: ApiResponse['items']): Look['items'] {
  return rawItems.map((it, idx) => ({
    id: `inspo-${Date.now()}-${idx}`,
    photoUrl: '',
    category: it.category as Look['items'][number]['category'],
    subCategory: it.subCategory as any,
    color: it.color,
    colorFamily: it.colorFamily as any,
    season: 'all' as any,
    styles: [] as any,
    dressCodes: [] as any,
    wearCount: 0,
  }));
}

/**
 * 生成一套参考衣橱搭配。
 * 失败时返回占位图 + 模板化 items，保证前端不中断。
 */
export async function generateInspirationLook(opts: {
  occasion: Occasion;
  dressCode: DressCode;
  styles: Style[];
  gender: Gender | null;
  weather: { temp: number; condition?: string };
  stylePack: StylePack | null;
  variantSeed: number;
}): Promise<InspirationLook> {
  const { occasion, dressCode, styles, gender, weather, stylePack, variantSeed } = opts;

  const occasionLabel = OCCASION_LABEL[occasion] ?? '日常';
  const styleLabels = styles.map((s) => STYLE_LABEL[s] ?? s);

  try {
    const r = await fetch('/api/inspiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stylePackId: stylePack?.id ?? null,
        stylePack: stylePack
          ? {
              name: stylePack.name,
              description: stylePack.description,
              keywords: stylePack.keywords,
              colors: stylePack.colors,
            }
          : null,
        styles: styleLabels,
        occasion: occasionLabel,
        dressCode,
        gender,
        weather: { temp: weather.temp, condition: weather.condition },
        variantSeed,
      }),
    });
    if (r.ok) {
      const j: ApiResponse = await r.json();
      const items = toLookItems(j.items);
      const id = `inspo-${variantSeed}-${Date.now()}`;
      return {
        id,
        items,
        occasion,
        dressCode,
        styles,
        weatherRange: estimateWeatherRange(weather.temp),
        score: 92,
        reason: '',
        source: 'inspiration',
        inspirationImage: j.image,
        inspirationPrompt: j.prompt,
      };
    }
  } catch {
    // fallthrough to demo
  }
  // 兜底：占位图 + 模板 items
  const demoItems = templateItems(dressCode, occasion, gender, stylePack);
  const id = `inspo-demo-${variantSeed}-${Date.now()}`;
  return {
    id,
    items: demoItems,
    occasion,
    dressCode,
    styles,
    weatherRange: estimateWeatherRange(weather.temp),
    score: 88,
    reason: '',
    source: 'inspiration',
    inspirationImage: pickDemo(gender, variantSeed),
    inspirationPrompt: '',
  };
}

/** 同时生成 N 套（并发） */
export async function generateInspirationLooks(opts: {
  occasion: Occasion;
  dressCode: DressCode;
  styles: Style[];
  gender: Gender | null;
  weather: { temp: number; condition?: string };
  stylePack: StylePack | null;
  count: number;
  baseSeed: number;
}): Promise<InspirationLook[]> {
  const { count, baseSeed, ...rest } = opts;
  const tasks = Array.from({ length: count }, (_, i) =>
    generateInspirationLook({ ...rest, variantSeed: baseSeed * 100 + i }),
  );
  return Promise.all(tasks);
}

const OCCASION_LABEL: Record<Occasion, string> = {
  commute: '通勤',
  date: '约会',
  sport: '运动',
  interview: '面试',
  party: '派对',
  casual: '日常',
  travel: '出行',
};
const STYLE_LABEL: Record<Style, string> = {
  minimal: '极简',
  japanese: '日系',
  y2k: 'Y2K',
  oldmoney: '老钱风',
  street: '街头',
  sweet: '甜美',
  cool: '酷感',
  business: '商务',
};

function templateItems(
  dc: DressCode,
  oc: Occasion,
  gender: Gender | null,
  pack: StylePack | null,
): Look['items'] {
  const female = gender === 'female';
  const palette = pack?.colors ?? ['#1a1a1a', '#f5efe6', '#8b4513'];
  const fam = (hex: string) => {
    const h = hex.toLowerCase();
    if (h === '#000000' || h === '#1a1a1a') return '黑';
    if (h.includes('f5')) return '米白';
    if (h.includes('8b4')) return '驼/棕';
    return '中性';
  };
  const mk = (cat: any, sub: string, c: string) => ({
    id: `t-${cat}-${Date.now()}-${Math.random()}`,
    photoUrl: '',
    category: cat,
    subCategory: sub as any,
    color: c,
    colorFamily: fam(c) as any,
    season: 'all' as any,
    styles: [] as any,
    dressCodes: [] as any,
    wearCount: 0,
  });
  if (dc === 'sporty' || oc === 'sport') {
    return [
      mk('top', female ? '运动背心' : 'T 恤', palette[0]),
      mk('bottom', female ? '紧身运动裤' : '运动短裤', palette[1] ?? palette[0]),
      mk('shoes', '跑鞋', palette[2] ?? '#ffffff'),
    ];
  }
  if (dc === 'formal' || oc === 'interview') {
    return [
      mk('top', female ? '白衬衫' : '衬衫', '#ffffff'),
      mk('bottom', '西裤', palette[0]),
      mk('outer', '西装外套', palette[0]),
      mk('shoes', '皮鞋', palette[0]),
    ];
  }
  return [
    mk('top', female ? '针织衫' : 'T 恤', palette[1] ?? palette[0]),
    mk('bottom', female ? '直筒裤' : '休闲裤', palette[0]),
    mk('outer', '风衣', palette[2] ?? palette[0]),
    mk('shoes', female ? '乐福鞋' : '小白鞋', '#ffffff'),
  ];
}
