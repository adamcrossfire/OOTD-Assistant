// 出行模式：双模式（智能推荐 / 从必带单品）+ 固定行装收藏
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { planTrip, planTripFromLocked } from '../lib/style-engine';
import { getMockWeather } from '../lib/mock-data';
import { searchCity, fetchWeather, CityResult } from '../lib/weather-api';
import type { Look, Item, Style, Weather, SavedTrip, Category } from '../types';
import {
  Luggage, MapPin, Sparkles, ChevronDown, ChevronUp, Lock, Sun, Cloud, CloudRain,
  Loader2, Bookmark, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STYLES: { value: Style; label: string }[] = [
  { value: 'minimal', label: '极简' },
  { value: 'oldmoney', label: '老钱风' },
  { value: 'street', label: '街头' },
  { value: 'business', label: '商务' },
  { value: 'japanese', label: '日系' },
];

const W_ICON = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, snowy: Cloud, windy: Cloud };

type Mode = 'smart' | 'from-locked';

const uid = () => Math.random().toString(36).slice(2, 10);

export function Travel() {
  const { wardrobe, addSavedTrip, savedTrips } = useApp();
  const { toast } = useToast();

  // —— 模式 ——
  const [mode, setMode] = useState<Mode>('smart');

  // —— 表单 state ——
  const [destination, setDestination] = useState('东京');
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [days, setDays] = useState(5);
  // 独立的字符串 state 让输入框可以临时为空（便于全删后重新输入）
  const [daysInputStr, setDaysInputStr] = useState('5');
  const [purpose, setPurpose] = useState<'business' | 'leisure' | 'mixed'>('mixed');
  const [luggage, setLuggage] = useState<'cabin' | 'check-in'>('cabin');
  const [stylePrefs, setStylePrefs] = useState<Style[]>(['minimal']);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [showLockPicker, setShowLockPicker] = useState(false);

  const [weather, setWeatherList] = useState<Weather[]>([]);
  const [loadingWx, setLoadingWx] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ dailyLooks: Look[]; packing: Item[] } | null>(null);

  // —— 保存方案弹窗 ——
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');

  // —— 接收来自收藏页的载入信号 ——
  useEffect(() => {
    const onLoad = (ev: Event) => {
      const trip = (ev as CustomEvent<SavedTrip>).detail;
      if (!trip) return;
      // 用 wardrobe 当前可用 ID 过滤（某些单品可能已被删）
      const validLocked = trip.lockedItemIds.filter((id) => wardrobe.some((w) => w.id === id));
      setMode(trip.mode);
      setDestination(trip.destination);
      setDestCoords(trip.destCoords ?? null);
      setDays(trip.days);
      setDaysInputStr(String(trip.days));
      setPurpose(trip.purpose);
      setLuggage(trip.luggage);
      setStylePrefs(trip.stylePrefs);
      setLockedIds(validLocked);
      setResult(null);
      toast({
        title: `已载入「${trip.name}」`,
        description: '将根据当前天气重新生成搭配',
      });
    };
    window.addEventListener('ootd:load-trip', onLoad);
    return () => window.removeEventListener('ootd:load-trip', onLoad);
  }, [wardrobe, toast]);

  // —— 目的地搜索（防抖 350ms） ——
  useEffect(() => {
    if (!destination.trim() || destCoords) return;
    const timer = setTimeout(async () => {
      const list = await searchCity(destination);
      setCitySuggestions(list);
    }, 350);
    return () => clearTimeout(timer);
  }, [destination, destCoords]);

  // —— 选定城市后拉真实天气 ——
  useEffect(() => {
    if (!destCoords) {
      setWeatherList(getMockWeather(destination, undefined, days));
      return;
    }
    let cancelled = false;
    setLoadingWx(true);
    fetchWeather(destCoords.lat, destCoords.lon, destination, days)
      .then((list) => {
        if (!cancelled) setWeatherList(list);
      })
      .finally(() => !cancelled && setLoadingWx(false));
    return () => {
      cancelled = true;
    };
  }, [destCoords, days, destination]);

  const pickCity = (c: CityResult) => {
    setDestination(c.name);
    setDestCoords({ lat: c.latitude, lon: c.longitude });
    setCitySuggestions([]);
  };

  const handleGenerate = async () => {
    if (mode === 'from-locked' && lockedIds.length === 0) {
      toast({ title: '请先选必带单品', description: '此模式只在你选的单品里搭配', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const wx = weather.length > 0 ? weather : getMockWeather(destination).slice(0, days);

    if (mode === 'from-locked') {
      const lockedItems = wardrobe.filter((i) => lockedIds.includes(i.id));
      const r = planTripFromLocked({
        lockedItems,
        weather: wx,
        purpose,
        stylePrefs,
        luggageType: luggage,
      });
      setResult({ dailyLooks: r.dailyLooks, packing: r.packingList });
      toast({ title: '行程已生成', description: `从 ${lockedItems.length} 件必带单品里搭配` });
    } else {
      const r = planTrip({
        wardrobe,
        weather: wx,
        purpose,
        stylePrefs,
        lockedItemIds: lockedIds,
        luggageType: luggage,
      });
      setResult({ dailyLooks: r.dailyLooks, packing: r.packingList });
      toast({ title: '行程已生成', description: `共 ${r.packingList.length} 件衣物入箱` });
    }
    setGenerating(false);
  };

  const toggleStyle = (s: Style) => {
    setStylePrefs((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const toggleLock = (id: string) => {
    setLockedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handleSaveTrip = () => {
    const name = saveName.trim() || `${destination} ${days}天`;
    const trip: SavedTrip = {
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
      destination,
      destCoords: destCoords ?? undefined,
      days,
      purpose,
      luggage,
      stylePrefs,
      lockedItemIds: lockedIds,
      mode,
    };
    addSavedTrip(trip);
    setShowSaveDialog(false);
    setSaveName('');
    toast({ title: '已加入固定行装', description: `${name} · 在「收藏」可一键复用` });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <h1 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Luggage className="h-4 w-4 text-primary" />
          出行装
        </h1>
        <p className="text-xs text-muted-foreground">告诉我你要去哪 · AI 帮你搞定行李箱</p>

        {/* 模式 Tab */}
        <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-card border border-card-border">
          <button
            data-testid="tab-mode-smart"
            onClick={() => setMode('smart')}
            className={`py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'smart' ? 'bg-foreground text-background' : 'text-muted-foreground hover-elevate'
            }`}
          >
            智能推荐
          </button>
          <button
            data-testid="tab-mode-locked"
            onClick={() => setMode('from-locked')}
            className={`py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'from-locked' ? 'bg-foreground text-background' : 'text-muted-foreground hover-elevate'
            }`}
          >
            从单品生成
          </button>
        </div>
        <div className="mt-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold text-primary">{mode === 'smart' ? '智能推荐：' : '从单品生成：'}</span>
            {mode === 'smart'
              ? '根据目的地、天气、风格偏好，从全衣橱挑选并搭配'
              : '只在你选的单品里轮换搭配（适合精打细算的精简党）'}
          </p>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-5">
        {/* 目的地 + 天数 */}
        <section className="grid grid-cols-2 gap-3">
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">目的地</label>
            <div className="mt-1.5 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                data-testid="input-destination"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setDestCoords(null);
                }}
                placeholder="东京、巴黎、北京…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-card-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
              {destCoords && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  ✓ 真实天气
                </span>
              )}
            </div>
            {citySuggestions.length > 0 && !destCoords && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-card rounded-xl border border-card-border shadow-lg overflow-hidden">
                {citySuggestions.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    data-testid={`city-suggest-${c.id}`}
                    onClick={() => pickCity(c)}
                    className="w-full text-left px-3 py-2 hover-elevate border-b border-card-border last:border-0"
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[c.admin1, c.country].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">天数</label>
            <input
              data-testid="input-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              value={daysInputStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value;
                // 允许空值中间态，让用户可以删净后重新输入
                if (raw === '') {
                  setDaysInputStr('');
                  return;
                }
                const n = parseInt(raw, 10);
                if (Number.isNaN(n)) return;
                const clamped = Math.max(1, Math.min(30, n));
                setDaysInputStr(String(clamped));
                setDays(clamped);
              }}
              onBlur={() => {
                // 失焦时若为空，回填当前 days
                if (daysInputStr === '') setDaysInputStr(String(days));
              }}
              placeholder="1-30"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-card-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </section>

        {/* 目的 */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">目的</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {([
              { v: 'business' as const, l: '商务' },
              { v: 'leisure' as const, l: '休闲' },
              { v: 'mixed' as const, l: '混合' },
            ]).map((p) => (
              <button
                key={p.v}
                data-testid={`button-purpose-${p.v}`}
                onClick={() => setPurpose(p.v)}
                className={`py-2 rounded-xl border text-sm hover-elevate ${
                  purpose === p.v ? 'bg-foreground text-background border-foreground font-semibold' : 'bg-card border-card-border'
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </section>

        {/* 行李 */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">行李类型</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([
              { v: 'cabin' as const, l: '只带登机箱', d: '≤ 8 件衣物' },
              { v: 'check-in' as const, l: '托运行李', d: '不限' },
            ]).map((p) => (
              <button
                key={p.v}
                data-testid={`button-luggage-${p.v}`}
                onClick={() => setLuggage(p.v)}
                className={`p-3 rounded-xl border text-sm text-left hover-elevate ${
                  luggage === p.v ? 'bg-primary/10 border-primary' : 'bg-card border-card-border'
                }`}
              >
                <div className={`font-semibold ${luggage === p.v ? 'text-primary' : ''}`}>{p.l}</div>
                <div className="text-xs text-muted-foreground">{p.d}</div>
              </button>
            ))}
          </div>
        </section>

        {/* 风格 */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">风格偏好</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {STYLES.map((s) => {
              const active = stylePrefs.includes(s.value);
              return (
                <button
                  key={s.value}
                  data-testid={`travel-style-${s.value}`}
                  onClick={() => toggleStyle(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs border hover-elevate ${
                    active ? 'bg-primary/10 border-primary text-primary font-semibold' : 'bg-card border-card-border text-muted-foreground'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 必带单品 */}
        <section>
          <button
            data-testid="button-toggle-lock"
            onClick={() => setShowLockPicker((v) => !v)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border bg-card hover-elevate ${
              mode === 'from-locked' && lockedIds.length === 0 ? 'border-primary' : 'border-card-border'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              {mode === 'from-locked' ? '必选 · 单品' : '必带单品（选填）'}
              <span className={`text-xs ${lockedIds.length > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                ({lockedIds.length})
              </span>
            </span>
            {showLockPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {mode === 'from-locked' && lockedIds.length === 0 && (
            <p className="mt-1.5 text-[11px] text-primary">此模式下至少要选 1 件单品才能生成</p>
          )}
          {showLockPicker && (
            <div className="mt-2 p-3 rounded-xl bg-card border border-card-border space-y-3">
              {([
                { key: 'top-group', label: '上衣', match: (c: Category) => c === 'top' || c === 'outer' || c === 'dress' },
                { key: 'bottom-group', label: '裤子', match: (c: Category) => c === 'bottom' },
                { key: 'shoes-group', label: '鞋子', match: (c: Category) => c === 'shoes' },
              ] as const).map((group) => {
                const items = wardrobe.filter((it) => group.match(it.category));
                return (
                  <div key={group.key} className="flex items-center gap-3">
                    <div className="shrink-0 w-10 text-center">
                      <span className="text-xs font-semibold text-foreground">{group.label}</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="flex-1 text-[11px] text-muted-foreground py-3 text-center bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] rounded-lg">
                        衣橱里还没有{group.label}
                      </div>
                    ) : (
                      <div
                        data-testid={`lock-row-${group.key}`}
                        className="flex-1 flex gap-2 overflow-x-auto pb-1 -mr-1 pr-1 snap-x"
                        style={{ scrollbarWidth: 'thin' }}
                      >
                        {items.map((it) => {
                          const locked = lockedIds.includes(it.id);
                          return (
                            <button
                              key={it.id}
                              data-testid={`lock-${it.id}`}
                              onClick={() => toggleLock(it.id)}
                              className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 hover-elevate snap-start ${
                                locked ? 'border-primary' : 'border-transparent'
                              }`}
                            >
                              <img
                                src={it.photoUrl}
                                alt={it.subCategory}
                                className="w-full h-full object-contain bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-1"
                              />
                              {locked && (
                                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground pl-1">
                左右滑动浏览，点击勾选·配饰不在这里，如需以后可手动添加
              </p>
            </div>
          )}
        </section>

        {/* 天气预览 */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 flex-wrap">
            未来 {days} 天天气
            {loadingWx && <Loader2 className="h-3 w-3 animate-spin" />}
            {destCoords && !loadingWx && (
              <span className="text-[10px] text-primary normal-case font-medium">· Open-Meteo 实时</span>
            )}
            {days > 16 && (
              <span className="text-[10px] text-muted-foreground normal-case font-medium">· 后 {days - 16} 天为同期均值</span>
            )}
          </h2>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {weather.map((w) => {
              const Icon = W_ICON[w.condition];
              const d = new Date(w.date);
              return (
                <div key={w.date} className="shrink-0 w-16 rounded-xl bg-card border border-card-border p-2 text-center">
                  <div className="text-[11px] text-muted-foreground">{d.getMonth() + 1}/{d.getDate()}</div>
                  <Icon className="h-4 w-4 mx-auto my-1 text-primary" />
                  <div className="text-xs font-semibold">{w.tempLow}°-{w.tempHigh}°</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 生成按钮 */}
        <button
          data-testid="button-generate-trip"
          onClick={handleGenerate}
          disabled={generating || loadingWx}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover-elevate active-elevate-2 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          生成出行清单
        </button>

        {/* 结果展示 */}
        {result && (
          <>
            {/* 保存为固定行装 */}
            <button
              data-testid="button-save-trip"
              onClick={() => {
                setSaveName(`${destination} ${days}天`);
                setShowSaveDialog(true);
              }}
              className="w-full py-3 rounded-xl bg-card border-2 border-dashed border-primary/40 text-primary font-semibold flex items-center justify-center gap-2 hover-elevate"
            >
              <Bookmark className="h-4 w-4" />
              保存为固定行装
            </button>

            {/* 装箱清单 */}
            <section>
              <h2 className="text-base font-semibold tracking-tight mb-2">装箱清单</h2>
              <div className="rounded-2xl bg-card border border-card-border p-3">
                <div className="grid grid-cols-4 gap-2">
                  {result.packing.map((it) => (
                    <div key={it.id} className="aspect-square rounded-lg overflow-hidden bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-1.5">
                      <img src={it.photoUrl} alt={it.subCategory} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  共 {result.packing.length} 件 · {luggage === 'cabin' ? '登机箱' : '托运'}友好
                </p>
              </div>
            </section>

            {/* 每日穿搭 */}
            <section>
              <h2 className="text-base font-semibold tracking-tight mb-2">每日穿搭日历</h2>
              <div className="space-y-3">
                {result.dailyLooks.map((look, i) => {
                  const w = weather[i];
                  if (!w) return null;
                  const Icon = W_ICON[w.condition];
                  const d = new Date(w.date);
                  return (
                    <div
                      key={look.id}
                      className="rounded-2xl bg-card border border-card-border overflow-hidden"
                      data-testid={`day-${i}`}
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] border-b border-card-border">
                        <div className="text-sm font-semibold">
                          DAY {i + 1} · {d.getMonth() + 1}/{d.getDate()}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {w.tempLow}°-{w.tempHigh}°
                        </div>
                      </div>
                      <div className="p-3 grid grid-cols-3 gap-2">
                        {look.items.slice(0, 3).map((it) => (
                          <div key={it.id} className="aspect-square rounded-lg overflow-hidden bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-1.5">
                            <img src={it.photoUrl} alt={it.subCategory} className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pb-3">
                        <div className="text-xs text-muted-foreground">
                          {look.items.map((i) => i.subCategory).join(' · ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* 已保存方案提示 */}
        {savedTrips.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            已收藏 {savedTrips.length} 套固定行装 · 去「收藏」一键复用
          </p>
        )}
      </div>

      {/* 保存方案弹窗 */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">保存为固定行装</h3>
              <button
                data-testid="button-close-save"
                onClick={() => setShowSaveDialog(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover-elevate"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              起个好记的名字，下次出差直接载入即可（重新拉天气，不用反复填）
            </p>
            <input
              data-testid="input-trip-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="例如：东京出差 5 天"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              autoFocus
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="py-2.5 rounded-xl border border-card-border text-sm hover-elevate"
              >
                取消
              </button>
              <button
                data-testid="button-confirm-save"
                onClick={handleSaveTrip}
                className="py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover-elevate"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
