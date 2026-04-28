// 收藏：Look（日常搭配）+ 出行（固定行装）双子 Tab
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useApp } from '../store';
import { LookCard } from '../components/LookCard';
import { TryOnDialog } from '../components/TryOnDialog';
import type { Look, SavedTrip } from '../types';
import { Heart, Luggage, MapPin, Trash2, Calendar, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SubTab = 'look' | 'trip';
type SourceFilter = 'all' | 'real' | 'inspiration';

export function Favorites() {
  const { favoriteLooks, removeFavorite, saveFavorite, pushHistory, savedTrips, removeSavedTrip, wardrobe } = useApp();
  const [tryOnLook, setTryOnLook] = useState<Look | null>(null);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [tab, setTab] = useState<SubTab>('look');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const inspirationCount = favoriteLooks.filter((l) => l.source === 'inspiration').length;
  const realCount = favoriteLooks.length - inspirationCount;
  const filteredLooks =
    sourceFilter === 'all'
      ? favoriteLooks
      : favoriteLooks.filter((l) => (l.source ?? 'real') === sourceFilter);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLoadTrip = (trip: SavedTrip) => {
    // 先跳到出行页，再触发载入事件（让 Travel 页 mount 后接收）
    setLocation('/travel');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ootd:load-trip', { detail: trip }));
    }, 60);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <h1 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          我的收藏
        </h1>
        <p className="text-xs text-muted-foreground">
          {tab === 'look' ? `${favoriteLooks.length} 套日常搭配` : `${savedTrips.length} 套固定行装`}
        </p>

        {/* 子 Tab */}
        <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-card border border-card-border">
          <button
            data-testid="tab-fav-look"
            onClick={() => setTab('look')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              tab === 'look' ? 'bg-foreground text-background' : 'text-muted-foreground hover-elevate'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            日常 Look
          </button>
          <button
            data-testid="tab-fav-trip"
            onClick={() => setTab('trip')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              tab === 'trip' ? 'bg-foreground text-background' : 'text-muted-foreground hover-elevate'
            }`}
          >
            <Luggage className="h-3.5 w-3.5" />
            固定行装
          </button>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {tab === 'look' && (
          <>
            {favoriteLooks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-card-border p-10 text-center mt-8">
                <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">还没有收藏任何搭配</p>
                <p className="text-xs text-muted-foreground mt-1">在「日常搭」里点 ❤ 收藏</p>
              </div>
            ) : (
              <>
                {/* 来源筛选：全部 / 真实搭配 / 灵感 */}
                {inspirationCount > 0 && realCount > 0 && (
                  <div className="flex items-center gap-1.5 -mt-1" role="tablist" aria-label="来源筛选">
                    <button
                      data-testid="filter-source-all"
                      role="tab"
                      aria-selected={sourceFilter === 'all'}
                      onClick={() => setSourceFilter('all')}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
                        sourceFilter === 'all'
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-card-border text-muted-foreground hover-elevate'
                      }`}
                    >
                      全部 {favoriteLooks.length}
                    </button>
                    <button
                      data-testid="filter-source-real"
                      role="tab"
                      aria-selected={sourceFilter === 'real'}
                      onClick={() => setSourceFilter('real')}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition ${
                        sourceFilter === 'real'
                          ? 'bg-foreground text-background'
                          : 'bg-card border border-card-border text-muted-foreground hover-elevate'
                      }`}
                    >
                      真实搭配 {realCount}
                    </button>
                    <button
                      data-testid="filter-source-inspiration"
                      role="tab"
                      aria-selected={sourceFilter === 'inspiration'}
                      onClick={() => setSourceFilter('inspiration')}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1 ${
                        sourceFilter === 'inspiration'
                          ? 'bg-amber-500 text-white'
                          : 'bg-card border border-card-border text-muted-foreground hover-elevate'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      灵感 {inspirationCount}
                    </button>
                  </div>
                )}
                {filteredLooks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
                    <p className="text-xs text-muted-foreground">该筛选下暂无收藏</p>
                  </div>
                ) : (
                  filteredLooks.map((l) => (
                  <LookCard
                    key={l.id}
                    look={l}
                    liked
                    hideDislike
                    onLike={() => removeFavorite(l.id)}
                    onWear={() => {
                      pushHistory(l);
                      toast({ title: '今日就穿它', description: '已加入穿搭日历' });
                    }}
                    onTryOn={() => {
                      setTryOnLook(l);
                      setTryOnOpen(true);
                    }}
                  />
                  ))
                )}
              </>
            )}
          </>
        )}

        {tab === 'trip' && (
          <>
            {savedTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-card-border p-10 text-center mt-8">
                <Luggage className="h-8 w-8 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">还没有保存固定行装</p>
                <p className="text-xs text-muted-foreground mt-1">在「出行装」生成方案后点「保存为固定行装」</p>
                <button
                  data-testid="button-go-travel"
                  onClick={() => setLocation('/travel')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover-elevate"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  去生成出行方案
                </button>
              </div>
            ) : (
              savedTrips.map((t) => {
                const validLockedCount = t.lockedItemIds.filter((id) => wardrobe.some((w) => w.id === id)).length;
                const totalLocked = t.lockedItemIds.length;
                return (
                  <div
                    key={t.id}
                    data-testid={`trip-card-${t.id}`}
                    className="rounded-2xl bg-card border border-card-border overflow-hidden hover-elevate cursor-pointer"
                    onClick={() => handleLoadTrip(t)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                            {t.mode === 'from-locked' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                                必带反推
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {t.destination}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {t.days} 天
                            </span>
                          </div>
                        </div>
                        <button
                          data-testid={`button-delete-trip-${t.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedTrip(t.id);
                            toast({ title: '已删除' });
                          }}
                          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover-elevate"
                          aria-label="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] text-muted-foreground">
                          {t.purpose === 'business' ? '商务' : t.purpose === 'leisure' ? '休闲' : '混合'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] text-muted-foreground">
                          {t.luggage === 'cabin' ? '登机箱' : '托运'}
                        </span>
                        {t.stylePrefs.slice(0, 2).map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] text-muted-foreground">
                            {s === 'minimal' ? '极简' : s === 'oldmoney' ? '老钱风' : s === 'street' ? '街头' : s === 'business' ? '商务' : s === 'japanese' ? '日系' : s}
                          </span>
                        ))}
                        {totalLocked > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            必带 {validLockedCount}/{totalLocked}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString('zh-CN')} 保存
                        </span>
                        <span className="text-xs text-primary font-semibold">点击载入 →</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

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
            toast({ title: '已收藏' });
          }
        }}
        onWear={() => {
          if (!tryOnLook) return;
          pushHistory(tryOnLook);
          toast({ title: '今日就穿它' });
        }}
      />
    </div>
  );
}
