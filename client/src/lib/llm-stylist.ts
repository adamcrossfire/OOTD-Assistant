// ============================================================
// LLM 智能搭配理由 —— 阶段2 Mock 版
//
// 当前实现：基于 Look 的属性，用规则化模板生成更像「真人造型师」的解读
// 比规则引擎的「色彩协调・风格契合度高」更生动具体
//
// 升级路径：替换 generateStylistComment 内部为 OpenAI/Claude/Gemini 调用
// 输入输出契约保持不变，UI 无需改动
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

/**
 * 主入口：为一个 Look 生成造型师风评论
 * 返回 1-2 句话，60-90 字，更像小红书穿搭博主的口吻
 */
export async function generateStylistComment(
  look: Look,
  weather: { temp: number; condition?: Weather['condition'] },
): Promise<string> {
  // 模拟 LLM 延迟
  await new Promise((r) => setTimeout(r, 300));

  // 1. 主色调描述
  const families = look.items.map((i) => i.colorFamily);
  const dominantFamily = mostCommon(families);
  const colorTone = COLOR_PHRASES[dominantFamily] ?? '层次和谐';

  // 2. 风格描述
  const stylePhrase = look.styles[0]
    ? pick(STYLE_PHRASES[look.styles[0]] ?? ['整体协调'])
    : '整体协调';

  // 3. 关键单品
  const hero = look.items.find((i) => i.category === 'outer')
    ?? look.items.find((i) => i.category === 'dress')
    ?? look.items.find((i) => i.category === 'top');
  const heroName = hero?.subCategory ?? '基础款';

  // 4. 场景 + 温度提示
  const occLabel = OCCASION_LABEL[look.occasion] ?? '日常';
  const tempTip = buildTempTip(weather.temp, weather.condition);

  // 5. 组合输出（随机模板）
  const templates = [
    `${stylePhrase}，${colorTone}让${heroName}成为整套点睛。${occLabel}穿足够稳，${tempTip}。`,
    `用${heroName}打底，${colorTone}叠搭出${stylePhrase}。${occLabel}气场到位，${tempTip}。`,
    `${colorTone}配上${stylePhrase}，${heroName}是整套的高光。${tempTip}，${occLabel}很合适。`,
  ];
  return pick(templates);
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

/** 是否启用真实 LLM（将来接入后改 true） */
export const LLM_API_ENABLED = false;
