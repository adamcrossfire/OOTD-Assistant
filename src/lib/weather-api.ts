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

/** feature_code 优先级：首都 > 省会 > 其他类型。返回越小越优先 */
function featurePriority(code?: string): number {
  if (!code) return 9;
  if (code === 'PPLC') return 0; // 首都
  if (code === 'PPLA') return 1; // 一级行政中心（省会）
  if (code === 'PPLA2') return 2; // 二级行政中心
  if (code === 'PPLA3') return 3;
  if (code === 'PPL') return 4;
  return 9;
}

/**
 * 中文 → 英文别名表。
 * 解决根因：Open-Meteo 不论 language 参数，name 字段都按字面匹配。
 * 用户输入「东京」时，数据库里日本东京的 native name 是繁体「東京」，
 * 中文查询只能命中中国境内叫「东京」的小村（江苏/浙江/江西）。
 * 因此命中下表时，直接用英文名查询，再把展示名替换回中文。
 */
const CITY_ALIAS_ZH_EN: Record<string, { en: string; zh: string; country?: string }> = {
  // 中国主要城市（中文查询会只返回同名小地名，需用拼音查询）
  北京: { en: 'Beijing', zh: '北京', country: '中国' },
  上海: { en: 'Shanghai', zh: '上海', country: '中国' },
  广州: { en: 'Guangzhou', zh: '广州', country: '中国' },
  深圳: { en: 'Shenzhen', zh: '深圳', country: '中国' },
  杭州: { en: 'Hangzhou', zh: '杭州', country: '中国' },
  成都: { en: 'Chengdu', zh: '成都', country: '中国' },
  重庆: { en: 'Chongqing', zh: '重庆', country: '中国' },
  西安: { en: 'Xi\'an', zh: '西安', country: '中国' },
  南京: { en: 'Nanjing', zh: '南京', country: '中国' },
  苏州: { en: 'Suzhou', zh: '苏州', country: '中国' },
  武汉: { en: 'Wuhan', zh: '武汉', country: '中国' },
  天津: { en: 'Tianjin', zh: '天津', country: '中国' },
  青岛: { en: 'Qingdao', zh: '青岛', country: '中国' },
  厦门: { en: 'Xiamen', zh: '厦门', country: '中国' },
  三亚: { en: 'Sanya', zh: '三亚', country: '中国' },
  丽江: { en: 'Lijiang', zh: '丽江', country: '中国' },
  大理: { en: 'Dali', zh: '大理', country: '中国' },
  拉萨: { en: 'Lhasa', zh: '拉萨', country: '中国' },
  哈尔滨: { en: 'Harbin', zh: '哈尔滨', country: '中国' },
  大连: { en: 'Dalian', zh: '大连', country: '中国' },
  香港: { en: 'Hong Kong', zh: '香港', country: '中国' },
  澳门: { en: 'Macau', zh: '澳门', country: '中国' },
  台北: { en: 'Taipei', zh: '台北', country: '中国' },
  // 日韩
  东京: { en: 'Tokyo', zh: '东京', country: '日本' },
  京都: { en: 'Kyoto', zh: '京都', country: '日本' },
  大阪: { en: 'Osaka', zh: '大阪', country: '日本' },
  名古屋: { en: 'Nagoya', zh: '名古屋', country: '日本' },
  札幌: { en: 'Sapporo', zh: '札幌', country: '日本' },
  福冈: { en: 'Fukuoka', zh: '福冈', country: '日本' },
  神户: { en: 'Kobe', zh: '神户', country: '日本' },
  横滨: { en: 'Yokohama', zh: '横滨', country: '日本' },
  奈良: { en: 'Nara', zh: '奈良', country: '日本' },
  冲绳: { en: 'Okinawa', zh: '冲绳', country: '日本' },
  首尔: { en: 'Seoul', zh: '首尔', country: '韩国' },
  釜山: { en: 'Busan', zh: '釜山', country: '韩国' },
  济州: { en: 'Jeju', zh: '济州', country: '韩国' },
  // 欧洲
  巴黎: { en: 'Paris', zh: '巴黎', country: '法国' },
  伦敦: { en: 'London', zh: '伦敦', country: '英国' },
  罗马: { en: 'Rome', zh: '罗马', country: '意大利' },
  米兰: { en: 'Milan', zh: '米兰', country: '意大利' },
  威尼斯: { en: 'Venice', zh: '威尼斯', country: '意大利' },
  佛罗伦萨: { en: 'Florence', zh: '佛罗伦萨', country: '意大利' },
  柏林: { en: 'Berlin', zh: '柏林', country: '德国' },
  慕尼黑: { en: 'Munich', zh: '慕尼黑', country: '德国' },
  法兰克福: { en: 'Frankfurt', zh: '法兰克福', country: '德国' },
  马德里: { en: 'Madrid', zh: '马德里', country: '西班牙' },
  巴塞罗那: { en: 'Barcelona', zh: '巴塞罗那', country: '西班牙' },
  阿姆斯特丹: { en: 'Amsterdam', zh: '阿姆斯特丹', country: '荷兰' },
  维也纳: { en: 'Vienna', zh: '维也纳', country: '奥地利' },
  布拉格: { en: 'Prague', zh: '布拉格', country: '捷克' },
  苏黎世: { en: 'Zurich', zh: '苏黎世', country: '瑞士' },
  日内瓦: { en: 'Geneva', zh: '日内瓦', country: '瑞士' },
  雅典: { en: 'Athens', zh: '雅典', country: '希腊' },
  里斯本: { en: 'Lisbon', zh: '里斯本', country: '葡萄牙' },
  斯德哥尔摩: { en: 'Stockholm', zh: '斯德哥尔摩', country: '瑞典' },
  哥本哈根: { en: 'Copenhagen', zh: '哥本哈根', country: '丹麦' },
  // 美洲
  纽约: { en: 'New York', zh: '纽约', country: '美国' },
  洛杉矶: { en: 'Los Angeles', zh: '洛杉矶', country: '美国' },
  旧金山: { en: 'San Francisco', zh: '旧金山', country: '美国' },
  芝加哥: { en: 'Chicago', zh: '芝加哥', country: '美国' },
  波士顿: { en: 'Boston', zh: '波士顿', country: '美国' },
  西雅图: { en: 'Seattle', zh: '西雅图', country: '美国' },
  迈阿密: { en: 'Miami', zh: '迈阿密', country: '美国' },
  拉斯维加斯: { en: 'Las Vegas', zh: '拉斯维加斯', country: '美国' },
  华盛顿: { en: 'Washington', zh: '华盛顿', country: '美国' },
  夏威夷: { en: 'Honolulu', zh: '夏威夷', country: '美国' },
  多伦多: { en: 'Toronto', zh: '多伦多', country: '加拿大' },
  温哥华: { en: 'Vancouver', zh: '温哥华', country: '加拿大' },
  // 中东 / 大洋洲
  迪拜: { en: 'Dubai', zh: '迪拜', country: '阿联酋' },
  阿布扎比: { en: 'Abu Dhabi', zh: '阿布扎比', country: '阿联酋' },
  伊斯坦布尔: { en: 'Istanbul', zh: '伊斯坦布尔', country: '土耳其' },
  悉尼: { en: 'Sydney', zh: '悉尼', country: '澳大利亚' },
  墨尔本: { en: 'Melbourne', zh: '墨尔本', country: '澳大利亚' },
  奥克兰: { en: 'Auckland', zh: '奥克兰', country: '新西兰' },
  // 东南亚
  曼谷: { en: 'Bangkok', zh: '曼谷', country: '泰国' },
  普吉岛: { en: 'Phuket', zh: '普吉岛', country: '泰国' },
  清迈: { en: 'Chiang Mai', zh: '清迈', country: '泰国' },
  新加坡: { en: 'Singapore', zh: '新加坡', country: '新加坡' },
  吉隆坡: { en: 'Kuala Lumpur', zh: '吉隆坡', country: '马来西亚' },
  巴厘岛: { en: 'Denpasar', zh: '巴厘岛', country: '印度尼西亚' },
  雅加达: { en: 'Jakarta', zh: '雅加达', country: '印度尼西亚' },
  马尼拉: { en: 'Manila', zh: '马尼拉', country: '菲律宾' },
  胡志明市: { en: 'Ho Chi Minh City', zh: '胡志明市', country: '越南' },
  河内: { en: 'Hanoi', zh: '河内', country: '越南' },
};

/** 搜索城市（用于出行模式输入目的地时下拉提示）
 *  策略：
 *    1. 若输入命中中→英别名表（著名国际城市），用英文名查询，确保命中真正的目标城市
 *    2. 否则用中文查询（覆盖国内城市）
 *    3. 都查不到时再用英文兜底一次
 *  最后按 feature_code（首都/省会优先）+ population 排序 */
export async function searchCity(query: string): Promise<CityResult[]> {
  const q = query.trim();
  if (!q) return [];

  const fetchByName = async (name: string, lang: 'zh' | 'en') => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name,
    )}&count=5&language=${lang}&format=json`;
    const r = await fetch(url);
    if (!r.ok) return [] as any[];
    const data = await r.json();
    return (data.results ?? []) as any[];
  };

  const sortAndMap = (arr: any[], overrideName?: string, overrideCountry?: string): CityResult[] => {
    const sorted = [...arr].sort((a, b) => {
      const fa = featurePriority(a.feature_code);
      const fb = featurePriority(b.feature_code);
      if (fa !== fb) return fa - fb;
      const pa = a.population ?? 0;
      const pb = b.population ?? 0;
      return pb - pa;
    });
    return sorted.slice(0, 5).map((x: any) => ({
      id: x.id,
      name: overrideName ?? x.name,
      country: overrideCountry ?? x.country ?? '',
      admin1: x.admin1,
      latitude: x.latitude,
      longitude: x.longitude,
      timezone: x.timezone,
    }));
  };

  // 中文国家名 → 英文名提示（用于匹配 API 返回的英文 country）
  function enCountryHint(zh: string): string {
    const m: Record<string, string> = {
      '中国': 'China', '日本': 'Japan', '韩国': 'South Korea',
      '法国': 'France', '英国': 'United Kingdom', '意大利': 'Italy',
      '德国': 'Germany', '西班牙': 'Spain', '荷兰': 'Netherlands',
      '奥地利': 'Austria', '捷克': 'Czechia', '瑞士': 'Switzerland',
      '希腊': 'Greece', '葡萄牙': 'Portugal', '瑞典': 'Sweden', '丹麦': 'Denmark',
      '美国': 'United States', '加拿大': 'Canada',
      '阿联酋': 'United Arab Emirates', '土耳其': 'Turkey',
      '澳大利亚': 'Australia', '新西兰': 'New Zealand',
      '泰国': 'Thailand', '新加坡': 'Singapore', '马来西亚': 'Malaysia',
      '印度尼西亚': 'Indonesia', '菲律宾': 'Philippines', '越南': 'Vietnam',
    };
    return m[zh] ?? zh;
  }

  try {
    // 1. 命中中文别名表 → 用英文查询，同时查中文补充取 admin1
    const alias = CITY_ALIAS_ZH_EN[q];
    if (alias) {
      const [enRes, zhRes] = await Promise.all([
        fetchByName(alias.en, 'en'),
        fetchByName(q, 'zh'),
      ]);
      // 在英文结果里优先选 name === alias.en 且 country 匹配的（避免 Suzhou→宿州这种拼音同音问题）
      const matchCountry = (x: any) => {
        if (!alias.country) return true;
        const c = (x.country ?? '') as string;
        // 中国 / China 都认，日本 / Japan 都认
        return c.includes(alias.country) || c === enCountryHint(alias.country);
      };
      const exact = enRes.filter((x) => x.name === alias.en && matchCountry(x));
      const pool = exact.length > 0 ? exact : enRes.filter(matchCountry);
      const finalPool = pool.length > 0 ? pool : enRes;
      if (finalPool.length > 0) {
        // 按 PPLC/PPLA 优先选顶
        finalPool.sort((a, b) => {
          const fa = featurePriority(a.feature_code);
          const fb = featurePriority(b.feature_code);
          if (fa !== fb) return fa - fb;
          return (b.population ?? 0) - (a.population ?? 0);
        });
        const top = finalPool[0];
        // 从中文查询里找同 id 的项，有话取 admin1 中文名
        const zhMatch = zhRes.find((z) => z.id === top.id);
        const head: CityResult = {
          id: top.id,
          name: alias.zh,
          country: alias.country ?? top.country ?? '',
          admin1: zhMatch?.admin1 ?? top.admin1,
          latitude: top.latitude,
          longitude: top.longitude,
          timezone: top.timezone,
        };
        const rest = sortAndMap(finalPool.slice(1));
        return [head, ...rest].slice(0, 5);
      }
    }
    // 2. 普通中文查询（国内城市走这里）
    const zhRes = await fetchByName(q, 'zh');
    if (zhRes.length > 0) return sortAndMap(zhRes);
    // 3. 英文兜底
    const enRes = await fetchByName(q, 'en');
    return sortAndMap(enRes);
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

/**
 * 拉指定城市未来 N 天预报
 * @param days 想要多少天（默认 7，最大 30）
 *   - 1-16 天：Open-Meteo 真实预报（精度递减）
 *   - 17-30 天：前 16 天真实 + 后续按历史同期均值循环兜底
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  city: string,
  days = 7,
): Promise<Weather[]> {
  const totalDays = Math.max(1, Math.min(30, days));
  const apiDays = Math.min(16, totalDays); // Open-Meteo 单次最多 16 天
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
      `&forecast_days=${apiDays}&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const d = await r.json();
    const dates = d.daily.time as string[];
    const real: Weather[] = dates.map((date, i) => ({
      date,
      tempHigh: Math.round(d.daily.temperature_2m_max[i]),
      tempLow: Math.round(d.daily.temperature_2m_min[i]),
      condition: wmoToCondition(d.daily.weather_code[i]),
      uv: uvLevel(d.daily.uv_index_max[i] ?? 0),
      city,
    }));
    // 不足部分用「最近一周均值循环」兜底
    if (real.length >= totalDays) return real.slice(0, totalDays);
    return padToLength(real, totalDays, city);
  } catch (e) {
    console.warn('[weather] fetch failed, falling back to mock', e);
    return getMockWeather(city, undefined, totalDays);
  }
}

/** 把 base 数组延长到 totalDays，多出来的天按 base 末尾循环（保留每天日期推进） */
function padToLength(base: Weather[], totalDays: number, city: string): Weather[] {
  if (base.length === 0) return getMockWeather(city, undefined, totalDays);
  const out = [...base];
  const lastDate = new Date(base[base.length - 1].date);
  const sample = base.slice(-7); // 用最后 7 天作为循环模板
  for (let i = out.length; i < totalDays; i++) {
    const next = new Date(lastDate);
    next.setDate(next.getDate() + (i - base.length + 1));
    const tmpl = sample[i % sample.length];
    out.push({
      ...tmpl,
      date: next.toISOString().slice(0, 10),
      city,
    });
  }
  return out;
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
