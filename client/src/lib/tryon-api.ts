// ============================================================
// 一键试穿 API 客户端
// - 通用模特 / 本人模式
// - 失败/未配置 key 时返回 demo 占位（前端零中断体验）
// ============================================================

import type { Look, Gender } from '../types';

export type TryOnMode = 'generic' | 'self';

export interface TryOnResult {
  image: string; // dataURL or external URL
  source: 'ai' | 'demo'; // 标识是真生成还是占位
}

/** 把 look 转换为可送进 prompt 的中文描述 */
export function buildTryOnPromptCN(look: Look): string {
  const items = look.items
    .map((it) => {
      const colorName = colorWord(it.color);
      return `${colorName}${it.subCategory}`;
    })
    .join(' + ');
  const styles = look.styles.slice(0, 2).join(', ');
  return `${items}（风格：${styles}）`;
}

function colorWord(hex: string): string {
  if (!hex) return '';
  const h = hex.toLowerCase();
  const map: Record<string, string> = {
    '#ffffff': '白色',
    '#000000': '黑色',
    '#1a1a1a': '黑色',
    '#222222': '黑色',
    '#5a5a5a': '深灰',
    '#888888': '灰色',
    '#c0c0c0': '浅灰',
    '#f5f5dc': '米色',
    '#e8d4b3': '米色',
    '#d2b48c': '驼色',
    '#8b4513': '棕色',
    '#4682b4': '蓝色',
    '#1e3a5f': '深蓝',
    '#2c3e50': '深蓝',
    '#0a2342': '深蓝',
    '#dc143c': '红色',
    '#b22222': '红色',
    '#228b22': '绿色',
    '#556b2f': '橄榄绿',
    '#ffe4b5': '杏色',
  };
  return map[h] ?? '';
}

/** 调用 Vercel /api/tryon 生成；失败返回 demo 占位 */
export async function generateTryOn(opts: {
  look: Look;
  gender: Gender;
  selfPortrait?: string | null;
}): Promise<TryOnResult> {
  const { look, gender, selfPortrait } = opts;
  const prompt = buildTryOnPromptCN(look);
  const fallbackSeed = look.id + (selfPortrait ? ':self' : '');
  try {
    const r = await fetch('/api/tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, gender, selfPortrait: selfPortrait || undefined }),
    });
    if (!r.ok) {
      return { image: pickDemoImage(gender, fallbackSeed), source: 'demo' };
    }
    const j = await r.json();
    if (!j.image) return { image: pickDemoImage(gender, fallbackSeed), source: 'demo' };
    return { image: j.image, source: 'ai' };
  } catch {
    return { image: pickDemoImage(gender, fallbackSeed), source: 'demo' };
  }
}

/**
 * Demo 占位图：未配置 API key 时使用，保证产品体验闭环。
 * 本地 AI 生成的模特货架图，随项目一同部署，不依赖外部网络。
 * 按 seed 哈希取一张，保证同一套 look 稳定相同。
 */
function pickDemoImage(gender: Gender, seed: string): string {
  const list =
    gender === 'male'
      ? [
          '/tryon-demo/tryon_male_1.jpg',
          '/tryon-demo/tryon_male_2.jpg',
          '/tryon-demo/tryon_male_3.jpg',
        ]
      : [
          '/tryon-demo/tryon_female_1.jpg',
          '/tryon-demo/tryon_female_2.jpg',
          '/tryon-demo/tryon_female_3.jpg',
        ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}
