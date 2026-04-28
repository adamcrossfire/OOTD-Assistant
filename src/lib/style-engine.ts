// ============================================================
// 搭配规则引擎 —— 阶段1 MVP
//
// 输入：用户衣橱 + 场合 + Dress Code + 风格偏好 + 天气
// 输出：3 套 Look，按匹配度排序
//
// 算法：
//   1. 季节/天气过滤  → 不合适的单品先剔除（如冬天不推T恤）
//   2. 类别去重抽样   → 上装+下装+鞋 / 连衣裙+鞋，各类至多 1 件
//   3. 颜色协调评分   → 暖+冷扣分；黑/白/中性百搭加分
//   4. 风格匹配评分   → 单品 styles ∩ 用户偏好 越多越好
//   5. Dress Code 一致性 → 必须严格满足
//
// 后续可升级：用 LLM 重排 + 接入预训练美学评分
// ============================================================

import type {
  Item,
  Look,
  Style,
  DressCode,
  Occasion,
  Weather,
  Season,
} from '../types';
import type { StylePack } from '../../../shared/styles-library';

// ---------- 工具 ----------
const uid = () => Math.random().toString(36).slice(2, 10);

/** 当前季节（按月份） */
export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** 根据气温推断季节（出行模式更准） */
export function getSeasonByTemp(temp: number): Season {
  if (temp >= 25) return 'summer';
  if (temp >= 15) return 'spring';
  if (temp >= 5) return 'autumn';
  return 'winter';
}

/** 季节兼容：单品 vs 当前季节 */
function seasonOk(itemSeason: Season, current: Season): boolean {
  if (itemSeason === 'all') return true;
  return itemSeason === current;
}

/** 颜色协调度评分（0-30） */
function colorScore(items: Item[]): number {
  const families = items.map((i) => i.colorFamily);
  let score = 30;
  // 黑+白+中性 → 安全
  // 暖+冷直接对撞扣分
  const hasWarm = families.includes('warm');
  const hasCool = families.includes('cool');
  if (hasWarm && hasCool) score -= 12;
  // 颜色家族 ≤2 种为佳
  const unique = new Set(families).size;
  if (unique > 3) score -= 8;
  // 全黑/全白略乏味
  if (unique === 1 && (families[0] === 'black' || families[0] === 'white')) score -= 4;
  return Math.max(0, score);
}

/** 风格匹配评分（0-40） */
function styleScore(items: Item[], prefs: Style[]): number {
  if (prefs.length === 0) return 25; // 没偏好就都还行
  let total = 0;
  for (const it of items) {
    const overlap = it.styles.filter((s) => prefs.includes(s)).length;
    total += overlap * 6;
  }
  return Math.min(40, total);
}

/** 天气适配评分（0-30） */
function weatherScore(items: Item[], temp: number, condition?: Weather['condition']): number {
  const season = getSeasonByTemp(temp);
  let score = 30;
  for (const it of items) {
    if (it.season !== 'all' && it.season !== season) score -= 8;
  }
  // 下雨但没穿防水外套 → 扣分
  if (condition === 'rainy') {
    const hasOuter = items.some((i) => i.category === 'outer');
    const waterproof = items.some((i) => i.waterproof);
    if (!waterproof && hasOuter) score -= 6;
    if (!waterproof && !hasOuter) score -= 12;
  }
  return Math.max(0, score);
}

// ---------- 核心：生成搭配 ----------
export interface RecommendInput {
  wardrobe: Item[];
  occasion: Occasion;
  dressCode: DressCode;
  stylePrefs: Style[];
  weather: { temp: number; condition?: Weather['condition'] };
  /** 可选：必带单品（出行模式锁定） */
  lockedItem?: Item;
  /** 生成几套 */
  count?: number;
  /** 可选：今日风格包（小红书风格库 / 自定义），命中关键词加分 */
  stylePack?: StylePack | null;
}

/** 计算单品与风格包的匹配分（0-30） */
function stylePackScore(items: Item[], pack: StylePack | null | undefined): number {
  if (!pack) return 0;
  let score = 0;
  // 色彩家族匹配（0-12）
  if (pack.paletteHint && pack.paletteHint.length > 0) {
    const matched = items.filter((i) => pack.paletteHint!.includes(i.colorFamily as any)).length;
    score += Math.min(12, matched * 4);
  }
  // 子品类名包含关键词（0-12）
  if (pack.keywords && pack.keywords.length > 0) {
    let kwHits = 0;
    for (const it of items) {
      const text = `${it.subCategory} ${it.styles.join(' ')}`.toLowerCase();
      for (const kw of pack.keywords) {
        if (text.includes(kw.toLowerCase())) {
          kwHits++;
          break;
        }
      }
    }
    score += Math.min(12, kwHits * 4);
  }
  // 季节匹配（0-6）
  if (pack.seasons && pack.seasons.length > 0 && !pack.seasons.includes('all')) {
    const seasonOkCount = items.filter((i) => i.season === 'all' || pack.seasons.includes(i.season as any)).length;
    if (seasonOkCount === items.length) score += 6;
    else score += Math.round((seasonOkCount / Math.max(1, items.length)) * 4);
  } else {
    score += 3; // 季节中性
  }
  return score;
}

export function recommendLooks(input: RecommendInput): Look[] {
  const { wardrobe, occasion, dressCode, stylePrefs, weather, lockedItem, count = 3, stylePack } = input;
  const season = getSeasonByTemp(weather.temp);

  // 1) 过滤：Dress Code 必须满足 + 季节兼容
  const pool = wardrobe.filter(
    (i) => i.dressCodes.includes(dressCode) && seasonOk(i.season, season),
  );

  const tops = pool.filter((i) => i.category === 'top');
  const bottoms = pool.filter((i) => i.category === 'bottom');
  const dresses = pool.filter((i) => i.category === 'dress');
  const shoes = pool.filter((i) => i.category === 'shoes');
  const outers = pool.filter((i) => i.category === 'outer');
  const accs = pool.filter((i) => i.category === 'accessory');

  // 是否需要外套
  const needOuter = weather.temp < 18;

  // 候选组合
  type Combo = Item[];
  const combos: Combo[] = [];

  // 路径 A：上装 + 下装 + 鞋
  for (const t of tops.slice(0, 6)) {
    for (const b of bottoms.slice(0, 5)) {
      for (const s of shoes.slice(0, 3)) {
        const set: Item[] = [t, b, s];
        if (needOuter && outers[0]) set.push(outers[0]);
        if (accs[0]) set.push(accs[0]);
        combos.push(set);
      }
    }
  }
  // 路径 B：连衣裙 + 鞋（仅在女士 + 春夏秋）
  for (const d of dresses.slice(0, 4)) {
    for (const s of shoes.slice(0, 3)) {
      const set: Item[] = [d, s];
      if (needOuter && outers[0]) set.push(outers[0]);
      if (accs[0]) set.push(accs[0]);
      combos.push(set);
    }
  }

  // 锁定单品过滤
  let candidates = combos;
  if (lockedItem) {
    candidates = combos.filter((c) => c.some((i) => i.id === lockedItem.id));
    // 如果锁了某件但本路径没采到 → 强制注入到第一类
    if (candidates.length === 0) {
      candidates = combos.map((c) => {
        const replaced = c.filter((i) => i.category !== lockedItem.category);
        return [lockedItem, ...replaced];
      });
    }
  }

  // 2) 评分
  const scored = candidates.map((items) => {
    const cs = colorScore(items);
    const ss = styleScore(items, stylePrefs);
    const ws = weatherScore(items, weather.temp, weather.condition);
    const ps = stylePackScore(items, stylePack);
    const score = Math.min(100, cs + ss + ws + ps);
    return { items, cs, ss, ws, ps, score };
  });

  // 3) 去重 & 排序：避免推完全一样的上下装组合
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const picked: typeof scored = [];
  for (const c of scored) {
    const key = c.items
      .map((i) => i.id)
      .sort()
      .join('|');
    // 避免顶部和底部相同的重复组合
    const topBotKey = c.items
      .filter((i) => i.category === 'top' || i.category === 'bottom' || i.category === 'dress')
      .map((i) => i.id)
      .sort()
      .join('|');
    if (seen.has(key) || seen.has(topBotKey)) continue;
    seen.add(key);
    seen.add(topBotKey);
    picked.push(c);
    if (picked.length >= count) break;
  }

  // 4) 包装 Look
  return picked.map((p) => {
    const styles = Array.from(new Set(p.items.flatMap((i) => i.styles)));
    const reason = buildReason(p.cs, p.ss, p.ws, weather);
    const hint = buildMissingHint(p.items, weather, dressCode);
    return {
      id: uid(),
      items: p.items,
      occasion,
      dressCode,
      weatherRange: { min: weather.temp - 4, max: weather.temp + 4 },
      styles,
      score: Math.round(p.score),
      reason,
      missingHint: hint,
    };
  });
}

function buildReason(cs: number, ss: number, ws: number, w: { condition?: Weather['condition'] }): string {
  const bits: string[] = [];
  if (cs >= 25) bits.push('色彩协调');
  else if (cs <= 18) bits.push('色彩稍冲突');
  if (ss >= 30) bits.push('风格契合度高');
  else if (ss >= 18) bits.push('风格基本匹配');
  if (ws >= 26) bits.push('温度适配');
  else if (ws <= 18) bits.push('注意保暖');
  if (w.condition === 'rainy') bits.push('考虑了雨天');
  return bits.join('・') || '基础搭配';
}

function buildMissingHint(items: Item[], w: { condition?: Weather['condition'] }, _dc: DressCode): string | undefined {
  if (w.condition === 'rainy' && !items.some((i) => i.waterproof)) {
    return '雨天建议添置一件防水外套';
  }
  if (!items.some((i) => i.category === 'shoes')) {
    return '衣橱缺少合适的鞋款';
  }
  return undefined;
}

// ============================================================
// 出行模式：生成每日穿搭 + 装箱清单
// ============================================================

export interface TripPlanInput {
  wardrobe: Item[];
  weather: Weather[];
  purpose: 'business' | 'leisure' | 'mixed';
  stylePrefs: Style[];
  lockedItemIds: string[];
  luggageType: 'cabin' | 'check-in';
}

export function planTrip(input: TripPlanInput): { dailyLooks: Look[]; packingList: Item[] } {
  const { wardrobe, weather, purpose, stylePrefs, lockedItemIds, luggageType } = input;
  const lockedItems = wardrobe.filter((i) => lockedItemIds.includes(i.id));

  // 出差或混合 → 至少有一天用 formal
  const dressByPurpose = (i: number): DressCode => {
    if (purpose === 'business') return i === 0 ? 'formal' : 'smart-casual';
    if (purpose === 'mixed') return i % 3 === 0 ? 'smart-casual' : 'casual';
    return 'casual';
  };

  const dailyLooks: Look[] = weather.map((w, i) => {
    const looks = recommendLooks({
      wardrobe,
      occasion: 'travel',
      dressCode: dressByPurpose(i),
      stylePrefs,
      weather: { temp: (w.tempHigh + w.tempLow) / 2, condition: w.condition },
      lockedItem: lockedItems[i % Math.max(1, lockedItems.length)],
      count: 1,
    });
    return looks[0];
  }).filter(Boolean);

  // 收集所有用到的单品 → 装箱清单（去重）
  const packed = new Map<string, Item>();
  for (const l of dailyLooks) {
    if (!l) continue;
    for (const it of l.items) packed.set(it.id, it);
  }
  // 必带项强制纳入
  for (const it of lockedItems) packed.set(it.id, it);

  let list = Array.from(packed.values());

  // 登机箱限制：≤8件，优先剔除重复类别的低频单品
  if (luggageType === 'cabin' && list.length > 8) {
    list = list
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, 8);
  }

  return { dailyLooks: dailyLooks.filter(Boolean) as Look[], packingList: list };
}

// ============================================================
// 出行模式 B：仅从「必带单品」反推 —— 不使用全衣橱
// 适用：用户明确选了 N 件必带单品，在这 N 件里交换搭配
// ============================================================

export interface TripPlanFromLockedInput {
  /** 必带单品（用户选中的那几件，所有天都从这里选） */
  lockedItems: Item[];
  weather: Weather[];
  purpose: 'business' | 'leisure' | 'mixed';
  stylePrefs: Style[];
  luggageType: 'cabin' | 'check-in';
}

export function planTripFromLocked(input: TripPlanFromLockedInput): { dailyLooks: Look[]; packingList: Item[] } {
  const { lockedItems, weather, purpose, stylePrefs, luggageType } = input;

  if (lockedItems.length === 0) {
    return { dailyLooks: [], packingList: [] };
  }

  // 按类别分组
  const tops = lockedItems.filter((i) => i.category === 'top');
  const bottoms = lockedItems.filter((i) => i.category === 'bottom');
  const dresses = lockedItems.filter((i) => i.category === 'dress');
  const shoes = lockedItems.filter((i) => i.category === 'shoes');
  const outers = lockedItems.filter((i) => i.category === 'outer');
  const accs = lockedItems.filter((i) => i.category === 'accessory');

  const dressByPurpose = (i: number): DressCode => {
    if (purpose === 'business') return i === 0 ? 'formal' : 'smart-casual';
    if (purpose === 'mixed') return i % 3 === 0 ? 'smart-casual' : 'casual';
    return 'casual';
  };

  // 为每一天从 locked 里轮换选品
  const dailyLooks: Look[] = weather.map((w, i) => {
    const avgT = (w.tempHigh + w.tempLow) / 2;
    const needOuter = avgT < 18;

    const set: Item[] = [];
    let dressed = false;

    // 连衣裙优先（如果有 + 天气合适 + 按周期轮换）
    if (dresses.length > 0 && avgT >= 12 && i % 3 === 1) {
      set.push(dresses[i % dresses.length]);
      dressed = true;
    }

    if (!dressed) {
      if (tops.length > 0) set.push(tops[i % tops.length]);
      if (bottoms.length > 0) set.push(bottoms[i % bottoms.length]);
    }

    if (shoes.length > 0) set.push(shoes[i % shoes.length]);
    if (needOuter && outers.length > 0) set.push(outers[i % outers.length]);
    if (accs.length > 0) set.push(accs[i % accs.length]);

    if (set.length === 0) return null;

    const styles = Array.from(new Set(set.flatMap((it) => it.styles)));
    return {
      id: uid(),
      items: set,
      occasion: 'travel' as Occasion,
      dressCode: dressByPurpose(i),
      weatherRange: { min: avgT - 4, max: avgT + 4 },
      styles,
      score: Math.round(70 + Math.min(20, styleScore(set, stylePrefs) / 2)),
      reason: '从你选的必带单品里轮换搭配',
    } as Look;
  }).filter((l): l is Look => Boolean(l));

  // 装箱清单 = 必带单品全集（可能从未上身但依然带上）
  let list = [...lockedItems];
  if (luggageType === 'cabin' && list.length > 8) {
    // 超出登机箱上限，按 wearCount 优先保留
    list = list.sort((a, b) => b.wearCount - a.wearCount).slice(0, 8);
  }

  return { dailyLooks, packingList: list };
}
