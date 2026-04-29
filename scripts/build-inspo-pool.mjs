// ============================================================
// 预生成参考衣橱池脚本 v2
// 调用 vercel /api/inspiration 获取图，本地 sharp 转 webp + 缩到 1024
// 240 任务 -> 性别过滤后 176 张
// 输出: ootd/public/inspo-pool/<gender>-<styleId>-<occasion>-<variant>.webp
// 串行 + sleep 4s + 8 次重试退避，前台运行
// 支持环境变量 BATCH_START / BATCH_LIMIT 分批
// ============================================================
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../client/public/inspo-pool');
const ENDPOINT = 'https://ootd-assistant.vercel.app/api/inspiration';

const STYLES = [
  // unisex
  { id: 'minimal', name: '极简', keywords: ['黑白灰', '无 logo', '直线条', '极简', '冷淡', '高级'], colors: ['#ffffff', '#d4d4d4', '#5a5a5a', '#1a1a1a'] },
  { id: 'old-money', name: '老钱风', keywords: ['西装外套', '卡其', '乐福鞋', '马球衫', '羊绒针织', '低调奢华'], colors: ['#f5ecdb', '#c9b896', '#8b7355', '#3d3528'] },
  { id: 'maillard', name: '美拉德', keywords: ['焦糖色', '可可色', '咖啡色', '同色系叠穿', '大地色'], colors: ['#f4e4c1', '#c89878', '#8b5a3c', '#3d2817'] },
  { id: 'preppy', name: '学院风', keywords: ['针织背心', '格纹', '马甲', '皮鞋', '学院'], colors: ['#f5f0e6', '#9b6b3b', '#3a5d4a', '#2c2c2c'] },
  { id: 'qing-leng', name: '清冷感', keywords: ['冷色调', '雾蓝', '高级灰', '极简剪裁', '冷淡'], colors: ['#e8eef2', '#9bb0c1', '#5a7693', '#2c3a4a'] },
  { id: 'techwear', name: '街头机能', keywords: ['工装', '机能', '冲锋衣', '工装裤', '战术'], colors: ['#2c2c2c', '#5a5a5a', '#7d6e57', '#ff6a3d'] },
  { id: 'gorpcore', name: '户外山系', keywords: ['冲锋衣', '抓绒', '登山靴', '户外', '山系'], colors: ['#3d5a3d', '#c4a574', '#5a4a3a', '#ff8c42'] },
  // female-only
  { id: 'la-mei', name: '辣妹', keywords: ['露脐', '紧身', '低腰', '辣妹', '性感', '腰线'], colors: ['#fff4ec', '#ffb59e', '#e75858', '#1a1a1a'] },
  { id: 'pure-desire', name: '纯欲', keywords: ['吊带', '蕾丝', '紧身', '低胸', '甜辣'], colors: ['#fde7e4', '#f4b9b9', '#d68a8a', '#8b4040'] },
  { id: 'jk', name: 'JK 学院', keywords: ['JK 制服', '百褶裙', '水手服', '领结', '校园风'], colors: ['#ffffff', '#1f3a68', '#a4232f', '#2c2c2c'] },
  { id: 'y2k', name: 'Y2K 千禧', keywords: ['低腰', '亮片', '蝴蝶', '荧光', '撞色', '复古辣'], colors: ['#ff8fc7', '#a78bfa', '#7dd3fc', '#fde047'] },
  { id: 'french', name: '法式慵懒', keywords: ['条纹衫', '芭蕾鞋', '直筒裤', '小方巾', '法式'], colors: ['#f5efe6', '#d4c4a8', '#5a7693', '#2c2c2c'] },
  // male-only
  { id: 'city-boy', name: 'City Boy', keywords: ['日系都市', '通勤潮', '简约层次', '直筒裤', '乐福鞋'], colors: ['#f0e8d8', '#3a4a5a', '#7d6e57', '#1a1a1a'] },
  { id: 'amekaji', name: '美式复古', keywords: ['丹宁', '皮夹克', '工装靴', 'Ametora', '复古美式'], colors: ['#2c3a4a', '#8b5a3c', '#c4a574', '#1a1a1a'] },
  { id: 'salaryman', name: '日系商务', keywords: ['西装', '衬衫', '通勤', '日系商务', '极简正装'], colors: ['#e8eef2', '#3a5060', '#1a1a1a', '#7d6e57'] },
];

const FEMALE_ONLY = new Set(['la-mei', 'pure-desire', 'jk', 'y2k', 'french']);
const MALE_ONLY = new Set(['city-boy', 'amekaji', 'salaryman']);

const OCCASIONS = [
  { key: 'commute', label: '通勤', dressCode: 'smart-casual' },
  { key: 'date', label: '约会', dressCode: 'smart-casual' },
  { key: 'casual', label: '日常', dressCode: 'casual' },
  { key: 'party', label: '派对', dressCode: 'smart-casual' },
];

const GENDERS = ['female', 'male'];
const VARIANTS = 2;
const SLEEP_MS = 4000; // 每次成功后 sleep 4s -> ≈ 15 RPM
const MAX_RETRIES = 8;

// 汇总任务（性别过滤后 176 张）
const allTasks = [];
for (const style of STYLES) {
  for (const oc of OCCASIONS) {
    for (const gender of GENDERS) {
      if (FEMALE_ONLY.has(style.id) && gender !== 'female') continue;
      if (MALE_ONLY.has(style.id) && gender !== 'male') continue;
      for (let v = 0; v < VARIANTS; v++) {
        allTasks.push({ style, oc, gender, variant: v });
      }
    }
  }
}

// 分批
const BATCH_START = parseInt(process.env.BATCH_START || '0', 10);
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || String(allTasks.length), 10);
const tasks = allTasks.slice(BATCH_START, BATCH_START + BATCH_LIMIT);
console.log(`[plan] total=${allTasks.length}, this batch: [${BATCH_START}, ${BATCH_START + tasks.length}) -> ${tasks.length} tasks`);

await fs.mkdir(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let done = 0;
const failed = [];

for (let i = 0; i < tasks.length; i++) {
  const t = tasks[i];
  const { style, oc, gender, variant } = t;
  const filename = `${gender}-${style.id}-${oc.key}-${variant}.webp`;
  const fullpath = path.join(OUT_DIR, filename);

  // 已存在跳过
  try {
    await fs.access(fullpath);
    done++;
    console.log(`[${done}/${tasks.length}] ${filename} (cached)`);
    continue;
  } catch {}

  const variantSeed = (style.id.charCodeAt(0) * 1000 + oc.key.charCodeAt(0) * 100 + (gender === 'male' ? 7 : 3) * 10 + variant) * 100 + variant;

  let lastErr = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stylePackId: style.id + '-regen',
          stylePack: { name: style.name, keywords: style.keywords, colors: style.colors },
          styles: [],
          occasion: oc.label,
          dressCode: oc.dressCode,
          gender,
          weather: { temp: 20 },
          variantSeed,
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        if (r.status === 429 || r.status === 502 || r.status === 504 || /429|RateQuota|Throttling/i.test(txt)) {
          const wait = Math.min(120000, 5000 * Math.pow(1.7, attempt));
          console.warn(`  retry ${attempt + 1}/${MAX_RETRIES} (${r.status}): wait ${(wait / 1000).toFixed(1)}s`);
          await sleep(wait);
          continue;
        }
        throw new Error(`HTTP ${r.status}: ${txt.slice(0, 150)}`);
      }
      const j = await r.json();
      const imgUrl = j.image;
      if (!imgUrl || !imgUrl.startsWith('http')) throw new Error('no image url');
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());

      // sharp 转 webp + 缩到 1024
      const webp = await sharp(buf)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      await fs.writeFile(fullpath, webp);
      done++;
      console.log(`[${done}/${tasks.length}] ${filename} (${(buf.length / 1024).toFixed(0)}KB -> ${(webp.length / 1024).toFixed(0)}KB) try=${attempt + 1}`);
      lastErr = null;
      await sleep(SLEEP_MS);
      break;
    } catch (err) {
      lastErr = err;
      const wait = Math.min(60000, 3000 * Math.pow(1.6, attempt));
      console.warn(`  retry ${attempt + 1}/${MAX_RETRIES}: ${err.message} -> wait ${(wait / 1000).toFixed(1)}s`);
      if (attempt < MAX_RETRIES - 1) await sleep(wait);
    }
  }
  if (lastErr) {
    failed.push({ filename, error: lastErr.message });
    done++;
    console.error(`[${done}/${tasks.length}] ${filename} FAILED: ${lastErr.message}`);
    await sleep(SLEEP_MS);
  }
}

console.log(`\n=== batch done: ${tasks.length - failed.length}/${tasks.length} ===`);
if (failed.length) {
  console.log('failed:', failed.map((f) => f.filename).join(', '));
}
