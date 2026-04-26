// 搭配 Look 卡片 —— 上半部分平铺九宫格 + 下半部分单品列表
import type { Look } from '../types';
import { Heart, X, Check, AlertCircle } from 'lucide-react';

interface Props {
  look: Look;
  onLike?: () => void;
  onDislike?: () => void;
  onWear?: () => void;
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

export function LookCard({ look, onLike, onDislike, onWear }: Props) {
  return (
    <article
      className="
        bg-card border border-card-border rounded-3xl overflow-hidden shadow-sm
        flex flex-col
      "
      data-testid={`card-look-${look.id}`}
    >
      {/* 顶部：单品平铺 */}
      <div className="bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] p-4 pb-2 relative">
        {/* 匹配度徽章 */}
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight bg-card border border-card-border z-10"
          style={{ color: SCORE_COLOR(look.score) }}
          data-testid={`badge-score-${look.id}`}
        >
          {look.score}% · {SCORE_LABEL(look.score)}
        </div>

        {/* 顶部选手展示主要 3 件，剩下的在列表里详细列出 */}
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

      {/* 操作按钮 */}
      {(onLike || onDislike || onWear) && (
        <div className="grid grid-cols-3 border-t border-card-border">
          <button
            data-testid="button-look-dislike"
            onClick={onDislike}
            className="py-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover-elevate"
          >
            <X className="h-4 w-4" /> 换一批
          </button>
          <button
            data-testid="button-look-like"
            onClick={onLike}
            className="py-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover-elevate border-l border-r border-card-border"
          >
            <Heart className="h-4 w-4" /> 收藏
          </button>
          <button
            data-testid="button-look-wear"
            onClick={onWear}
            className="py-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover-elevate"
          >
            <Check className="h-4 w-4" /> 就穿它
          </button>
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
