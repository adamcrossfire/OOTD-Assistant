// ============================================================
// 图像识别接口 —— 阶段2 Mock 版
//
// 输入：用户上传的衣物照片（base64 或 blob）
// 输出：自动推断的 { category, subCategory, colorFamily, color, styles, season }
//
// 当前实现：
//   - 在浏览器端用 Canvas 抽样取色 → 推断主色 + 颜色家族（真实可用）
//   - 品类/风格用规则猜测 + 默认值（mock）
//
// 升级路径：
//   - 替换 detectClothing() 内部为 Google Vision / AWS Rekognition / Replicate API
//   - 输入接口和返回结构保持不变，业务层无感知
// ============================================================

import type { Category, Item, Season, Style } from '../types';

export interface DetectionResult {
  category: Category;
  subCategory: string;
  color: string;          // HEX
  colorFamily: Item['colorFamily'];
  styles: Style[];
  season: Season;
  /** 置信度（mock = 0.7-0.9） */
  confidence: number;
}

/** 计算图像主色 —— 真实实现，用 Canvas 像素采样 */
async function extractDominantColor(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 80;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('#888888');
      ctx.drawImage(img, 0, 0, size, size);
      let r = 0, g = 0, b = 0, count = 0;
      try {
        const { data } = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < data.length; i += 16) {
          // 跳过近白色背景（避免抠图风受白底影响）
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          if (cr > 240 && cg > 240 && cb > 240) continue;
          r += cr;
          g += cg;
          b += cb;
          count++;
        }
        if (count === 0) return resolve('#888888');
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        resolve(`#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`);
      } catch {
        resolve('#888888');
      }
    };
    img.onerror = () => resolve('#888888');
    img.src = dataUrl;
  });
}

/** HEX → 颜色家族 */
function hexToFamily(hex: string): Item['colorFamily'] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (lightness < 0.18) return 'black';
  if (lightness > 0.85 && saturation < 0.1) return 'white';
  if (saturation < 0.15) return 'neutral';
  if (r > b + 15) return 'warm';
  if (b > r + 5) return 'cool';
  return 'neutral';
}

/** 极简版品类分类（基于图像比例 + 颜色） */
function guessCategory(_img?: HTMLImageElement): Category {
  // mock：返回最常见的 top
  const pool: Category[] = ['top', 'bottom', 'outer', 'shoes'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 主入口：上传图片 → 识别属性
 * @param dataUrl base64 图片
 */
export async function detectClothing(dataUrl: string): Promise<DetectionResult> {
  // 模拟接口耗时（让 UI loading 状态有意义）
  await new Promise((r) => setTimeout(r, 600));

  const color = await extractDominantColor(dataUrl);
  const colorFamily = hexToFamily(color);
  const category = guessCategory();

  // 默认风格猜测（mock）
  const styleMap: Record<Item['colorFamily'], Style[]> = {
    black: ['minimal', 'cool'],
    white: ['minimal', 'japanese'],
    neutral: ['minimal', 'oldmoney'],
    warm: ['oldmoney', 'sweet'],
    cool: ['minimal', 'business'],
  };

  const subCategoryMap: Record<Category, string> = {
    top: '上衣',
    bottom: '下装',
    outer: '外套',
    dress: '连衣裙',
    shoes: '鞋',
    accessory: '配饰',
  };

  return {
    category,
    subCategory: subCategoryMap[category],
    color,
    colorFamily,
    styles: styleMap[colorFamily],
    season: 'all',
    confidence: 0.7 + Math.random() * 0.2,
  };
}

/** 是否启用真实识别（将来接 Vision API 后改 true） */
export const VISION_API_ENABLED = false;
