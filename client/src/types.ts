// ============================================================
// OOTD帮你搭 —— 核心数据类型
// 阶段1 MVP：纯前端 React state，不接后端
// ============================================================

/** 用户性别（影响分类标签和推荐算法） */
export type Gender = 'female' | 'male';

/** 衣物大类 —— 用于筛选（性别共享 6 大类） */
export type Category =
  | 'top'        // 上装：T恤/衬衫/卫衣...
  | 'bottom'     // 下装：裤/裙
  | 'outer'      // 外套：夹克/大衣/羽绒服
  | 'dress'      // 连衣裙（仅女士可见）
  | 'shoes'      // 鞋靴
  | 'accessory'; // 配饰：包/帽/围巾/眼镜

/** 子类标签（自由字符串，便于扩展） */
export type SubCategory = string;

/** 季节属性 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

/** Dress Code 着装规范 */
export type DressCode = 'casual' | 'smart-casual' | 'formal' | 'sporty';

/** 风格标签 */
export type Style =
  | 'minimal'    // 极简
  | 'japanese'   // 日系
  | 'y2k'        // Y2K
  | 'oldmoney'   // 老钱风
  | 'street'     // 街头
  | 'sweet'      // 甜美
  | 'cool'       // 酷感
  | 'business';  // 商务

/** 场景 */
export type Occasion =
  | 'commute'    // 通勤
  | 'date'       // 约会
  | 'sport'      // 运动
  | 'interview'  // 面试
  | 'travel'     // 旅行
  | 'party'      // 派对
  | 'casual';    // 居家/日常

/** 衣橱单品 */
export interface Item {
  id: string;
  /** 图片 base64 / URL */
  photoUrl: string;
  category: Category;
  subCategory: SubCategory;        // 如 "T恤"、"牛仔裤"
  /** 主色（HEX 或色名，搭配引擎用此判断颜色协调） */
  color: string;
  /** 颜色家族（暖/冷/中性 —— 用于颜色冲突过滤） */
  colorFamily: 'warm' | 'cool' | 'neutral' | 'black' | 'white';
  pattern?: 'solid' | 'stripe' | 'check' | 'print' | 'denim';
  season: Season;
  styles: Style[];
  dressCodes: DressCode[];
  /** 是否防水 */
  waterproof?: boolean;
  /** 用户穿过几次 */
  wearCount: number;
  /** 备注 */
  note?: string;
}

/** 一套搭配 Look */
export interface Look {
  id: string;
  items: Item[];
  /** 适配场景 */
  occasion: Occasion;
  dressCode: DressCode;
  /** 适合的最低/最高温度 */
  weatherRange: { min: number; max: number };
  /** 风格标签 */
  styles: Style[];
  /** 匹配度评分 0-100 */
  score: number;
  /** 评分细节解读 */
  reason: string;
  /** 缺失的关键单品提示 */
  missingHint?: string;
}

/** 天气 */
export interface Weather {
  /** YYYY-MM-DD */
  date: string;
  /** 摄氏度 */
  tempHigh: number;
  tempLow: number;
  /** 天气状况 */
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  /** 紫外线 */
  uv: 'low' | 'medium' | 'high';
  /** 城市 */
  city: string;
}

/** 固定行装（用户保存的可复用出行方案） */
export interface SavedTrip {
  id: string;
  /** 用户自定义名称，如 "东京出差 5 天" */
  name: string;
  /** 创建时间 ISO */
  createdAt: string;
  /** 上次目的地（载入后可改） */
  destination: string;
  destCoords?: { lat: number; lon: number };
  days: number;
  purpose: 'business' | 'leisure' | 'mixed';
  luggage: 'cabin' | 'check-in';
  stylePrefs: Style[];
  /** 必带单品 ID（载入时按当前衣橱过滤） */
  lockedItemIds: string[];
  /** 生成模式 */
  mode: 'smart' | 'from-locked';
}

/** 出行计划 */
export interface Trip {
  id: string;
  destination: string;
  /** 行程开始日期 */
  startDate: string;
  days: number;
  purpose: 'business' | 'leisure' | 'mixed';
  /** 每日天气 */
  weather: Weather[];
  /** 每日搭配 */
  dailyLooks: Look[];
  /** 装箱清单 */
  packingList: Array<{ item: Item; packed: boolean }>;
  /** 必带单品 ID（AI 围绕它搭配） */
  lockedItemIds: string[];
  /** 限制条件 —— 如只带登机箱 */
  luggageType: 'cabin' | 'check-in';
}
