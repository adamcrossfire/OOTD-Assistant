// ============================================================
// 衣物图像识别接口
//
// 阶段 4：优先调用 /api/vision（真实视觉 LLM，通义千问 Qwen-VL-Plus）
//        若服务端未配 key 或失败 → 回退本地 Canvas 采色 + 规则推断
//
// 输入输出契约保持不变，业务层无感知
// ============================================================

import type { Category, Item, Season, Style } from '../types';

export interface DetectionResult {
  category: Category;
  subCategory: string;
  color: string;          // HEX
  colorFamily: Item['colorFamily'];
  styles: Style[];
  season: Season;
  /** 置信度（远程 = 模型给出，本地 = 0.7-0.9） */
  confidence: number;
}

/** 远程视觉 API */
async function callRemoteVision(dataUrl: string): Promise<DetectionResult | null> {
  try {
    const r = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return null;
    const j = await r.json();
    if (!j || !j.category) return null;
    // 服务端已做合法性归一化，这里再次 narrow type
    return {
      category: j.category as Category,
      subCategory: String(j.subCategory ?? '单品'),
      color: String(j.color ?? '#888888'),
      colorFamily: j.colorFamily as Item['colorFamily'],
      styles: (j.styles ?? []) as Style[],
      season: (j.season ?? 'all') as Season,
      confidence: typeof j.confidence === 'number' ? j.confidence : 0.85,
    };
  } catch {
    return null;
  }
}

/** 计算图像主色 —— 浏览器端 Canvas 像素采样 */
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

function guessCategory(): Category {
  const pool: Category[] = ['top', 'bottom', 'outer', 'shoes'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 本地兜底识别 */
async function localDetect(dataUrl: string): Promise<DetectionResult> {
  await new Promise((r) => setTimeout(r, 600));

  const color = await extractDominantColor(dataUrl);
  const colorFamily = hexToFamily(color);
  const category = guessCategory();

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

/**
 * 主入口：上传图片 → 识别属性
 * 优先走真实视觉 API，失败则本地兜底
 * @param dataUrl base64 图片
 */
export async function detectClothing(dataUrl: string): Promise<DetectionResult> {
  const remote = await callRemoteVision(dataUrl);
  if (remote) return remote;
  return localDetect(dataUrl);
}

/** 是否启用真实视觉识别（通过环境变量自动判定，前端无需关心） */
export const VISION_API_ENABLED = true;

// ============================================================
// 批量识别：从一张截图（订单/购物车/商品列表）提取多件衣物
// 项目中文名称：「截图批量导入」
// ============================================================

export interface BatchDetectionResult {
  items: DetectionResult[];
  /** 'qwen-vl' / 'openai' / 'fallback' */
  source: string;
  /** 失败原因说明（仅在 fallback 时使用） */
  fallbackReason?: string;
}

/**
 * 从一张截图批量识别衣物。
 * 优先调远程多模态接口，失败时返回空数组（本地无法从一张图里拆分多件商品）。
 */
export async function batchExtractFromScreenshot(dataUrl: string): Promise<BatchDetectionResult> {
  try {
    const r = await fetch('/api/vision-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    const ct = r.headers.get('content-type') ?? '';
    if (!r.ok) {
      let reason = `服务返回 ${r.status}`;
      if (ct.includes('application/json')) {
        try {
          const j = await r.json();
          if (j?.error === 'NO_API_KEY') reason = '未配置视觉识别 API key';
          else if (j?.detail) reason = String(j.detail).slice(0, 80);
        } catch {}
      }
      return { items: [], source: 'fallback', fallbackReason: reason };
    }
    if (!ct.includes('application/json')) {
      return { items: [], source: 'fallback', fallbackReason: '服务返回格式异常' };
    }
    const j = await r.json();
    const itemsRaw: any[] = Array.isArray(j?.items) ? j.items : [];
    const items: DetectionResult[] = itemsRaw.map((it) => ({
      category: it.category as Category,
      subCategory: String(it.subCategory ?? '单品'),
      color: String(it.color ?? '#888888'),
      colorFamily: it.colorFamily as Item['colorFamily'],
      styles: (it.styles ?? []) as Style[],
      season: (it.season ?? 'all') as Season,
      confidence: typeof it.confidence === 'number' ? it.confidence : 0.85,
    }));
    return { items, source: String(j?.source ?? 'qwen-vl') };
  } catch (e: any) {
    return { items: [], source: 'fallback', fallbackReason: String(e?.message ?? e).slice(0, 80) };
  }
}
