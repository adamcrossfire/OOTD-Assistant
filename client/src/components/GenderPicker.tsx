// 首次进入：选择性别 —— 决定衣橱分类与推荐
import { Logo } from './Logo';
import { useApp } from '../store';
import { Sparkles } from 'lucide-react';

export function GenderPicker() {
  const { setGender } = useApp();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <div className="text-primary mb-4">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight mb-2" data-testid="text-app-title">
          OOTD帮你搭
        </h1>
        <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          基于你的真实衣橱的 AI 形象顾问
        </p>
        <p className="text-xs text-muted-foreground mb-10">
          先告诉我们你的衣橱类型，方便给到更准的搭配
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            data-testid="button-gender-female"
            onClick={() => setGender('female')}
            className="group relative aspect-[3/4] rounded-2xl border border-card-border bg-card hover-elevate active-elevate-2 overflow-hidden flex flex-col items-center justify-end p-5 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(12_60%_88%)] to-[hsl(36_40%_92%)] dark:from-[hsl(12_30%_22%)] dark:to-[hsl(24_15%_14%)]" />
            <div className="absolute top-5 left-5 text-3xl">👗</div>
            <div className="relative">
              <div className="font-semibold">女士衣橱</div>
              <div className="text-xs text-muted-foreground mt-0.5">连衣裙 · 半裙 · 配饰</div>
            </div>
          </button>

          <button
            data-testid="button-gender-male"
            onClick={() => setGender('male')}
            className="group relative aspect-[3/4] rounded-2xl border border-card-border bg-card hover-elevate active-elevate-2 overflow-hidden flex flex-col items-center justify-end p-5 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(200_30%_88%)] to-[hsl(36_40%_92%)] dark:from-[hsl(200_25%_22%)] dark:to-[hsl(24_15%_14%)]" />
            <div className="absolute top-5 left-5 text-3xl">🧥</div>
            <div className="relative">
              <div className="font-semibold">男士衣橱</div>
              <div className="text-xs text-muted-foreground mt-0.5">西装 · 牛仔 · 夹克</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          选择后会自动为你生成一份示例衣橱，方便立即体验
        </p>
      </div>
    </div>
  );
}
