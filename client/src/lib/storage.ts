// ============================================================
// 本地持久化层 —— 阶段2 过渡方案
//
// 目标：
//   - 用 localStorage 保存性别 / 衣橱 / 收藏 / 城市等用户数据
//   - 数据结构按 Supabase 表结构对齐，将来一行切换到云端
//
// 未来切换到 Supabase 时：
//   - 把 readKey/writeKey 替换成 supabase.from(table).select/upsert
//   - 不需要改业务代码
// ============================================================

import type { Gender, Item, Look } from '../types';

const NS = 'ootd:v1:';

/** 内部读：JSON 反序列化失败时回退默认值 */
function readKey<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('[storage] read failed', key, e);
    return fallback;
  }
}

/** 内部写 */
function writeKey<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] write failed', key, e);
  }
}

// ---------- 用户偏好 ----------
export const storage = {
  getGender: () => readKey<Gender | null>('gender', null),
  setGender: (g: Gender | null) => writeKey('gender', g),

  getCity: () => readKey<string | null>('city', null),
  setCity: (c: string | null) => writeKey('city', c),

  // ---------- 衣橱 ----------
  getWardrobe: () => readKey<Item[] | null>('wardrobe', null),
  setWardrobe: (items: Item[]) => writeKey('wardrobe', items),

  // ---------- 收藏 ----------
  getFavorites: () => readKey<Look[]>('favorites', []),
  setFavorites: (looks: Look[]) => writeKey('favorites', looks),

  // ---------- 历史 Look（最近30天） ----------
  getHistory: () => readKey<Look[]>('history', []),
  pushHistory: (l: Look) => {
    const list = readKey<Look[]>('history', []);
    list.unshift(l);
    writeKey('history', list.slice(0, 50));
  },

  // ---------- 全部清除（设置页用） ----------
  clearAll: () => {
    if (typeof window === 'undefined') return;
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => window.localStorage.removeItem(k));
  },
};
