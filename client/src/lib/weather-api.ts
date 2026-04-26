// ============================================================
// 真实天气 API —— Open-Meteo（免费、免 Key、CC-BY）
//
// 阶段2 升级：替换原 mock，按城市拉真实7日预报。
// 文档：https://open-meteo.com/en/docs
//
// 工作流：
//   1. searchCity(name) -> 候选城市列表（含经纬度）
//   2. fetchWeather(lat, lon, city) -> 7 天 Weather[]
//
// 兜底：任何接口失败时回退到 mock-data.ts 的 getMockWeather
// ============================================================

import type { Weather } from '../types';
import { getMockWeather } from './mock-data';

export interface CityResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** 搜索城市（用于出行模式输入目的地时下拉提示） */
export async function searchCity(query: string): Promise<CityResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=zh&format=json`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.results ?? []).map((x: any) => ({
      id: x.id,
      name: x.name,
      country: x.country ?? '',
      admin1: x.admin1,
      latitude: x.latitude,
      longitude: x.longitude,
      timezone: x.timezone,
    }));
  } catch (e) {
    console.warn('[weather] city search failed', e);
    return [];
  }
}

/**
 * WMO weather_code → 我们的 condition
 * https://open-meteo.com/en/docs#weathervariables
 */
function wmoToCondition(code: number): Weather['condition'] {
  if ([0, 1].includes(code)) return 'sunny';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  return 'cloudy';
}

function uvLevel(uv: number): Weather['uv'] {
  if (uv <= 2) return 'low';
  if (uv <= 6) return 'medium';
  return 'high';
}

/** 拉指定城市未来7天预报 */
export async function fetchWeather(
  lat: number,
  lon: number,
  city: string,
): Promise<Weather[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
      `&forecast_days=7&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const d = await r.json();
    const days = d.daily.time as string[];
    return days.map((date, i) => ({
      date,
      tempHigh: Math.round(d.daily.temperature_2m_max[i]),
      tempLow: Math.round(d.daily.temperature_2m_min[i]),
      condition: wmoToCondition(d.daily.weather_code[i]),
      uv: uvLevel(d.daily.uv_index_max[i] ?? 0),
      city,
    }));
  } catch (e) {
    console.warn('[weather] fetch failed, falling back to mock', e);
    return getMockWeather(city);
  }
}

/**
 * 一站式：根据城市名（或自动定位）拿7天天气
 * 优先级：传入坐标 > 城市名搜索 > 浏览器定位 > mock
 */
export async function getWeatherByCity(cityName: string): Promise<Weather[]> {
  const list = await searchCity(cityName);
  if (list.length === 0) return getMockWeather(cityName);
  const top = list[0];
  return fetchWeather(top.latitude, top.longitude, top.name);
}

/** 浏览器地理定位（可选，用户允许时拉所在地） */
export function getBrowserLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    const timer = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: 4000, maximumAge: 1000 * 60 * 30 },
    );
  });
}

/** 反查：经纬度 → 城市名（用 Open-Meteo geocoding 反向，简单兜底用最近的） */
export async function reverseCity(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh&count=1`,
    );
    if (!r.ok) return '当前位置';
    const d = await r.json();
    return d.results?.[0]?.name ?? '当前位置';
  } catch {
    return '当前位置';
  }
}
