// 底部双 Tab 导航：日常搭 / 出行装 / 衣橱
import { Sun, Luggage, Shirt, Heart } from 'lucide-react';
import { Link, useLocation } from 'wouter';

const tabs = [
  { path: '/', label: '日常搭', icon: Sun },
  { path: '/wardrobe', label: '衣橱', icon: Shirt },
  { path: '/travel', label: '出行装', icon: Luggage },
  { path: '/favorites', label: '收藏', icon: Heart },
] as const;

export function BottomNav() {
  const [loc] = useLocation();
  return (
    <nav
      className="
        sticky bottom-0 z-30 bg-card/85 backdrop-blur
        border-t border-card-border px-2 pb-[env(safe-area-inset-bottom)]
      "
    >
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = loc === t.path;
          const Icon = t.icon;
          return (
            <li key={t.path}>
              <Link href={t.path}>
                <a
                  data-testid={`tab-${t.label}`}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 hover-elevate rounded-lg"
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.4 : 1.6}
                    style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                  />
                  <span
                    className="text-[11px] tracking-tight"
                    style={{
                      color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {t.label}
                  </span>
                </a>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
