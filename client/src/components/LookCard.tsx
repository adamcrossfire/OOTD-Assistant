// 搭配 Look 卡片 —— 上半部分平铺九宫格 + 下半部分单品列表
import type { Look } from '../types';
import { Heart, X, Check, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  look: Look;
  /** 当前 Look 是否已被收藏，用于点亮爱心图标 */
  liked?: boolean;
  onLike?: () => void;
  onDislike?: () => void;
  onWear?: () => void;
  onTryOn?: () => void;
  /** 是否隐藏“换一批”按钮（滑动模式下不需要） */
  hideDislike?: boolean;
  /** 当前匹配的小红书风格名（用于在卡片上显示角标） */
  stylePackName?: string | null;
  /** 滑动模式下显示「第 X / N 套」的位置指示，仅在参考衣橱模式下替代分数徽章 */
  positionLabel?: string | null;
}

const SCORE_LABEL = (s: number) => {
  if (s >= 85) return '极佳';
  if (s >= 70) return '不错';
  if (s >= 55) return '还行';
  return '勉强';
};

const SCORE_COLOR = (s: number) => {
  if (s >= 85) return 'hsl(173 40% 42%)';
  if (s >= 70) return 'hsl(12 72% 56%)';
  if (s >= 55) return 'hsl(43 64% 52%)';
  return 'hsl(24 8% 42%)';
};

export function LookCard({
  look,
  liked = false,
  onLike,
  onDislike,
  onWear,
  onTryOn,
  hideDislike = false,
  stylePackName = null,
  positionLabel = null,
}: Props) {
  const isInspiration = look.source === 'inspiration';
  return (
    <article
      className="
        bg-card border border-card-border rounded-3xl overflow-hidden shadow-sm
        flex flex-col
      "
      data-testid={`card-look-${look.id}`}
    >
      {/* 顶部：参考衣橱模式走整张大图，真实衣橱走单品平铺 */}
      <div className="bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-4 pb-2 relative">
        {/* 右上角徽章：参考衣橱显示位置指示，真实衣橱显示匹配度 */}
        <div
          className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10"
        >
          {isInspiration ? (
            positionLabel && (
              <div
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight bg-card border border-card-border text-foreground"
                data-testid={`badge-position-${look.id}`}
              >
                {positionLabel}
              </div>
            )
          ) : (
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight bg-card border border-card-border"
              style={{ color: SCORE_COLOR(look.score) }}
              data-testid={`badge-score-${look.id}`}
            >
              {look.score}% · {SCORE_LABEL(look.score)}
            </div>
          )}
          {isInspiration && (
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
              data-testid={`badge-source-inspo-${look.id}`}
            >
              ✨ 灵感搭配
            </div>
          )}
          {stylePackName && (
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight bg-primary/10 text-primary border border-primary/30"
              data-testid={`badge-style-${look.id}`}
            >
              · {stylePackName}
            </div>
          )}
        </div>

        {isInspiration && look.inspirationImage ? (
          // 参考衣橱：一张整身搭配图
          <div
            className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-white dark:bg-[hsl(24_8%_18%)]"
            data-testid={`inspo-image-${look.id}`}
          >
            <img
              src={look.inspirationImage}
              alt={`参考搭配 ${look.id}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          // 真实衣橱：单品平铺
          <div className="grid grid-cols-3 gap-2">
            {look.items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="aspect-square rounded-xl bg-white dark:bg-[hsl(24_8%_18%)] overflow-hidden flex items-center justify-center p-1"
              >
                <img
                  src={item.photoUrl}
                  alt={item.subCategory}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
            {look.items.length > 3 && (
              <div className="col-span-3 -mt-1 text-center text-[11px] text-muted-foreground">
                +{look.items.length - 3} 件配饰/外套
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中部：reason / hint */}
      <div className="px-4 py-3 border-b border-card-border">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {look.styles.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              {STYLE_CN[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{look.reason}</p>
        {look.missingHint && (
          <p className="text-xs text-[hsl(20_73%_44%)] dark:text-[hsl(20_53%_60%)] mt-1.5 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{look.missingHint}</span>
          </p>
        )}
      </div>

      {/* 单品列表 */}
      <ul className="px-4 py-3 space-y-1.5 flex-1">
        {look.items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-2 text-sm"
            data-testid={`look-item-${it.id}`}
          >
            <span
              className="inline-block h-3 w-3 rounded-full border border-card-border shrink-0"
              style={{ backgroundColor: it.color }}
            />
            <span className="text-foreground">{it.subCategory}</span>
            <span className="text-muted-foreground text-xs ml-auto">{CAT_CN[it.category]}</span>
          </li>
        ))}
      </ul>

      {/* 操作按钮 —— 一键试穿 / 收藏 / 就穿它三列，可选加上“换一批”在顶部 */}
      {(onLike || onDislike || onWear || onTryOn) && (
        <div className="flex flex-col">
          {!hideDislike && onDislike && (
            <button
              data-testid="button-look-dislike"
              onClick={onDislike}
              className="py-2.5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover-elevate border-t border-card-border"
            >
              <X className="h-4 w-4" /> 换一批
            </button>
          )}
          <div
            className={`grid border-t border-card-border ${
              onTryOn ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            {onTryOn && (
              <button
                data-testid="button-look-tryon"
                onClick={onTryOn}
                className="py-3 flex items-center justify-center gap-1 text-sm text-primary font-medium hover-elevate"
              >
                <Sparkles className="h-4 w-4" /> 一键试穿
              </button>
            )}
            <button
              data-testid="button-look-like"
              onClick={onLike}
              aria-pressed={liked}
              className={`py-3 flex items-center justify-center gap-1 text-sm hover-elevate border-l border-card-border ${
                liked
                  ? 'text-[hsl(0_72%_55%)] font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              <Heart
                className="h-4 w-4"
                fill={liked ? 'currentColor' : 'none'}
                strokeWidth={liked ? 0 : 2}
              />
              {liked ? '已收藏' : '收藏'}
            </button>
            <button
              data-testid="button-look-wear"
              onClick={onWear}
              className="py-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary hover-elevate border-l border-card-border"
            >
              <Check className="h-4 w-4" /> 就穿它
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

const STYLE_CN: Record<string, string> = {
  minimal: '极简',
  japanese: '日系',
  y2k: 'Y2K',
  oldmoney: '老钱风',
  street: '街头',
  sweet: '甜美',
  cool: '酷感',
  business: '商务',
};

const CAT_CN: Record<string, string> = {
  top: '上装',
  bottom: '下装',
  outer: '外套',
  dress: '连衣裙',
  shoes: '鞋',
  accessory: '配饰',
};
