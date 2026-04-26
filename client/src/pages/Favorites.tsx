// 收藏的搭配
import { useApp } from '../store';
import { LookCard } from '../components/LookCard';
import { Heart } from 'lucide-react';

export function Favorites() {
  const { favoriteLooks, removeFavorite } = useApp();

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <h1 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          我的收藏
        </h1>
        <p className="text-xs text-muted-foreground">{favoriteLooks.length} 套已收藏的搭配</p>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {favoriteLooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-10 text-center mt-8">
            <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">还没有收藏任何搭配</p>
            <p className="text-xs text-muted-foreground mt-1">在「日常搭」里点 ❤ 收藏</p>
          </div>
        ) : (
          favoriteLooks.map((l) => (
            <LookCard
              key={l.id}
              look={l}
              liked
              hideDislike
              onLike={() => removeFavorite(l.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
