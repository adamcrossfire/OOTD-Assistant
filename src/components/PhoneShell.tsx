// 手机外壳 —— 桌面端用 iPhone 风格 frame，移动端全屏
// 让 demo 在桌面浏览器里看起来更像 App
import { ReactNode } from 'react';

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh bg-[hsl(30_18%_92%)] dark:bg-[hsl(24_8%_5%)] flex items-center justify-center md:py-8 overflow-hidden">
      <div
        className="
          relative w-full md:max-w-[420px] md:rounded-[44px] md:border md:border-card-border
          md:shadow-2xl md:overflow-hidden bg-background h-full md:h-[860px]
          flex flex-col
        "
      >
        {children}
      </div>
    </div>
  );
}
