// 日常搭配页：选场景 + DressCode + 风格 → 生成 3 套 Look
// 阶段2：接入真实天气 API + LLM 风评论
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { WeatherCard } from '../components/WeatherCard';
import { LookCard } from '../components/LookCard';
import { TryOnDialog } from '../components/TryOnDialog';
import { Logo } from '../components/Logo';
import { recommendLooks } from '../lib/style-engine';
import { getWeatherByCity } from '../lib/weather-api';
import type { Occasion, DressCode, Look, Weather } from '../types';
import { Sparkles, RefreshCw, Settings2, User, Camera, Trash2, Plus, X as XIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generateStylistComment } from '../lib/llm-stylist';
import { BUILTIN_STYLES, filterStylesByGender, type StylePack } from '../../../shared/styles-library';
import { extractStyleFromScreenshot } from '../lib/style-vision';
import { generateInspirationLooks } from '../lib/inspiration-api';

// 阶段1精简：只保留 4 个高频场合（通勤/约会/休闲/派对）
// 移除「运动」「面试」（与风格冲突或低频），移除独立 DRESS CODE 维度（与场合 90% 重合）
// dressCode 由场合自动推导，仍传给后端 API
const OCCASIONS: { value: Occasion; label: string; emoji: string }[] = [
  { value: 'commute', label: '通勤', emoji: '💼' },
  { value: 'date', label: '约会', emoji: '🌹' },
  { value: 'casual', label: '休闲', emoji: '☕' },
  { value: 'party', label: '派对', emoji: '🎉' },
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
  const {
    wardrobe,
    saveFavorite,
    removeFavorite,
    pushHistory,
    city,
    setCity,
    weather,
    setWeather,
    gender,
    favoriteLooks,
    history,
    resetAll,
    selfPortrait,
    setSelfPortrait,
    customStyles,
    addCustomStyle,
    removeCustomStyle,
  } = useApp();
  const [accountOpen, setAccountOpen] = useState(false);
  const [tryOnLook, setTryOnLook] = useState<Look | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [selectedStylePack, setSelectedStylePack] = useState<StylePack | null>(null);
  const [showStyleImport, setShowStyleImport] = useState(false);
  const { toast } = useToast();

  // 所有可选风格 = 内置 + 用户自定义
  const allStyles = useMemo<StylePack[]>(
    () => filterStylesByGender([...BUILTIN_STYLES, ...customStyles], gender),
    [customStyles, gender],
  );

  // 本人照片上传处理
  const handleSelfUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: '照片超过 5MB', description: '请换小一点的全身照' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelfPortrait(reader.result as string);
      toast({ title: '本人照片已保存', description: '试穿时可切换到本人模式' });
    };
    reader.readAsDataURL(file);
  };

  const [loadingWeather, setLoadingWeather] = useState(false);
  const [occasion, setOccasion] = useState<Occasion>('commute');
  // dressCode 由 occasion 自动推导（保留给后端 API），不再独立可选
  const dressCode: DressCode = OCCASION_TO_DC[occasion];
  // 风格偏好（多选）已移除 —— 完全由「今日风格」横滚条的 selectedStylePack 决定
  // 用 useMemo 冻结引用，避免每次 render 创建新数组触发下游 effect
  const stylePrefs = useMemo<never[]>(() => [], []);
  const [seed, setSeed] = useState(0); // 重新生成
  const [looksWithComment, setLooksWithComment] = useState<Look[]>([]);
  const [activeIdx, setActiveIdx] = useState(0); // 当前展示的 Look 下标

  // 参考衣橱 / 真实衣橱模式，衣橱<5件时默认参考衣橱
  const [wardrobeMode, setWardrobeMode] = useState<'real' | 'inspiration'>(
    () => (wardrobe.length < 5 ? 'inspiration' : 'real'),
  );
  // 参考衣橱生成状态
  const [inspoLooks, setInspoLooks] = useState<Look[]>([]);
  const [inspoLoading, setInspoLoading] = useState(false);

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

  const realLooks = useMemo(() => {
    const avgTemp = (today.tempHigh + today.tempLow) / 2;
    return recommendLooks({
      wardrobe,
      occasion,
      dressCode,
      stylePrefs,
      weather: { temp: avgTemp, condition: today.condition },
      count: 3,
      stylePack: selectedStylePack,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardrobe, occasion, dressCode, stylePrefs, seed, today.condition, today.tempHigh, today.tempLow, selectedStylePack]);

  // 参考衣橱模式：根据条件 AI 生成 3 套
  useEffect(() => {
    if (wardrobeMode !== 'inspiration') return;
    let cancelled = false;
    setInspoLoading(true);
    const avgTemp = (today.tempHigh + today.tempLow) / 2;
    generateInspirationLooks({
      occasion,
      dressCode,
      styles: stylePrefs,
      gender,
      weather: { temp: avgTemp, condition: today.condition },
      stylePack: selectedStylePack,
      count: 3,
      baseSeed: seed + 1,
    })
      .then((arr) => {
        if (!cancelled) setInspoLooks(arr);
      })
      .finally(() => !cancelled && setInspoLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardrobeMode, occasion, dressCode, stylePrefs, seed, selectedStylePack, gender, today.tempHigh, today.tempLow, today.condition]);

  const looks = wardrobeMode === 'inspiration' ? inspoLooks : realLooks;

  // —— 条件变化（场景/Dress Code/风格/seed/风格包/模式）后重置到第一套 ——
  useEffect(() => {
    setActiveIdx(0);
  }, [occasion, dressCode, stylePrefs, seed, selectedStylePack, wardrobeMode]);

  // —— 用 LLM 风格 mock 改写 reason ——
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      looks.map(async (l) => {
        const avgTemp = (today.tempHigh + today.tempLow) / 2;
        const comment = await generateStylistComment(
          l,
          { temp: avgTemp, condition: today.condition },
          selectedStylePack,
        );
        return { ...l, reason: comment };
      }),
    ).then((arr) => {
      if (!cancelled) setLooksWithComment(arr);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looks, selectedStylePack]);

  const handleOccasionChange = (oc: Occasion) => {
    setOccasion(oc);
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

            {/* 本人照片 —— 一键试穿可选增强 */}
            <div className="rounded-xl border border-card-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">本人试穿照片</div>
                  <div className="text-[11px] text-muted-foreground">
                    {selfPortrait ? '已上传，试穿时可切换为本人模式' : '可选：上传后 AI 会把搭配穿到你身上'}
                  </div>
                </div>
                {selfPortrait && (
                  <img
                    src={selfPortrait}
                    alt="本人"
                    className="h-12 w-12 rounded-lg object-cover border border-card-border"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <label
                  htmlFor="self-upload-input"
                  className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1 cursor-pointer hover-elevate"
                  data-testid="label-upload-self"
                >
                  <Camera className="h-3.5 w-3.5" /> {selfPortrait ? '重新上传' : '上传正面全身照'}
                </label>
                <input
                  id="self-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelfUpload(f);
                    e.target.value = '';
                  }}
                  data-testid="input-upload-self"
                />
                {selfPortrait && (
                  <button
                    onClick={() => {
                      setSelfPortrait(null);
                      toast({ title: '已删除本人照片' });
                    }}
                    className="py-2 px-3 rounded-lg border border-card-border text-xs text-muted-foreground hover-elevate"
                    data-testid="button-delete-self"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
        {/* 衣橱模式切换：真实衣橱 / 参考衣橱 */}
        <section data-testid="section-wardrobe-mode">
          <div
            className="relative grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-medium"
            role="tablist"
          >
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-300"
              style={{ transform: wardrobeMode === 'real' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              data-testid="button-mode-real"
              role="tab"
              aria-selected={wardrobeMode === 'real'}
              onClick={() => setWardrobeMode('real')}
              className={`relative z-10 py-2 rounded-full transition-colors ${
                wardrobeMode === 'real' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              真实衣橱{wardrobe.length > 0 ? ` (${wardrobe.length})` : ''}
            </button>
            <button
              data-testid="button-mode-inspiration"
              role="tab"
              aria-selected={wardrobeMode === 'inspiration'}
              onClick={() => setWardrobeMode('inspiration')}
              className={`relative z-10 py-2 rounded-full transition-colors ${
                wardrobeMode === 'inspiration' ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              ✨ 参考衣橱
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 px-1" data-testid="text-mode-hint">
            {wardrobeMode === 'inspiration'
              ? wardrobe.length < 5
                ? '衣橱暂时还不够，先看看 AI 按你的风格生成的灵感搭配'
                : 'AI 按你选的风格+场合生成参考搭配，可试穿可收藏作为「灵感」'
              : '从你已上传的衣服里智能搭配'}
          </p>
        </section>

        <WeatherCard weather={today} loading={loadingWeather} onCityChange={handleCityChange} />

        {/* 今日风格横滚条 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              今日风格
            </h2>
            {selectedStylePack && (
              <button
                data-testid="button-style-clear"
                onClick={() => setSelectedStylePack(null)}
                className="text-[11px] text-muted-foreground hover-elevate px-2 py-0.5 rounded-full"
              >
                清除
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {allStyles.map((sp) => {
              const active = selectedStylePack?.id === sp.id;
              const isCustom = sp.source === 'custom';
              // 场合匹配度：occasionScore[当前场合] < 40 表示「不太合适」，只提示不拦截
              const occScoreVal = sp.occasionScore?.[occasion as keyof NonNullable<typeof sp.occasionScore>];
              const occMismatch = !isCustom && typeof occScoreVal === 'number' && occScoreVal < 40;
              return (
                <button
                  key={sp.id}
                  data-testid={`style-card-${sp.id}`}
                  onClick={() => {
                    if (occMismatch && !active) {
                      const ocCn: Record<string, string> = { commute: '通勤', date: '约会', casual: '日常', party: '派对' };
                      const ocLabel = ocCn[occasion] ?? occasion;
                      toast({
                        title: `「${sp.name}」不太适合${ocLabel}`,
                        description: '仍然可以选择，但生成效果可能不如预期',
                      });
                    }
                    setSelectedStylePack(active ? null : sp);
                  }}
                  className={`shrink-0 w-24 h-28 rounded-2xl border overflow-hidden flex flex-col hover-elevate relative transition-opacity ${
                    active
                      ? 'border-primary ring-2 ring-primary/40'
                      : occMismatch
                        ? 'border-card-border opacity-55'
                        : 'border-card-border'
                  }`}
                  aria-label={sp.name}
                >
                  {/* 不太适合当前场合的角标 */}
                  {occMismatch && !active && (
                    <div
                      className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[8.5px] font-medium leading-none flex items-center gap-0.5"
                      data-testid={`badge-mismatch-${sp.id}`}
                    >
                      <span>⚠</span>
                    </div>
                  )}
                  {/* 色块区 */}
                  <div
                    className="h-14 w-full flex"
                    style={{
                      background: `linear-gradient(135deg, ${sp.colors.join(', ')})`,
                    }}
                  >
                    <div className="flex items-end justify-center w-full pb-1 text-base leading-none">
                      <span className="drop-shadow">{sp.emojis.slice(0, 3).join('')}</span>
                    </div>
                  </div>
                  {/* 名字区 + 趋势副标题 */}
                  <div className="flex-1 flex flex-col items-center justify-center px-1 py-1.5 bg-card">
                    <div className="text-xs font-semibold tracking-tight text-foreground line-clamp-1">
                      {sp.name}
                    </div>
                    {sp.trendingNote && !isCustom && (
                      <div className="text-[8.5px] text-muted-foreground/80 mt-0.5 line-clamp-1 px-0.5">
                        {sp.trendingNote}
                      </div>
                    )}
                    {isCustom && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">自定义</div>
                    )}
                  </div>
                  {isCustom && (
                    <button
                      data-testid={`button-style-remove-${sp.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedStylePack?.id === sp.id) setSelectedStylePack(null);
                        removeCustomStyle(sp.id);
                        toast({ title: '已删除自定义风格' });
                      }}
                      className="absolute top-1 right-1 h-4 w-4 rounded-full bg-background/80 border border-card-border flex items-center justify-center"
                    >
                      <XIcon className="h-2.5 w-2.5" />
                    </button>
                  )}
                </button>
              );
            })}
            {/* “+ 自定义”按钮 */}
            <button
              data-testid="button-style-import"
              onClick={() => setShowStyleImport(true)}
              className="shrink-0 w-24 h-28 rounded-2xl border border-dashed border-card-border flex flex-col items-center justify-center gap-1 hover-elevate text-muted-foreground"
            >
              <Plus className="h-5 w-5" />
              <div className="text-[11px] font-medium">截图导入</div>
              <div className="text-[9px] text-muted-foreground/80">自定义风格</div>
            </button>
          </div>
          {selectedStylePack && (
            <div className="mt-1 px-1 space-y-0.5">
              <div className="text-[11px] text-muted-foreground">
                {selectedStylePack.description}
              </div>
              {selectedStylePack.inspiration && (
                <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium">
                    参考
                  </span>
                  {selectedStylePack.inspiration}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 场景选择 —— 阶段1精简到 4 个 */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            今日场合
          </h2>
          <div className="grid grid-cols-4 gap-2">
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
          {wardrobeMode === 'inspiration' && inspoLoading && inspoLooks.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-card-border p-10 text-center"
              data-testid="inspo-loading"
            >
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                AI 正在按你选的风格+场合生成参考搭配…<br />
                <span className="text-[11px]">首次生成约 10-15 秒</span>
              </p>
            </div>
          ) : looks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {wardrobeMode === 'real'
                  ? '衣橱里还不够搭配 —— 可以先用「参考衣橱」看看'
                  : '没有找到合适的搭配 —— 试试切换 Dress Code 或风格'}
              </p>
            </div>
          ) : (
            <LookSwiper
              looks={looksWithComment.length === looks.length ? looksWithComment : looks}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              favoriteIds={favoriteLooks.map((f) => f.id)}
              stylePackName={selectedStylePack?.name ?? null}
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
              onTryOn={(l) => {
                setTryOnLook(l);
                setTryOnOpen(true);
              }}
              onRefresh={() => setSeed((n) => n + 1)}
            />
          )}
        </section>
      </div>

      {/* 截图导入风格 —— Phase 2 */}
      <StyleImportSheet
        open={showStyleImport}
        onOpenChange={setShowStyleImport}
        onConfirm={(pack) => {
          addCustomStyle(pack);
          setSelectedStylePack(pack);
          setShowStyleImport(false);
          toast({ title: `已导入《${pack.name}》`, description: '已为你调整今日搭配' });
        }}
      />

      {/* 一键试穿浮窗 */}
      <TryOnDialog
        look={tryOnLook}
        open={tryOnOpen}
        onOpenChange={setTryOnOpen}
        liked={tryOnLook ? favoriteLooks.some((f) => f.id === tryOnLook.id) : false}
        onLike={() => {
          if (!tryOnLook) return;
          const isLiked = favoriteLooks.some((f) => f.id === tryOnLook.id);
          if (isLiked) {
            removeFavorite(tryOnLook.id);
            toast({ title: '已取消收藏' });
          } else {
            saveFavorite(tryOnLook);
            toast({ title: '已收藏', description: '可以在「收藏」里查看' });
          }
        }}
        onWear={() => {
          if (!tryOnLook) return;
          pushHistory(tryOnLook);
          toast({ title: '今日就穿它', description: '已加入穿搭日历' });
        }}
      />
    </div>
  );
}

// ============================================================
// LookSwiper —— 原生 scroll-snap 横滚，最流畅的手机手感
// • 用浏览器原生 overflow-x + scroll-snap-x，「有惯性 + 生涩、零成本、零 jank」
// • IntersectionObserver 同步当前索引到父组件（驱动 第 X 套 文案 + 进度点）
// • activeIdx 变化时（如重新生成后重置为 0）主动 scrollIntoView
// • 桌面补充：键盘 ← / → 切换 + 进度点可点击跳转
// ============================================================
function LookSwiper({
  looks,
  activeIdx,
  setActiveIdx,
  favoriteIds,
  stylePackName,
  onLike,
  onWear,
  onTryOn,
  onRefresh,
}: {
  looks: Look[];
  activeIdx: number;
  setActiveIdx: (n: number) => void;
  favoriteIds: string[];
  stylePackName?: string | null;
  onLike: (l: Look) => void;
  onWear: (l: Look) => void;
  onTryOn: (l: Look) => void;
  onRefresh: () => void;
}) {
  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, looks.length - 1));
  const total = looks.length;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // 外部 activeIdx 变化 → 主动滚到该项（场合切换时重置为 0，点击 dot 跳转收到）
  // 用容器 scrollTo 而非 elem.scrollIntoView，后者会连锁滚动整个页面
  useEffect(() => {
    const root = scrollerRef.current;
    const node = itemRefs.current[safeIdx];
    if (!root || !node) return;
    root.scrollTo({ left: node.offsetLeft - root.offsetLeft, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, total]);

  // IntersectionObserver 监听当前可见项 → 同步 activeIdx
  // 用 ref 避免闭包限制：回调里读 setActiveIdx 的最新引用
  const setActiveIdxRef = useRef(setActiveIdx);
  useEffect(() => { setActiveIdxRef.current = setActiveIdx; }, [setActiveIdx]);
  const lastIdxRef = useRef(safeIdx);
  useEffect(() => { lastIdxRef.current = safeIdx; }, [safeIdx]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    // 监听 scroll 事件，取中点最近的 item。
    // 重点：只在「滚动停止后」才同步 activeIdx，避免在 smooth scroll 过程中动走。
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
      if (!items.length) return;
      const center = root.scrollLeft + root.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (const it of items) {
        const itCenter = it.offsetLeft + it.clientWidth / 2;
        const dist = Math.abs(itCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = Number(it.dataset.idx);
        }
      }
      if (bestIdx !== lastIdxRef.current) {
        lastIdxRef.current = bestIdx;
        setActiveIdxRef.current(bestIdx);
      }
    };
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, 120); // 防抖：滚动停止 120ms 后计算最近 item
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

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

  return (
    <div className="select-none">
      {/* 原生横滚 + scroll-snap：最流畅的手机手感 */}
      <div
        ref={scrollerRef}
        data-testid="look-swiper-scroller"
        className="flex overflow-x-auto snap-x -mx-5 px-5 pb-1 gap-2 scroll-smooth no-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
      >
        {looks.map((l, i) => (
          <div
            key={l.id}
            ref={(el) => (itemRefs.current[i] = el)}
            data-idx={i}
            className="snap-start shrink-0 w-full"
          >
            <LookCard
              look={l}
              liked={favoriteIds.includes(l.id)}
              hideDislike
              stylePackName={stylePackName}
              positionLabel={total > 1 ? `第 ${i + 1} / ${total} 套` : null}
              onLike={() => onLike(l)}
              onWear={() => onWear(l)}
              onTryOn={() => onTryOn(l)}
            />
          </div>
        ))}
      </div>

      {/* 底部分页点 —— 可点击跳转 */}
      {total > 1 && (
        <div
          className="mt-4 flex items-center justify-center gap-1.5"
          aria-label={`共 ${total} 套，当前第 ${safeIdx + 1} 套`}
        >
          {looks.map((_, i) => (
            <button
              key={i}
              data-testid={`indicator-dot-${i}`}
              onClick={() => setActiveIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 hover-elevate ${
                i === safeIdx ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/25'
              }`}
              aria-label={`跳转到第 ${i + 1} 套`}
            />
          ))}
        </div>
      )}

      {/* 换一批（全部重新生成） */}
      <button
        data-testid="button-regenerate-all"
        onClick={onRefresh}
        className="mt-4 w-full py-2.5 rounded-xl border border-card-border text-sm text-muted-foreground hover-elevate flex items-center justify-center gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" /> 换一批搭配
      </button>
    </div>
  );
}

// ============================================================
// StyleImportSheet —— 上传截图，调用视觉模型生成自定义风格包
// ============================================================
function StyleImportSheet({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (pack: StylePack) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pack, setPack] = useState<StylePack | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreviewUrl(null);
    setPack(null);
    setEditName('');
    setError(null);
    setSource(null);
    setLoading(false);
  };

  // 关闭弹窗时清状态
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleFile = async (file: File) => {
    if (file.size > 6 * 1024 * 1024) {
      setError('图片超过 6MB，请压缩后再试');
      return;
    }
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      try {
        const result = await extractStyleFromScreenshot(dataUrl);
        if (result.pack) {
          setPack(result.pack);
          setEditName(result.pack.name);
        }
        setSource(result.source);
        if (result.fallbackReason) setError(result.fallbackReason);
      } catch (e) {
        setError((e as Error).message || '识别失败，请换张图试试');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('图片读取失败');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!pack) return;
    const finalPack: StylePack = {
      ...pack,
      name: editName.trim() || pack.name,
      screenshot: previewUrl ?? undefined,
    };
    onConfirm(finalPack);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>截图导入风格</DialogTitle>
          <DialogDescription>
            上传一张小红书穿搭截图，AI 会提取风格关键词为你生成自定义风格包
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!previewUrl && (
            <label
              htmlFor="style-screenshot-input"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-card-border p-6 cursor-pointer hover-elevate"
              data-testid="label-style-upload"
            >
              <Camera className="h-7 w-7 text-muted-foreground" />
              <div className="text-sm font-medium">点击上传截图</div>
              <div className="text-[11px] text-muted-foreground">支持 JPG / PNG，≤ 6MB</div>
            </label>
          )}
          <input
            ref={inputRef}
            id="style-screenshot-input"
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="input-style-screenshot"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />

          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-card-border">
              <img src={previewUrl} alt="预览" className="w-full max-h-44 object-cover" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/85 border border-card-border flex items-center justify-center"
                data-testid="button-style-reset"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
              {loading && (
                <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="text-xs text-muted-foreground">AI 识别中…</div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-[11px] text-destructive">
              {error}
            </div>
          )}

          {pack && (
            <div className="rounded-2xl border border-card-border p-3 space-y-2.5">
              {/* 预览卡 */}
              <div
                className="h-16 rounded-xl flex items-end justify-center pb-1"
                style={{ background: `linear-gradient(135deg, ${pack.colors.join(', ')})` }}
              >
                <span className="text-base drop-shadow">{pack.emojis.slice(0, 4).join('')}</span>
              </div>
              {/* 可编辑名字 */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">风格名</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-card-border bg-background text-sm"
                  data-testid="input-style-name"
                  maxLength={12}
                />
              </div>
              <div className="text-[11px] text-muted-foreground">{pack.description}</div>
              <div className="flex flex-wrap gap-1">
                {pack.keywords.slice(0, 6).map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-secondary-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
              {source === 'fallback' && (
                <div className="text-[10px] text-muted-foreground">
                  · 当前为本地兜底识别（未连接视觉模型，关键词较粗略）
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2 rounded-xl border border-card-border text-sm hover-elevate"
              data-testid="button-close-style-import"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!pack || loading}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover-elevate disabled:opacity-40 disabled:pointer-events-none"
              data-testid="button-style-confirm"
            >
              确认使用
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
