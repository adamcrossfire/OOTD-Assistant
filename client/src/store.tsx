// ============================================================
// 全局状态：性别 / 衣橱 / 收藏 / 出行计划 / 城市 / 历史
// 阶段2：所有状态自动落 localStorage，跨刷新保留
//
// 未来接 Supabase 时，把 storage.* 替换为远程调用即可
// ============================================================

import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import type { Gender, Item, Look, SavedTrip, Trip, Weather } from './types';
import { getMockItems } from './lib/mock-data';
import { storage } from './lib/storage';

interface AppState {
  // 用户基础
  gender: Gender | null;
  setGender: (g: Gender) => void;

  // 城市 + 实时天气（首页/出行用）
  city: string;
  setCity: (c: string) => void;
  weather: Weather[];
  setWeather: (w: Weather[]) => void;

  // 衣橱
  wardrobe: Item[];
  addItem: (it: Item) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;

  // 收藏
  favoriteLooks: Look[];
  saveFavorite: (l: Look) => void;
  removeFavorite: (id: string) => void;

  // 历史
  history: Look[];
  pushHistory: (l: Look) => void;

  // 出行
  currentTrip: Trip | null;
  setCurrentTrip: (t: Trip | null) => void;

  // 固定行装
  savedTrips: SavedTrip[];
  addSavedTrip: (t: SavedTrip) => void;
  removeSavedTrip: (id: string) => void;

  // 本人照片 + 试穿缓存
  selfPortrait: string | null;            // base64 dataURL
  setSelfPortrait: (d: string | null) => void;
  tryOnCache: Record<string, string>;     // key = `${lookId}:${mode}`
  setTryOnCacheEntry: (key: string, dataUrl: string) => void;

  // 重置（设置页 / 切换性别用）
  resetAll: () => void;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // —— 初始化：从 localStorage 恢复 ——
  const [gender, setGenderState] = useState<Gender | null>(() => storage.getGender());
  const [city, setCityState] = useState<string>(() => storage.getCity() ?? '上海');
  const [weather, setWeatherState] = useState<Weather[]>([]);
  const [wardrobe, setWardrobe] = useState<Item[]>(() => {
    const saved = storage.getWardrobe();
    if (saved && saved.length > 0) return saved;
    const g = storage.getGender();
    return g ? getMockItems(g) : [];
  });
  const [favoriteLooks, setFavoriteLooks] = useState<Look[]>(() => storage.getFavorites());
  const [history, setHistory] = useState<Look[]>(() => storage.getHistory());
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => storage.getSavedTrips());
  const [selfPortrait, setSelfPortraitState] = useState<string | null>(() => storage.getSelfPortrait());
  const [tryOnCache, setTryOnCacheState] = useState<Record<string, string>>(() => storage.getTryOnCache());

  // —— 自动持久化 ——
  useEffect(() => storage.setGender(gender), [gender]);
  useEffect(() => storage.setCity(city), [city]);
  useEffect(() => storage.setWardrobe(wardrobe), [wardrobe]);
  useEffect(() => storage.setFavorites(favoriteLooks), [favoriteLooks]);
  useEffect(() => storage.setSelfPortrait(selfPortrait), [selfPortrait]);
  useEffect(() => storage.setTryOnCache(tryOnCache), [tryOnCache]);
  useEffect(() => storage.setSavedTrips(savedTrips), [savedTrips]);

  // —— Actions ——
  const setGender = (g: Gender) => {
    setGenderState(g);
    // 首次选择性别时加载默认衣橱
    const saved = storage.getWardrobe();
    if (!saved || saved.length === 0) {
      setWardrobe(getMockItems(g));
    }
  };

  const setCity = (c: string) => setCityState(c);
  const setWeather = (w: Weather[]) => setWeatherState(w);

  const addItem = (it: Item) => setWardrobe((prev) => [it, ...prev]);
  const updateItem = (id: string, patch: Partial<Item>) =>
    setWardrobe((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setWardrobe((prev) => prev.filter((i) => i.id !== id));

  const saveFavorite = (l: Look) =>
    setFavoriteLooks((prev) => (prev.find((p) => p.id === l.id) ? prev : [l, ...prev]));
  const removeFavorite = (id: string) =>
    setFavoriteLooks((prev) => prev.filter((l) => l.id !== id));

  const pushHistory = (l: Look) => {
    setHistory((prev) => {
      const next = [l, ...prev].slice(0, 50);
      storage.pushHistory(l);
      return next;
    });
  };

  const addSavedTrip = (t: SavedTrip) =>
    setSavedTrips((prev) => [t, ...prev.filter((p) => p.id !== t.id)]);
  const removeSavedTrip = (id: string) =>
    setSavedTrips((prev) => prev.filter((t) => t.id !== id));

  const setSelfPortrait = (d: string | null) => setSelfPortraitState(d);
  const setTryOnCacheEntry = (key: string, dataUrl: string) =>
    setTryOnCacheState((prev) => ({ ...prev, [key]: dataUrl }));

  const resetAll = () => {
    storage.clearAll();
    setGenderState(null);
    setCityState('上海');
    setWardrobe([]);
    setFavoriteLooks([]);
    setHistory([]);
    setCurrentTrip(null);
    setSavedTrips([]);
    setWeatherState([]);
    setSelfPortraitState(null);
    setTryOnCacheState({});
  };

  const value = useMemo<AppState>(
    () => ({
      gender,
      setGender,
      city,
      setCity,
      weather,
      setWeather,
      wardrobe,
      addItem,
      updateItem,
      removeItem,
      favoriteLooks,
      saveFavorite,
      removeFavorite,
      history,
      pushHistory,
      currentTrip,
      setCurrentTrip,
      savedTrips,
      addSavedTrip,
      removeSavedTrip,
      selfPortrait,
      setSelfPortrait,
      tryOnCache,
      setTryOnCacheEntry,
      resetAll,
    }),
    [gender, city, weather, wardrobe, favoriteLooks, history, currentTrip, savedTrips, selfPortrait, tryOnCache],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
