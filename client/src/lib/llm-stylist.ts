// ============================================================
// LLM 智能搭配理由
//
// 阶段 3：优先调用 /api/stylist（真实 LLM，通义千问 Qwen-Plus / OpenAI 兼容）
//        若服务端未配 DASHSCOPE_API_KEY/OPENAI_API_KEY 或调用失败 → 回退本地模板
//
// 输入输出契约保持不变，UI 层无感知
// ============================================================

import type { Look, Weather, Occasion } from '../types';

/** 场合中文映射 */
const OCCASION_LABEL: Record<Occasion, string> = {
  commute: '通勤',
  date: '约会',
  sport: '运动',
  interview: '面试',
  travel: '旅行',
  party: '派对',
  casual: '日常',
};

/** 风格 → 造型师笔触 */
const STYLE_PHRASES: Record<string, string[]> = {
  minimal: ['线条干净利落', '极简留白感', '无负担的高级感'],
  japanese: ['日系松弛温柔', '柔焦氛围感', '森系自然光'],
  y2k: ['辣妹氛围', '千禧复古调', '亮片系少女'],
  oldmoney: ['老钱低调高级', '安静的奢华', 'Quiet Luxury 质感'],
  street: ['街头利落', '机能感线条', '潮流松弛'],
  sweet: ['甜美轻盈', '奶油感氛围', '慵懒法式甜风'],
  cool: ['冷淡酷感', '都市利落感', 'Sharp 锐感'],
  business: ['商务利落', '职场气场', '清爽干练'],
};

/** 颜色家族 → 描述 */
const COLOR_PHRASES: Record<string, string> = {
  warm: '暖调奶咖系',
  cool: '清冷蓝调',
  neutral: '中性大地色',
  black: '通身黑显瘦',
  white: '净白通透',
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 远程 LLM API 调用 */
async function callRemoteStylist(
  look: Look,
  weather: { temp: number; condition?: Weather['condition'] },
): Promise<string | null> {
  try {
    const r = await fetch('/api/stylist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        look: {
          items: look.items.map((i) => ({
            category: i.category,
            subCategory: i.subCategory,
            color: i.color,
            colorFamily: i.colorFamily,
          })),
          styles: look.styles,
          occasion: OCCASION_LABEL[look.occasion] ?? '日常',
        },
        weather: {
          temp: weather.temp,
          condition: weather.condition,
        },
      }),
    });
    if (!r.ok) return null;
    // 防御：本地 dev 服务器上 /api/* 不存在时会被 SPA fallback 返回 index.html
    const ct = r.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return null;
    const j = await r.json();
    if (typeof j?.comment === 'string' && j.comment.length > 0) {
      return j.comment;
    }
    return null;
  } catch {
    return null;
  }
}

/** 本地模板兜底（原 Mock 逻辑） */
function localStylistTemplate(
  look: Look,
  weather: { temp: number; condition?: Weather['condition'] },
): string {
  const families = look.items.map((i) => i.colorFamily);
  const dominantFamily = mostCommon(families);
  const colorTone = COLOR_PHRASES[dominantFamily] ?? '层次和谐';

  const stylePhrase = look.styles[0]
    ? pick(STYLE_PHRASES[look.styles[0]] ?? ['整体协调'])
    : '整体协调';

  const hero = look.items.find((i) => i.category === 'outer')
    ?? look.items.find((i) => i.category === 'dress')
    ?? look.items.find((i) => i.category === 'top');
  const heroName = hero?.subCategory ?? '基础款';

  const occLabel = OCCASION_LABEL[look.occasion] ?? '日常';
  const tempTip = buildTempTip(weather.temp, weather.condition);

  const templates = [
    `${stylePhrase}，${colorTone}让${heroName}成为整套点睛。${occLabel}穿足够稳，${tempTip}。`,
    `用${heroName}打底，${colorTone}叠搭出${stylePhrase}。${occLabel}气场到位，${tempTip}。`,
    `${colorTone}配上${stylePhrase}，${heroName}是整套的高光。${tempTip}，${occLabel}很合适。`,
  ];
  return pick(templates);
}

/**
 * 主入口：为一个 Look 生成造型师风评论
 * 先尝试真 LLM，失败则用本地模板兜底
 */
export async function generateStylistComment(
  look: Look,
  weather: { temp: number; condition?: Weather['condition'] },
): Promise<string> {
  const remote = await callRemoteStylist(look, weather);
  if (remote) return remote;

  // 本地兜底：模拟原有 300ms 延迟，保持 UI 节奏一致
  await new Promise((r) => setTimeout(r, 300));
  return localStylistTemplate(look, weather);
}

function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best: T = arr[0];
  let bestN = 0;
  counts.forEach((n, k) => {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  });
  return best;
}

function buildTempTip(temp: number, cond?: Weather['condition']): string {
  if (cond === 'rainy') return '雨天记得配防水外套';
  if (cond === 'snowy') return '雪天叠加内搭更暖';
  if (temp >= 28) return '夏日透气不闷热';
  if (temp >= 20) return '体感舒适不出汗';
  if (temp >= 12) return '适合早晚温差';
  if (temp >= 5) return '冷风里也能扛';
  return '严寒注意叠穿';
}

/** 是否启用真实 LLM（通过环境变量自动判定，前端无需关心） */
export const LLM_API_ENABLED = true;
