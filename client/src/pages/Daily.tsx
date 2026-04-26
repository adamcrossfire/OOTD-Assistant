// 日常搭配页：选场景 + DressCode + 风格 → 生成 3 套 Look
// 阶段2：接入真实天气 API + LLM 风评论
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { WeatherCard } from '../components/WeatherCard';
import { LookCard } from '../components/LookCard';
import { Logo } from '../components/Logo';
import { recommendLooks } from '../lib/style-engine';
import { getWeatherByCity } from '../lib/weather-api';
import type { Occasion, DressCode, Style, Look, Weather } from '../types';
import { Sparkles, RefreshCw, Settings2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generateStylistComment } from '../lib/llm-stylist';

const OCCASIONS: { value: Occasion; label: string; emoji: string }[] = [
  { value: 'commute', label: '通勤', emoji: '💼' },
  { value: 'date', label: '约会', emoji: '🌹' },
  { value: 'sport', label: '运动', emoji: '🏃' },
  { value: 'interview', label: '面试', emoji: '🎯' },
  { value: 'party', label: '派对', emoji: '🎉' },
  { value: 'casual', label: '日常', emoji: '☕' },
];

const DRESS_CODES: { value: DressCode; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'smart-casual', label: 'Smart Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'sporty', label: 'Sporty' },
];

const STYLES: { value: Style; label: string }[] = [
  { value: 'minimal', label: '极简' },
  { value: 'japanese', label: '日系' },
  { value: 'y2k', label: 'Y2K' },
  { value: 'oldmoney', label: '老钱风' },
  { value: 'street', label: '街头' },
  { value: 'sweet', label: '甜美' },
  { value: 'cool', label: '酷感' },
  { value: 'business', label: '商务' },
];

const OCCASION_TO_DC: Record<Occasion, DressCode> = {
  commute: 'smart-casual',
  date: 'smart-casual',
  sport: 'sporty',
  interview: 'formal',
  party: 'smart-casual',
  casual: 'casual',
  travel: 'casual',
};

export function Daily() {
  const { wardrobe, saveFavorite, removeFavorite, pushHistory, city, setCity, weather, setWeather, gender, favoriteLooks, history, resetAll } = useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const { toast } = useToast();

  const [loadingWeather, setLoadingWeather] = useState(false);
  const [occasion, setOccasion] = useState<Occasion>('commute');
  const [dressCode, setDressCode] = useState<DressCode>('smart-casual');
  const [stylePrefs, setStylePrefs] = useState<Style[]>(['minimal']);
  const [seed, setSeed] = useState(0); // 重新生成
  const [looksWithComment, setLooksWithComment] = useState<Look[]>([]);
  const [activeIdx, setActiveIdx] = useState(0); // 当前展示的 Look 下标

  // —— 首次进入：拉真实天气 ——
  useEffect(() => {
    if (weather.length > 0) return; // 已有缓存
    let cancelled = false;
    setLoadingWeather(true);
    getWeatherByCity(city)
      .then((list) => {
        if (!cancelled) setWeather(list);
      })
      .finally(() => !cancelled && setLoadingWeather(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today: Weather = weather[0] ?? {
    date: new Date().toISOString().slice(0, 10),
    tempHigh: 22,
    tempLow: 14,
    condition: 'cloudy',
    uv: 'medium',
    city,
  };

  const looks = useMemo(() => {
    const avgTemp = (today.tempHigh + today.tempLow) / 2;
    return recommendLooks({
      wardrobe,
      occasion,
      dressCode,
      stylePrefs,
      weather: { temp: avgTemp, condition: today.condition },
      count: 3,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardrobe, occasion, dressCode, stylePrefs, seed, today.condition, today.tempHigh, today.tempLow]);

  // —— 条件变化（场景/Dress Code/风格/seed）后重置到第一套 ——
  useEffect(() => {
    setActiveIdx(0);
  }, [occasion, dressCode, stylePrefs, seed]);

  // —— 用 LLM 风格 mock 改写 reason ——
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      looks.map(async (l) => {
        const avgTemp = (today.tempHigh + today.tempLow) / 2;
        const comment = await generateStylistComment(l, {
          temp: avgTemp,
          condition: today.condition,
        });
        return { ...l, reason: comment };
      }),
    ).then((arr) => {
      if (!cancelled) setLooksWithComment(arr);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looks]);

  const toggleStyle = (s: Style) => {
    setStylePrefs((prev) => (prev.includes(s) ? prev.filter((p) => p !== s) : [...prev, s]));
  };

  const handleOccasionChange = (oc: Occasion) => {
    setOccasion(oc);
    setDressCode(OCCASION_TO_DC[oc]);
  };

  const handleCityChange = (newCity: string, list: Weather[]) => {
    setCity(newCity);
    setWeather(list);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* 顶部 */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary"><Logo size={22} /></span>
            <span className="text-base font-semibold tracking-tight">日常搭</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              data-testid="button-refresh"
              onClick={() => setSeed((n) => n + 1)}
              className="p-2 rounded-full hover-elevate"
              aria-label="换一批"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              data-testid="button-account"
              onClick={() => setAccountOpen(true)}
              className="p-2 rounded-full hover-elevate"
              aria-label="账户"
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 账户 / 数据面板 */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>我的数据</DialogTitle>
            <DialogDescription>本地存储 · 所有数据只保存在你的浏览器</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-card border border-card-border p-3">
                <div className="text-lg font-semibold text-primary">{wardrobe.length}</div>
                <div className="text-[11px] text-muted-foreground">衣物</div>
              </div>
              <div className="rounded-xl bg-card border border-card-border p-3">
                <div className="text-lg font-semibold text-primary">{favoriteLooks.length}</div>
                <div className="text-[11px] text-muted-foreground">收藏</div>
              </div>
              <div className="rounded-xl bg-card border border-card-border p-3">
                <div className="text-lg font-semibold text-primary">{history.length}</div>
                <div className="text-[11px] text-muted-foreground">穿搭记录</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 px-1">
              <div>性别：{gender === 'female' ? '女士' : '男士'}</div>
              <div>默认城市：{city}</div>
            </div>
            <button
              data-testid="button-reset-data"
              onClick={() => {
                if (confirm('确定重置所有数据吗？衣橱、收藏、记录都会清空。')) {
                  resetAll();
                  setAccountOpen(false);
                }
              }}
              className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm hover-elevate"
            >
              重置数据
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              你的数据会保留到下次打开，跨设备同步需接入账户系统（下一阶段）。
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-5 pt-4 space-y-5">
        <WeatherCard weather={today} loading={loadingWeather} onCityChange={handleCityChange} />

        {/* 场景选择 */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            今日场合
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {OCCASIONS.map((o) => {
              const active = o.value === occasion;
              return (
                <button
                  key={o.value}
                  data-testid={`button-occasion-${o.value}`}
                  onClick={() => handleOccasionChange(o.value)}
                  className={`
                    py-2.5 rounded-xl border text-sm flex flex-col items-center gap-0.5 hover-elevate
                    ${active
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-card border-card-border text-foreground'}
                  `}
                >
                  <span className="text-base leading-none">{o.emoji}</span>
                  <span className="text-xs">{o.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Dress Code */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dress Code
          </h2>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {DRESS_CODES.map((d) => {
              const active = d.value === dressCode;
              return (
                <button
                  key={d.value}
                  data-testid={`button-dc-${d.value}`}
                  onClick={() => setDressCode(d.value)}
                  className={`
                    shrink-0 px-3.5 py-1.5 rounded-full text-sm border hover-elevate
                    ${active
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card border-card-border text-foreground'}
                  `}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 风格 */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Settings2 className="h-3 w-3" /> 风格偏好（多选）
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => {
              const active = stylePrefs.includes(s.value);
              return (
                <button
                  key={s.value}
                  data-testid={`button-style-${s.value}`}
                  onClick={() => toggleStyle(s.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs border hover-elevate
                    ${active
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-card border-card-border text-muted-foreground'}
                  `}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 搭配结果 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              {looks.length > 1
                ? `为你生成的 ${looks.length} 套 · 第 ${Math.min(activeIdx + 1, looks.length)} 套`
                : `为你生成的搭配`}
            </h2>
            {looks.length > 1 && (
              <span className="text-xs text-muted-foreground">左右滑动切换</span>
            )}
          </div>
          {looks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                没有找到合适的搭配 —— 试试切换 Dress Code 或风格
              </p>
            </div>
          ) : (
            <LookSwiper
              looks={looksWithComment.length === looks.length ? looksWithComment : looks}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              favoriteIds={favoriteLooks.map((f) => f.id)}
              onLike={(l) => {
                const isLiked = favoriteLooks.some((f) => f.id === l.id);
                if (isLiked) {
                  removeFavorite(l.id);
                  toast({ title: '已取消收藏' });
                } else {
                  saveFavorite(l);
                  toast({ title: '已收藏', description: '可以在「收藏」里查看' });
                }
              }}
              onWear={(l) => {
                pushHistory(l);
                toast({ title: '今日就穿它', description: '已加入穿搭日历' });
              }}
              onRefresh={() => setSeed((n) => n + 1)}
            />
          )}
        </section>
      </div>
    </div>
  );
}

// ============================================================
// LookSwiper —— 单卡左右滑动切换器
// • 手机：手势滑动（touch）+ 鼠标拖拽（pointer）
// • 桌面：可点左右箭头切换 + 键盘 ← / →
// • 底部分页点可跳转指定套
// ============================================================
function LookSwiper({
  looks,
  activeIdx,
  setActiveIdx,
  favoriteIds,
  onLike,
  onWear,
  onRefresh,
}: {
  looks: Look[];
  activeIdx: number;
  setActiveIdx: (n: number) => void;
  favoriteIds: string[];
  onLike: (l: Look) => void;
  onWear: (l: Look) => void;
  onRefresh: () => void;
}) {
  const safeIdx = Math.min(activeIdx, looks.length - 1);
  const total = looks.length;

  // 手势状态
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useMemo(() => ({ current: 0 }), []);

  const goPrev = () => setActiveIdx(Math.max(0, safeIdx - 1));
  const goNext = () => setActiveIdx(Math.min(total - 1, safeIdx + 1));

  // 键盘左右切换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, total]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
  };
  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = 60;
    if (dragX > threshold) goPrev();
    else if (dragX < -threshold) goNext();
    setDragX(0);
  };

  return (
    <div className="select-none">
      {/* 滑动区域 */}
      <div
        className="relative overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(${-safeIdx * 100}% + ${dragX}px))`,
            transition: dragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {looks.map((l) => (
            <div key={l.id} className="w-full shrink-0 px-0.5">
              <LookCard
                look={l}
                liked={favoriteIds.includes(l.id)}
                hideDislike
                onLike={() => onLike(l)}
                onWear={() => onWear(l)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 底部分页点 + 换一批 */}
      <div className="mt-3 flex items-center justify-between">
        <button
          data-testid="button-swiper-prev"
          onClick={goPrev}
          disabled={safeIdx === 0}
          className="p-2 rounded-full hover-elevate disabled:opacity-30 disabled:pointer-events-none"
          aria-label="上一套"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {looks.map((_, i) => (
            <button
              key={i}
              data-testid={`button-swiper-dot-${i}`}
              onClick={() => setActiveIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIdx ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
              aria-label={`第 ${i + 1} 套`}
            />
          ))}
        </div>

        <button
          data-testid="button-swiper-next"
          onClick={goNext}
          disabled={safeIdx === total - 1}
          className="p-2 rounded-full hover-elevate disabled:opacity-30 disabled:pointer-events-none"
          aria-label="下一套"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 换一批（全部重新生成） */}
      <button
        data-testid="button-regenerate-all"
        onClick={onRefresh}
        className="mt-3 w-full py-2.5 rounded-xl border border-card-border text-sm text-muted-foreground hover-elevate flex items-center justify-center gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" /> 换一批搭配
      </button>
    </div>
  );
}
