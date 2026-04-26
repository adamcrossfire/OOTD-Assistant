// 出行模式：输入目的地+天数+目的+行李 → 生成每日穿搭日历 + 装箱清单
// 阶段2：城市自动补全 + 真实天气拉取
import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { planTrip } from '../lib/style-engine';
import { getMockWeather } from '../lib/mock-data';
import { searchCity, fetchWeather, CityResult } from '../lib/weather-api';
import type { Look, Item, Style, Weather } from '../types';
import { Luggage, MapPin, Sparkles, ChevronDown, ChevronUp, Lock, Sun, Cloud, CloudRain, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STYLES: { value: Style; label: string }[] = [
  { value: 'minimal', label: '极简' },
  { value: 'oldmoney', label: '老钱风' },
  { value: 'street', label: '街头' },
  { value: 'business', label: '商务' },
  { value: 'japanese', label: '日系' },
];

const W_ICON = { sunny: Sun, cloudy: Cloud, rainy: CloudRain, snowy: Cloud, windy: Cloud };

export function Travel() {
  const { wardrobe } = useApp();
  const { toast } = useToast();

  const [destination, setDestination] = useState('东京');
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [days, setDays] = useState(5);
  const [purpose, setPurpose] = useState<'business' | 'leisure' | 'mixed'>('mixed');
  const [luggage, setLuggage] = useState<'cabin' | 'check-in'>('cabin');
  const [stylePrefs, setStylePrefs] = useState<Style[]>(['minimal']);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [showLockPicker, setShowLockPicker] = useState(false);

  const [weather, setWeatherList] = useState<Weather[]>([]);
  const [loadingWx, setLoadingWx] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ dailyLooks: Look[]; packing: Item[] } | null>(null);

  // —— 目的地搜索（防抖 350ms） ——
  useEffect(() => {
    if (!destination.trim() || destCoords) return;
    const timer = setTimeout(async () => {
      const list = await searchCity(destination);
      setCitySuggestions(list);
    }, 350);
    return () => clearTimeout(timer);
  }, [destination, destCoords]);

  // —— 选定城市后拉真实7日天气 ——
  useEffect(() => {
    if (!destCoords) {
      setWeatherList(getMockWeather(destination).slice(0, days));
      return;
    }
    let cancelled = false;
    setLoadingWx(true);
    fetchWeather(destCoords.lat, destCoords.lon, destination)
      .then((list) => {
        if (!cancelled) setWeatherList(list.slice(0, days));
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
    setGenerating(true);
    const wx = weather.length > 0 ? weather : getMockWeather(destination).slice(0, days);
    const r = planTrip({
      wardrobe,
      weather: wx,
      purpose,
      stylePrefs,
      lockedItemIds: lockedIds,
      luggageType: luggage,
    });
    setResult({ dailyLooks: r.dailyLooks, packing: r.packingList });
    setGenerating(false);
    toast({ title: '行程已生成', description: `共 ${r.packingList.length} 件衣物入箱` });
  };

  const toggleStyle = (s: Style) => {
    setStylePrefs((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const toggleLock = (id: string) => {
    setLockedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <h1 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Luggage className="h-4 w-4 text-primary" />
          出行装
        </h1>
        <p className="text-xs text-muted-foreground">告诉我你要去哪 · AI 帮你搞定行李箱</p>
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
                  setDestCoords(null); // 重新输入需要重新搜城市
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
            {/* 城市建议下拉 */}
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
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(7, +e.target.value || 1)))}
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
            className="w-full flex items-center justify-between p-3 rounded-xl border border-card-border bg-card hover-elevate"
          >
            <span className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              必带单品（{lockedIds.length}）
            </span>
            {showLockPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showLockPicker && (
            <div className="mt-2 grid grid-cols-4 gap-2 p-2 rounded-xl bg-card border border-card-border">
              {wardrobe.map((it) => {
                const locked = lockedIds.includes(it.id);
                return (
                  <button
                    key={it.id}
                    data-testid={`lock-${it.id}`}
                    onClick={() => toggleLock(it.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 hover-elevate ${
                      locked ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={it.photoUrl} alt={it.subCategory} className="w-full h-full object-contain bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-1" />
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
        </section>

        {/* 天气预览 */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            未来 {days} 天天气
            {loadingWx && <Loader2 className="h-3 w-3 animate-spin" />}
            {destCoords && !loadingWx && (
              <span className="text-[10px] text-primary normal-case font-medium">· Open-Meteo 实时</span>
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
      </div>
    </div>
  );
}
