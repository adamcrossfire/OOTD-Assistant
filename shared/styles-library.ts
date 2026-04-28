// ============================================================
// 小红书流行风格库 —— Phase 1 内置 + Phase 2 用户自定义 + 趋势元数据
//
// 每个 StylePack 包含：
//   - 唯一 id + 中文名 + 一句话描述
//   - 配色色板（3-4 个 hex，用于卡片色块展示）
//   - 单品 emoji（用于卡片视觉化）
//   - styleKeywords：映射到现有 Style 类型 + 自由关键词（给 LLM 用）
//   - palette：色彩家族倾向（用于本地搭配筛选）
//   - season：适合的季节（用于过滤）
//   - source: 'builtin' | 'custom'
// ============================================================

export interface StylePack {
  id: string;
  name: string;
  description: string;
  /** 3-4 个代表色 hex */
  colors: string[];
  /** 关键单品 emoji（3-5 个） */
  emojis: string[];
  /** 风格关键词（中文，给 LLM prompt 用） */
  keywords: string[];
  /** 色彩倾向（本地过滤用） */
  paletteHint?: ('warm' | 'cool' | 'neutral' | 'black' | 'white')[];
  /** 适合季节 */
  seasons: ('spring' | 'summer' | 'autumn' | 'winter' | 'all')[];
  /** 适合性别（默认 unisex） */
  gender?: 'female' | 'male' | 'unisex';
  /** 来源 */
  source: 'builtin' | 'custom';
  /** 自定义风格的截图（仅 custom） */
  screenshot?: string;
  /** 阶段2：本风格的参考数据集/取材来源（趋势样本取自 Polyvore / Vogue Runway / 街拍数据集） */
  inspiration?: string;
  /** 阶段2：趋势注解，一句话点明热点来源，渲染在风格卡片副标题中 */
  trendingNote?: string;
  /** 阶段2：场合适配度（0-100），用于本地预筛选避免生成不合理组合 */
  occasionScore?: {
    commute: number;
    date: number;
    casual: number;
    party: number;
  };
}

// ========== 16 种内置风格（小红书 2024-2025 高频词） ==========

export const BUILTIN_STYLES: StylePack[] = [
  {
    id: 'qing-leng',
    name: '清冷感',
    description: '冷白皮、雾感、距离美，疏离又高级',
    colors: ['#e8eef2', '#9bb0c1', '#5a7693', '#2c3a4a'],
    emojis: ['🧥', '👖', '👢', '🧣'],
    keywords: ['冷色调', '雾蓝', '高级灰', '极简剪裁', '冷淡'],
    paletteHint: ['cool', 'white', 'black'],
    seasons: ['autumn', 'winter', 'spring'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'Polyvore + Vogue Runway',
    trendingNote: 'Phoebe Philo 回归带起的 quiet aesthetic',
    occasionScore: { commute: 95, date: 70, casual: 80, party: 50 },
  },
  {
    id: 'old-money',
    name: '老钱风',
    description: '低调不张扬的旧贵族感，quiet luxury',
    colors: ['#f5ecdb', '#c9b896', '#8b7355', '#3d3528'],
    emojis: ['👔', '👖', '👞', '👜'],
    keywords: ['西装外套', '卡其', '乐福鞋', '马球衫', '羊绒针织', '低调奢华'],
    paletteHint: ['neutral', 'warm'],
    seasons: ['all'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'Vogue Runway / The Row',
    trendingNote: 'Succession 成为 Pinterest 年度热词',
    occasionScore: { commute: 90, date: 95, casual: 70, party: 80 },
  },
  {
    id: 'dopamine',
    name: '多巴胺',
    description: '高饱和撞色，看一眼就开心',
    colors: ['#ff6b9d', '#ffd23f', '#3ec1d3', '#7ed957'],
    emojis: ['👕', '🧣', '👟', '🎒'],
    keywords: ['撞色', '糖果色', '亮色', '玩味', '高饱和'],
    paletteHint: ['warm', 'cool'],
    seasons: ['spring', 'summer'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'Pinterest 街拍 + Polyvore',
    trendingNote: '2024 小红书热词,巴黎时装周姬马赫赛带起',
    occasionScore: { commute: 50, date: 80, casual: 95, party: 90 },
  },
  {
    id: 'maillard',
    name: '美拉德',
    description: '焦糖、可可、奶油咖啡的层次',
    colors: ['#f4e4c1', '#c89878', '#8b5a3c', '#3d2817'],
    emojis: ['🧥', '👖', '👢', '🧣'],
    keywords: ['焦糖色', '可可色', '咖啡色', '同色系叠穿', '大地色'],
    paletteHint: ['warm', 'neutral'],
    seasons: ['autumn', 'winter'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'Vogue 街拍 + StreetStyle-27k',
    trendingNote: '2023 秋冬十二色调之首,小红书越热越狂',
    occasionScore: { commute: 90, date: 90, casual: 85, party: 65 },
  },
  {
    id: 'pure-desire',
    name: '纯欲',
    description: '甜与欲并存，慵懒勾人',
    colors: ['#fde7e4', '#f4b9b9', '#d68a8a', '#8b4040'],
    emojis: ['👚', '👗', '👠', '💄'],
    keywords: ['吊带', '蕾丝', '紧身', '低胸', '甜辣'],
    paletteHint: ['warm', 'white'],
    seasons: ['summer', 'spring'],
    gender: 'female',
    source: 'builtin',
    inspiration: 'Polyvore + 小红书个人主页',
    trendingNote: '人脸希、赵露思同款,甜辣风增长',
    occasionScore: { commute: 25, date: 95, casual: 50, party: 90 },
  },
  {
    id: 'qian-jin',
    name: '千金风',
    description: '名媛感，蝴蝶结、珍珠、小香风',
    colors: ['#f8e9e0', '#e6c7b3', '#d4a574', '#7a4e2d'],
    emojis: ['👗', '🧥', '👠', '👜'],
    keywords: ['小香风', '蝴蝶结', '珍珠', '泡泡袖', '名媛', '英伦'],
    paletteHint: ['warm', 'neutral'],
    seasons: ['spring', 'autumn'],
    gender: 'female',
    source: 'builtin',
    inspiration: 'Vogue Runway + Chanel 季后',
    trendingNote: 'Chanel 2024 春季中锻蝴蝶结使用率创新高',
    occasionScore: { commute: 60, date: 95, casual: 50, party: 95 },
  },
  {
    id: 'la-mei',
    name: '辣妹',
    description: '腰线、露肤、Y2K 复古辣',
    colors: ['#fff4ec', '#ffb59e', '#e75858', '#1a1a1a'],
    emojis: ['👕', '👖', '👠', '👙'],
    keywords: ['露脐', '紧身', '低腰', '辣妹', '性感', '腰线'],
    paletteHint: ['warm', 'black'],
    seasons: ['summer'],
    gender: 'female',
    source: 'builtin',
    inspiration: 'StreetStyle-27k + Pinterest',
    trendingNote: 'Bella Hadid Y2K 回归热潮',
    occasionScore: { commute: 15, date: 85, casual: 60, party: 95 },
  },
  {
    id: 'jk',
    name: 'JK 学院',
    description: '日系校园，清纯学生感',
    colors: ['#ffffff', '#1f3a68', '#a4232f', '#2c2c2c'],
    emojis: ['👔', '👗', '🎀', '🧦'],
    keywords: ['JK 制服', '百褶裙', '水手服', '领结', '校园风'],
    paletteHint: ['cool', 'white'],
    seasons: ['spring', 'autumn'],
    gender: 'female',
    source: 'builtin',
    inspiration: '日本校园鱼口拍数据集',
    trendingNote: '温妮同款、「三头身」作为年度趋势',
    occasionScore: { commute: 30, date: 80, casual: 90, party: 60 },
  },
  {
    id: 'xin-zhong-shi',
    name: '新中式',
    description: '盘扣、立领、马面裙的东方氛围',
    colors: ['#f5e6d3', '#a83a3a', '#3a5f3f', '#1a1a1a'],
    emojis: ['👘', '👖', '🥿', '🧣'],
    keywords: ['立领', '盘扣', '马面裙', '宋制', '东方', '茶系'],
    paletteHint: ['warm', 'neutral'],
    seasons: ['all'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: '上海时装周 + 剧集《妾本》',
    trendingNote: '2024 马面裙销量同比增 800%',
    occasionScore: { commute: 70, date: 90, casual: 75, party: 85 },
  },
  {
    id: 'y2k',
    name: 'Y2K 千禧',
    description: '低腰、亮片、撞色，2000 年代复辣',
    colors: ['#ff8fc7', '#a78bfa', '#7dd3fc', '#fde047'],
    emojis: ['👚', '👖', '👟', '🕶'],
    keywords: ['低腰', '亮片', '蝴蝶', '荧光', '撞色', '复古辣'],
    paletteHint: ['cool', 'warm'],
    seasons: ['spring', 'summer'],
    gender: 'female',
    source: 'builtin',
    inspiration: 'Polyvore Y2K 档案 + Tumblr',
    trendingNote: 'Olivia Rodrigo、《狂热》电影推动连续趋势',
    occasionScore: { commute: 20, date: 75, casual: 80, party: 95 },
  },
  {
    id: 'preppy',
    name: '学院风',
    description: '英伦学院，针织背心 + 衬衫',
    colors: ['#f5f0e6', '#9b6b3b', '#3a5d4a', '#2c2c2c'],
    emojis: ['👔', '🎓', '👞', '🎒'],
    keywords: ['针织背心', '格纹', '马甲', '皮鞋', '学院', '书院'],
    paletteHint: ['warm', 'neutral'],
    seasons: ['autumn', 'winter', 'spring'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'Vogue Runway + Polo Ralph Lauren',
    trendingNote: '《Gossip Girl》重启带起针织背心都市中产趋势',
    occasionScore: { commute: 90, date: 80, casual: 85, party: 60 },
  },
  {
    id: 'harajuku',
    name: '原宿',
    description: '撞色、夸张配饰、街头玩味',
    colors: ['#ff4d8d', '#4dffd0', '#ffeb4d', '#1a1a1a'],
    emojis: ['👕', '👖', '👟', '🧢'],
    keywords: ['撞色', '夸张配饰', '彩色头饰', '潮牌', 'oversized', '日系街头'],
    paletteHint: ['warm', 'cool'],
    seasons: ['spring', 'summer', 'autumn'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'StreetStyle-27k + FRUiTS 杂志',
    trendingNote: '代官山·原宿街拍复苏',
    occasionScore: { commute: 25, date: 65, casual: 90, party: 90 },
  },
  {
    id: 'french',
    name: '法式慵懒',
    description: '随性不刻意，巴黎左岸氛围',
    colors: ['#f5efe6', '#d4c4a8', '#5a7693', '#2c2c2c'],
    emojis: ['👚', '👖', '🥿', '🧣'],
    keywords: ['条纹衫', '芭蕾鞋', '直筒裤', '小方巾', '法式', '随性'],
    paletteHint: ['neutral', 'cool', 'white'],
    seasons: ['spring', 'autumn'],
    gender: 'female',
    source: 'builtin',
    inspiration: 'Vogue Paris + Sezane Lookbook',
    trendingNote: '巴黎奥运以后法式主义全球趋势',
    occasionScore: { commute: 90, date: 95, casual: 90, party: 70 },
  },
  {
    id: 'techwear',
    name: '街头机能',
    description: '功能面料、工装口袋、户外感',
    colors: ['#2c2c2c', '#5a5a5a', '#7d6e57', '#ff6a3d'],
    emojis: ['🧥', '👖', '👟', '🎒'],
    keywords: ['工装', '机能', '冲锋衣', '工装裤', '战术', '街头'],
    paletteHint: ['black', 'neutral'],
    seasons: ['all'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'ACRONYM 官方 + StreetStyle-27k',
    trendingNote: 'Salomon XT-6 带起机能风主流化',
    occasionScore: { commute: 70, date: 50, casual: 90, party: 75 },
  },
  {
    id: 'gorpcore',
    name: '户外山系',
    description: 'Gorpcore，城市穿户外装',
    colors: ['#3d5a3d', '#c4a574', '#5a4a3a', '#ff8c42'],
    emojis: ['🧥', '👖', '🥾', '🎒'],
    keywords: ['冲锋衣', '抓绒', '登山靴', '户外', 'Patagonia', '山系'],
    paletteHint: ['neutral', 'warm'],
    seasons: ['autumn', 'winter', 'spring'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: "Patagonia / Arc'teryx Lookbook",
    trendingNote: '「黑悟空打卡」推动户外装都市化',
    occasionScore: { commute: 60, date: 50, casual: 95, party: 55 },
  },
  {
    id: 'minimal',
    name: '极简',
    description: '黑白灰，无 logo 无装饰',
    colors: ['#ffffff', '#d4d4d4', '#5a5a5a', '#1a1a1a'],
    emojis: ['👕', '👖', '👟', '⌚'],
    keywords: ['黑白灰', '无 logo', '直线条', '极简', '冷淡', '高级'],
    paletteHint: ['black', 'white', 'neutral'],
    seasons: ['all'],
    gender: 'unisex',
    source: 'builtin',
    inspiration: 'COS / Jil Sander Lookbook',
    trendingNote: '「Quiet Luxury」诡点中的极简来面',
    occasionScore: { commute: 95, date: 80, casual: 90, party: 65 },
  },
  // ========== 男装倾向风格 ==========
  {
    id: 'city-boy',
    name: 'City Boy',
    description: '日系都市男孩，干净通勤潮人',
    colors: ['#f0e8d8', '#3a4a5a', '#7d6e57', '#1a1a1a'],
    emojis: ['👔', '👖', '👞', '🎒'],
    keywords: ['日系都市', '通勤潮', '简约层次', '直筒裤', '乐福鞋'],
    paletteHint: ['neutral', 'cool'],
    seasons: ['all'],
    gender: 'male',
    source: 'builtin',
    inspiration: 'POPEYE / Beams Lookbook',
    trendingNote: '东京代官山街拍、「日系中背」持续趋势',
    occasionScore: { commute: 95, date: 85, casual: 90, party: 60 },
  },
  {
    id: 'amekaji',
    name: '美式复古',
    description: 'Ametora，丹宁、皮夹克、工装靴',
    colors: ['#2c3a4a', '#8b5a3c', '#c4a574', '#1a1a1a'],
    emojis: ['🧥', '👖', '🥾', '🧢'],
    keywords: ['丹宁', '皮夹克', '工装靴', 'Ametora', '复古美式', 'Levis'],
    paletteHint: ['warm', 'neutral', 'black'],
    seasons: ['autumn', 'winter', 'spring'],
    gender: 'male',
    source: 'builtin',
    inspiration: 'RRL / Free & Easy 杂志',
    trendingNote: '复古丹宁收藏美学重热',
    occasionScore: { commute: 70, date: 80, casual: 95, party: 60 },
  },
  {
    id: 'salaryman',
    name: '日系商务',
    description: '干净西装通勤，温柔日系绅士',
    colors: ['#e8eef2', '#3a5060', '#1a1a1a', '#7d6e57'],
    emojis: ['👔', '👖', '👞', '👜'],
    keywords: ['西装', '衬衫', '通勤', '日系商务', '极简正装'],
    paletteHint: ['cool', 'neutral'],
    seasons: ['all'],
    gender: 'male',
    source: 'builtin',
    inspiration: 'United Arrows Lookbook',
    trendingNote: '「上班穿搭」赛道持续高增长',
    occasionScore: { commute: 95, date: 85, casual: 50, party: 65 },
  },
];

/** 按性别过滤风格列表（性别为 null 时不过滤） */
export function filterStylesByGender(
  styles: StylePack[],
  gender: 'female' | 'male' | null | undefined,
): StylePack[] {
  if (!gender) return styles;
  return styles.filter((s) => {
    const g = s.gender ?? 'unisex';
    if (g === 'unisex') return true;
    return g === gender;
  });
}

/** 通过 id 查询风格 */
export function getStyleById(id: string, customStyles: StylePack[] = []): StylePack | undefined {
  return BUILTIN_STYLES.find((s) => s.id === id) ?? customStyles.find((s) => s.id === id);
}
