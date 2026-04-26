// 衣橱页：Pinterest 瀑布流 + 分类筛选 + 添加/编辑单品
import { useMemo, useState, useRef } from 'react';
import { useApp } from '../store';
import type { Category, Item, Season, Style, DressCode } from '../types';
import { Plus, Camera, Image as ImageIcon, X, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectClothing } from '../lib/vision-api';

// 根据性别返回可选分类——男士隐藏「连衣裙」
const getCats = (gender: 'female' | 'male' | null): { value: Category | 'all'; label: string }[] => {
  const base: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'top', label: '上装' },
    { value: 'bottom', label: '下装' },
    { value: 'outer', label: '外套' },
  ];
  if (gender === 'female') base.push({ value: 'dress', label: '连衣裙' });
  base.push({ value: 'shoes', label: '鞋' });
  base.push({ value: 'accessory', label: '配饰' });
  return base;
};

const SEASONS: { value: Season; label: string }[] = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
  { value: 'all', label: '四季' },
];

const COLOR_FAMILIES = [
  { value: 'warm', label: '暖色', color: '#d2a679' },
  { value: 'cool', label: '冷色', color: '#5a7693' },
  { value: 'neutral', label: '中性', color: '#9a948a' },
  { value: 'black', label: '黑色', color: '#1a1a1a' },
  { value: 'white', label: '白色', color: '#fafafa' },
] as const;

const STYLES_LIST: Style[] = ['minimal', 'japanese', 'y2k', 'oldmoney', 'street', 'sweet', 'cool', 'business'];
const STYLE_CN: Record<Style, string> = {
  minimal: '极简', japanese: '日系', y2k: 'Y2K', oldmoney: '老钱风',
  street: '街头', sweet: '甜美', cool: '酷感', business: '商务',
};

export function Wardrobe() {
  const { wardrobe, gender, addItem, removeItem } = useApp();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const CATS = getCats(gender);

  const filtered = useMemo(() => {
    if (filter === 'all') return wardrobe;
    return wardrobe.filter((i) => i.category === filter);
  }, [wardrobe, filter]);

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* 顶部 */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-5 pt-5 pb-3 border-b border-card-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">我的衣橱</h1>
            <p className="text-xs text-muted-foreground">
              共 {wardrobe.length} 件 · {gender === 'female' ? '女士' : '男士'}
            </p>
          </div>
          <button
            data-testid="button-add-item"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover-elevate"
          >
            <Plus className="h-4 w-4" /> 添加
          </button>
        </div>
        {/* 分类筛选 chip */}
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
          {CATS.map((c) => {
            const active = c.value === filter;
            return (
              <button
                key={c.value}
                data-testid={`filter-${c.value}`}
                onClick={() => setFilter(c.value)}
                className={`
                  shrink-0 px-3.5 py-1.5 rounded-full text-sm border hover-elevate
                  ${active
                    ? 'bg-foreground text-background border-foreground font-semibold'
                    : 'bg-card border-card-border text-muted-foreground'}
                `}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 瀑布流（CSS columns 实现） */}
      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-10 text-center">
            <p className="text-sm text-muted-foreground">该分类下还没有衣物</p>
            <button
              data-testid="button-add-empty"
              onClick={() => setShowAdd(true)}
              className="mt-3 text-sm text-primary font-semibold"
            >
              + 添加一件
            </button>
          </div>
        ) : (
          <div className="columns-2 gap-3 [column-fill:_balance]">
            {filtered.map((it) => (
              <ItemTile key={it.id} item={it} onDelete={() => removeItem(it.id)} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddItemSheet
          onClose={() => setShowAdd(false)}
          onAdd={(it) => {
            addItem(it);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- 单品瀑布卡 ----------
function ItemTile({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        data-testid={`tile-${item.id}`}
        onClick={() => setOpen(true)}
        className="block w-full mb-3 break-inside-avoid rounded-2xl bg-card border border-card-border overflow-hidden hover-elevate text-left"
      >
        <div className="aspect-square bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] flex items-center justify-center p-2">
          <img src={item.photoUrl} alt={item.subCategory} className="w-full h-full object-contain" />
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-card-border shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-medium truncate">{item.subCategory}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            穿过 {item.wearCount} 次
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-sm overflow-hidden border border-card-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] flex items-center justify-center p-6">
              <img src={item.photoUrl} alt={item.subCategory} className="max-h-full max-w-full" />
            </div>
            <div className="p-5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{item.subCategory}</h3>
                  <p className="text-sm text-muted-foreground">{CAT_CN[item.category]} · 穿过 {item.wearCount} 次</p>
                </div>
                <button
                  data-testid={`button-close-detail`}
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover-elevate"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {item.styles.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary">
                    {STYLE_CN[s]}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {item.dressCodes.map((d) => (
                  <span key={d} className="text-[11px] px-2 py-0.5 rounded-full border border-card-border">
                    {d}
                  </span>
                ))}
              </div>
              <button
                data-testid={`button-delete-${item.id}`}
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className="mt-3 w-full py-2.5 rounded-xl border border-destructive/30 text-destructive flex items-center justify-center gap-2 hover-elevate"
              >
                <Trash2 className="h-4 w-4" /> 移出衣橱
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CAT_CN: Record<Category, string> = {
  top: '上装', bottom: '下装', outer: '外套',
  dress: '连衣裙', shoes: '鞋', accessory: '配饰',
};

// ---------- 添加单品 ----------
function AddItemSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (i: Item) => void }) {
  const { toast } = useToast();
  const { gender } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [category, setCategory] = useState<Category>('top');
  const [subCategory, setSubCategory] = useState('');
  const [colorFamily, setColorFamily] = useState<typeof COLOR_FAMILIES[number]['value']>('neutral');
  const [season, setSeason] = useState<Season>('all');
  const [styles, setStyles] = useState<Style[]>([]);
  const [dcs, setDcs] = useState<DressCode[]>(['casual']);

  const [detecting, setDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoUrl(dataUrl);
      // ====== 图像识别（Mock）======
      // 真实接口架构已就绪：替换 vision-api.ts 内部为 Google Vision/Rekognition 即可
      setDetecting(true);
      try {
        const r = await detectClothing(dataUrl);
        // 自动预填字段
        setCategory(r.category);
        setColorFamily(r.colorFamily);
        setSeason(r.season);
        setStyles(r.styles);
        if (!subCategory) setSubCategory(r.subCategory);
        setAutoDetected(true);
        toast({
          title: 'AI 已自动识别',
          description: `主色 ${r.colorFamily}・置信度 ${Math.round(r.confidence * 100)}%（可手动调整）`,
        });
      } finally {
        setDetecting(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!photoUrl) {
      toast({ title: '请先上传图片' });
      return;
    }
    if (!subCategory.trim()) {
      toast({ title: '请输入单品名称', description: '比如「白色T恤」' });
      return;
    }
    const colorMap = {
      warm: '#d2a679', cool: '#5a7693', neutral: '#9a948a', black: '#1a1a1a', white: '#fafafa',
    } as const;
    onAdd({
      id: `u-${Date.now()}`,
      photoUrl,
      category,
      subCategory: subCategory.trim(),
      color: colorMap[colorFamily],
      colorFamily,
      pattern: 'solid',
      season,
      styles: styles.length ? styles : ['minimal'],
      dressCodes: dcs.length ? dcs : ['casual'],
      wearCount: 0,
    });
    toast({ title: '已添加到衣橱' });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-card rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto border border-card-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-card-border px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">添加单品</h2>
          <button data-testid="button-close-add" onClick={onClose} className="p-2 rounded-full hover-elevate">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 图片上传 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              图片
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />
            {photoUrl ? (
              <div className="mt-2 aspect-square rounded-2xl bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] flex items-center justify-center p-4 relative">
                <img src={photoUrl} alt="预览" className="max-h-full max-w-full object-contain" />
                {detecting && (
                  <div className="absolute inset-0 rounded-2xl bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">AI 正在识别…</span>
                  </div>
                )}
                {autoDetected && !detecting && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI 已识别
                  </div>
                )}
                <button
                  data-testid="button-rephoto"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-card text-sm border border-card-border shadow-sm hover-elevate"
                >
                  重新选择
                </button>
              </div>
            ) : (
              <button
                data-testid="button-upload"
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full aspect-square rounded-2xl border-2 border-dashed border-card-border bg-[hsl(36_25%_95%)] dark:bg-[hsl(24_8%_12%)] flex flex-col items-center justify-center gap-2 hover-elevate"
              >
                <div className="flex gap-3 text-muted-foreground">
                  <Camera className="h-7 w-7" />
                  <ImageIcon className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted-foreground">点击拍照 / 从相册选择</p>
                <p className="text-[11px] text-primary flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> 上传后 AI 自动识别品类、主色、风格
                </p>
              </button>
            )}
          </div>

          {/* 名称 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              单品名称
            </label>
            <input
              data-testid="input-subcategory"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="如：基础白T、驼色大衣"
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl bg-card border border-card-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* 类别 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">类别</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {getCats(gender).filter((c) => c.value !== 'all').map((c) => (
                <button
                  key={c.value}
                  data-testid={`add-cat-${c.value}`}
                  onClick={() => setCategory(c.value as Category)}
                  className={`py-2 rounded-xl border text-sm hover-elevate ${
                    category === c.value
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-card border-card-border'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色家族 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">主色</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLOR_FAMILIES.map((c) => (
                <button
                  key={c.value}
                  data-testid={`add-color-${c.value}`}
                  onClick={() => setColorFamily(c.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-1.5 hover-elevate ${
                    colorFamily === c.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card border-card-border'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full border border-card-border" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 季节 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">季节</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s.value}
                  data-testid={`add-season-${s.value}`}
                  onClick={() => setSeason(s.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm hover-elevate ${
                    season === s.value
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-card border-card-border'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 风格 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              风格（可多选）
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STYLES_LIST.map((s) => {
                const active = styles.includes(s);
                return (
                  <button
                    key={s}
                    data-testid={`add-style-${s}`}
                    onClick={() =>
                      setStyles((prev) => (active ? prev.filter((p) => p !== s) : [...prev, s]))
                    }
                    className={`px-2.5 py-1 rounded-full border text-xs hover-elevate ${
                      active
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-card border-card-border text-muted-foreground'
                    }`}
                  >
                    {STYLE_CN[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dress Code */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              适合的 Dress Code（可多选）
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(['casual', 'smart-casual', 'formal', 'sporty'] as DressCode[]).map((d) => {
                const active = dcs.includes(d);
                return (
                  <button
                    key={d}
                    data-testid={`add-dc-${d}`}
                    onClick={() =>
                      setDcs((prev) => (active ? prev.filter((p) => p !== d) : [...prev, d]))
                    }
                    className={`px-2.5 py-1 rounded-full border text-xs hover-elevate ${
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card border-card-border text-muted-foreground'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            data-testid="button-submit-add"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate active-elevate-2"
          >
            加入衣橱
          </button>
        </div>
      </div>
    </div>
  );
}
