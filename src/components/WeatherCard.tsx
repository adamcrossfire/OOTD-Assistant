// 今日天气卡片 —— 阶段2：支持城市切换 + Loading 占位
import { useState } from 'react';
import type { Weather } from '../types';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { searchCity, fetchWeather, getBrowserLocation, reverseCity } from '../lib/weather-api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
};

const LABELS = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '小雨',
  snowy: '雪',
  windy: '大风',
};

interface Props {
  weather: Weather;
  loading?: boolean;
  onCityChange?: (city: string, list: Weather[]) => void;
}

export function WeatherCard({ weather, loading, onCityChange }: Props) {
  const Icon = ICONS[weather.condition];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchCity>>>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const onSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const r = await searchCity(q);
    setResults(r);
    setSearching(false);
  };

  const pickCity = async (city: { name: string; latitude: number; longitude: number }) => {
    setSearching(true);
    const list = await fetchWeather(city.latitude, city.longitude, city.name);
    onCityChange?.(city.name, list);
    setOpen(false);
    setQuery('');
    setResults([]);
    setSearching(false);
  };

  const useMyLocation = async () => {
    setLocating(true);
    const loc = await getBrowserLocation();
    if (loc) {
      const name = await reverseCity(loc.lat, loc.lon);
      const list = await fetchWeather(loc.lat, loc.lon, name);
      onCityChange?.(name, list);
      setOpen(false);
    }
    setLocating(false);
  };

  return (
    <>
      <div
        className="
          rounded-2xl p-4 text-foreground
          bg-gradient-to-br from-[hsl(36_40%_94%)] via-[hsl(30_30%_92%)] to-[hsl(12_50%_88%)]
          dark:from-[hsl(24_10%_14%)] dark:via-[hsl(24_10%_12%)] dark:to-[hsl(12_30%_18%)]
          border border-card-border
        "
        data-testid="card-weather"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <button
              onClick={() => setOpen(true)}
              data-testid="button-city"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover-elevate rounded-md px-1 -mx-1"
            >
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[140px]">{weather.city}</span>
              <span> · 今日</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {loading ? (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">正在拉取天气…</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-semibold tracking-tight">{weather.tempLow}°</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-xl font-semibold tracking-tight">{weather.tempHigh}°</span>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {LABELS[weather.condition]} · UV{' '}
                  {weather.uv === 'high' ? '强' : weather.uv === 'medium' ? '中' : '弱'}
                </div>
              </>
            )}
          </div>
          <Icon className="h-9 w-9 text-primary shrink-0" strokeWidth={1.5} />
        </div>
      </div>

      {/* 城市选择弹窗 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>选择城市</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              data-testid="input-city-search"
              autoFocus
              type="text"
              placeholder="搜索城市，如 北京 / Tokyo"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-sm focus:outline-none focus:border-primary"
            />

            <button
              data-testid="button-use-location"
              onClick={useMyLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary text-primary text-sm hover-elevate disabled:opacity-50"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              使用当前定位
            </button>

            {searching && (
              <div className="flex items-center justify-center py-3 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                搜索中…
              </div>
            )}

            {results.length > 0 && (
              <div className="max-h-72 overflow-y-auto space-y-1">
                {results.map((c) => (
                  <button
                    key={c.id}
                    data-testid={`button-city-${c.id}`}
                    onClick={() => pickCity(c)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover-elevate border border-transparent hover:border-card-border"
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[c.admin1, c.country].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && query && results.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                没有找到匹配的城市
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
