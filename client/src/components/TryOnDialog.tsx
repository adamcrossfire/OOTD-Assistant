// ============================================================
// 一键试穿浮窗 —— 展示 AI 上身效果
// - 模式切换：通用模特 / 本人（前提：用户已上传本人照片）
// - 出图缓存：同一 look + 模式 → 复用
// - 失败兜底：返回 Demo 占位图，加 "DEMO" 角标
// ============================================================

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '../store';
import type { Look } from '../types';
import { generateTryOn, type TryOnMode } from '../lib/tryon-api';
import { Sparkles, User, UserCircle2, Loader2, RefreshCw, Heart, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  look: Look | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  liked?: boolean;
  onLike?: () => void;
  onWear?: () => void;
}

export function TryOnDialog({ look, open, onOpenChange, liked, onLike, onWear }: Props) {
  const { gender, selfPortrait, tryOnCache, setTryOnCacheEntry } = useApp();
  const { toast } = useToast();
  const [mode, setMode] = useState<TryOnMode>('generic');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [source, setSource] = useState<'ai' | 'demo' | null>(null);

  const cacheKey = look ? `${look.id}:${mode}` : '';

  // 主动加载：浮窗打开 / 切换 look / 切换模式 时拉取
  useEffect(() => {
    if (!open || !look || !gender) return;

    // 缓存命中
    const cached = tryOnCache[cacheKey];
    if (cached) {
      setImage(cached);
      setSource(cached.startsWith('http') ? 'demo' : 'ai');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setImage(null);
    setSource(null);
    generateTryOn({
      look,
      gender,
      selfPortrait: mode === 'self' ? selfPortrait : null,
    })
      .then((res) => {
        if (cancelled) return;
        setImage(res.image);
        setSource(res.source);
        setTryOnCacheEntry(cacheKey, res.image);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, look?.id, mode]);

  // 关闭时复位
  useEffect(() => {
    if (!open) {
      // 保留模式选择，但清空显示态以便下次更顺
      setLoading(false);
    }
  }, [open]);

  const handleRegenerate = async () => {
    if (!look || !gender) return;
    setLoading(true);
    setImage(null);
    const res = await generateTryOn({
      look,
      gender,
      selfPortrait: mode === 'self' ? selfPortrait : null,
    });
    setImage(res.image);
    setSource(res.source);
    setTryOnCacheEntry(cacheKey, res.image);
    setLoading(false);
  };

  const switchToSelf = () => {
    if (!selfPortrait) {
      toast({
        title: '还没有上传本人照片',
        description: '请到右上角「我的」上传一张正面全身照，再试穿到本人身上',
      });
      return;
    }
    setMode('self');
  };

  if (!look) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[380px] p-0 overflow-hidden gap-0 sm:rounded-3xl"
        data-testid="dialog-tryon"
      >
        {/* 顶部标题条 */}
        <div className="px-5 py-3 border-b border-card-border flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <DialogTitle className="text-sm font-semibold flex-1">AI 一键试穿</DialogTitle>
          {source === 'demo' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              DEMO
            </span>
          )}
        </div>

        {/* 模式切换 tab */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary rounded-xl text-xs font-medium">
            <button
              data-testid="tryon-mode-generic"
              onClick={() => setMode('generic')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                mode === 'generic'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              <UserCircle2 className="h-3.5 w-3.5" /> 通用模特
            </button>
            <button
              data-testid="tryon-mode-self"
              onClick={switchToSelf}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                mode === 'self'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              } ${!selfPortrait ? 'opacity-60' : ''}`}
            >
              <User className="h-3.5 w-3.5" /> 我本人
              {!selfPortrait && <span className="text-[9px]">·待上传</span>}
            </button>
          </div>
        </div>

        {/* 图片区 */}
        <div className="px-5 pt-3">
          <div
            className="relative w-full bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] rounded-2xl overflow-hidden"
            style={{ aspectRatio: '3 / 4' }}
            data-testid="tryon-image-area"
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                {/* 骨架闪光 */}
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(36_25%_92%)] via-[hsl(36_25%_97%)] to-[hsl(36_25%_92%)] dark:from-[hsl(24_8%_14%)] dark:via-[hsl(24_8%_18%)] dark:to-[hsl(24_8%_14%)] animate-pulse" />
                <Loader2 className="h-8 w-8 text-primary animate-spin relative z-10" />
                <span className="text-xs text-muted-foreground relative z-10">
                  AI 正在为你生成上身效果…
                </span>
                <span className="text-[10px] text-muted-foreground relative z-10">
                  通常 5–15 秒
                </span>
              </div>
            )}
            {!loading && image && (
              <img
                src={image}
                alt="试穿效果"
                className="w-full h-full object-cover"
                data-testid="tryon-result-img"
              />
            )}
            {!loading && !image && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                未能生成图片
              </div>
            )}
          </div>

          {/* 描述 */}
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {mode === 'self' ? '基于你的本人照片合成' : '通用模特上身效果'}
            {source === 'demo' && '（演示版，连接 AI 生图后将显示真实合成图）'}
          </p>
        </div>

        {/* 操作行 */}
        <div className="px-5 pt-3 pb-4 flex items-center gap-2">
          <button
            data-testid="tryon-regenerate"
            onClick={handleRegenerate}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-card-border text-sm flex items-center justify-center gap-1.5 hover-elevate disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 重新生成
          </button>
          {onLike && (
            <button
              data-testid="tryon-like"
              onClick={onLike}
              aria-pressed={liked}
              className={`flex-1 py-2.5 rounded-xl border text-sm flex items-center justify-center gap-1.5 hover-elevate ${
                liked
                  ? 'border-[hsl(0_72%_55%)] text-[hsl(0_72%_55%)] font-semibold'
                  : 'border-card-border text-foreground'
              }`}
            >
              <Heart
                className="h-4 w-4"
                fill={liked ? 'currentColor' : 'none'}
                strokeWidth={liked ? 0 : 2}
              />
              {liked ? '已收藏' : '收藏'}
            </button>
          )}
          {onWear && (
            <button
              data-testid="tryon-wear"
              onClick={() => {
                onWear();
                onOpenChange(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover-elevate"
            >
              <Check className="h-4 w-4" /> 就穿它
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
