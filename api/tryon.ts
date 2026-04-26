// ============================================================
// Vercel Serverless Function — AI 一键试穿
//
// 调用方式：POST /api/tryon
// Body: {
//   prompt: string,            // look 描述（中文 -> 英文 prompt 已在前端拼好）
//   gender: 'male' | 'female', // 模特性别
//   selfPortrait?: string,     // base64 dataURL，存在则做 img2img（本人模式）
// }
//
// 返回: { image: string }   // base64 dataURL
//
// 环境变量（在 Vercel 项目 Settings → Environment Variables 配）:
//   OPENAI_API_KEY  —— 必填，使用 OpenAI gpt-image-1 / dall-e-3
//                      若用其它供应商（Replicate / 通义万相 / 豆包），改下面的 fetch 即可
// ============================================================

export const config = {
  runtime: 'edge',
  // 出图最长 60s
  maxDuration: 60,
};

interface TryOnRequest {
  prompt: string;
  gender: 'male' | 'female';
  selfPortrait?: string; // dataURL
}

const OPENAI_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_EDIT_URL = 'https://api.openai.com/v1/images/edits';

function buildPrompt(userPrompt: string, gender: 'male' | 'female', isSelf: boolean) {
  // 让出图风格统一：电商上身图、自然光、纯净背景
  const subject = isSelf
    ? `the person in the reference photo`
    : gender === 'male'
      ? `a tall asian male model in his late 20s, friendly look, athletic build`
      : `a slim asian female model in her mid 20s, natural makeup, soft expression`;

  return [
    `Full-body fashion editorial photo of ${subject} wearing the following outfit: ${userPrompt}.`,
    `Standing pose, slight 3/4 angle, soft daylight, neutral seamless studio background (warm beige #f5efe6).`,
    `Photorealistic, magazine-quality, sharp focus on garments, no text, no logos, no watermark, no extra accessories beyond what is described.`,
  ].join(' ');
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY ?? '';
  if (!apiKey) {
    // Demo 模式：未配置 key 时返回降级响应
    return new Response(
      JSON.stringify({
        error: 'NO_API_KEY',
        message: '管理员未配置 OPENAI_API_KEY 环境变量。前端将使用占位图。',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: TryOnRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { prompt, gender, selfPortrait } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt required' }), { status: 400 });
  }

  const fullPrompt = buildPrompt(prompt, gender, !!selfPortrait);

  try {
    if (selfPortrait) {
      // 本人模式：image edit
      // 把 dataURL 转成 Blob
      const m = selfPortrait.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!m) {
        return new Response(JSON.stringify({ error: 'Invalid selfPortrait dataURL' }), {
          status: 400,
        });
      }
      const mime = m[1];
      const b64 = m[2];
      const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([binary], { type: mime });

      const fd = new FormData();
      fd.append('model', 'gpt-image-1');
      fd.append('prompt', fullPrompt);
      fd.append('image', blob, 'self.png');
      fd.append('size', '1024x1536');
      fd.append('quality', 'medium');

      const r = await fetch(OPENAI_EDIT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: 'OpenAI error', detail: t }), { status: 502 });
      }
      const j = await r.json();
      const b64out = j.data?.[0]?.b64_json;
      if (!b64out) {
        return new Response(JSON.stringify({ error: 'No image returned' }), { status: 502 });
      }
      return new Response(
        JSON.stringify({ image: `data:image/png;base64,${b64out}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 通用模特：text-to-image
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fullPrompt,
        size: '1024x1536',
        quality: 'medium',
        n: 1,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: 'OpenAI error', detail: t }), { status: 502 });
    }
    const j = await r.json();
    const b64out = j.data?.[0]?.b64_json;
    if (!b64out) {
      return new Response(JSON.stringify({ error: 'No image returned' }), { status: 502 });
    }
    return new Response(
      JSON.stringify({ image: `data:image/png;base64,${b64out}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal', detail: String(err?.message ?? err) }),
      { status: 500 },
    );
  }
}
