// ============================================================
// 前端：截图 → 风格画像（Phase 2）
// 调用 /api/style-vision，本地无 API 路由时 fallback
// ============================================================

import type { StylePack } from '../../../shared/styles-library';

export interface StyleVisionResult {
  pack: StylePack | null;
  source: 'qwen-vl' | 'openai' | 'fallback';
  fallbackReason?: string;
}

export async function extractStyleFromScreenshot(dataUrl: string): Promise<StyleVisionResult> {
  try {
    const r = await fetch('/api/style-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
    const ct = r.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      return { pack: null, source: 'fallback', fallbackReason: '本地预览环境不调真实 AI（线上才能识别）' };
    }
    const j: any = await r.json();
    if (!r.ok) {
      return {
        pack: null,
        source: 'fallback',
        fallbackReason: j?.message ?? j?.error ?? `服务异常 (${r.status})`,
      };
    }
    if (!j.name || !Array.isArray(j.colors) || !Array.isArray(j.keywords)) {
      return { pack: null, source: 'fallback', fallbackReason: '服务返回格式异常' };
    }
    const pack: StylePack = {
      id: `custom-${Date.now()}`,
      name: j.name,
      description: j.description ?? '',
      colors: j.colors,
      emojis: j.emojis ?? ['👕'],
      keywords: j.keywords,
      paletteHint: j.paletteHint,
      seasons: j.seasons ?? ['all'],
      source: 'custom',
      screenshot: dataUrl,
    };
    return { pack, source: j.source ?? 'qwen-vl' };
  } catch (e: any) {
    return {
      pack: null,
      source: 'fallback',
      fallbackReason: String(e?.message ?? '网络错误'),
    };
  }
}
