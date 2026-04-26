// ============================================================
// 衣物真实图片库 —— Unsplash 免费可商用图（CC0）
//
// 阶段2 升级：用真实电商风衣物照片替代手绘 SVG，
// 视觉更贴近小红书 / 淘宝实拍风格，方便用户代入。
//
// 所有 URL 都加了 ?w=600&q=80&auto=format 参数，
// 让 Unsplash CDN 返回压缩后的 WebP，加载更快。
// ============================================================

const U = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

/** 衣物图片库：按 key 索引 */
export const PHOTO_LIB = {
  // —— 上装 ——
  tshirt_white: U('1521572163474-6864f9cf17ab'),
  shirt_stripe: U('1589810635657-232948472d98'),
  shirt_blue: U('1740711152088-88a009e877bb'),
  sweater_camel: U('1646270968349-dafd9f758e93'),
  sweater_gray: U('1574013451939-0a7e542f128e'),
  hoodie_black: U('1614214191247-5b2d3a734f1b'),

  // —— 下装 ——
  jeans_blue: U('1542272604-787c3835535d'),
  jeans_dark: U('1604176354204-9268737828e4'),
  skirt_black: U('1533659828870-95ee305cee3e'),
  pants_beige: U('1627361673985-6a1352d085f3'),
  pants_black: U('1772987353018-2e46b564e697'),
  shorts_olive: U('1591195853828-11db59a44f6b'),

  // —— 连衣裙 ——
  dress_floral: U('1572804013309-59a88b7e92f1'),
  dress_black: U('1612872217406-ed2471abf0a0'),

  // —— 外套 ——
  blazer_navy: U('1615349719958-8e6381dd2f3e'),
  coat_camel: U('1539533018447-63fcce2678e3'),
  puffer_black: U('1548126032-079a0fb0099d'),
  jacket_leather: U('1551028719-00167b16eac5'),

  // —— 鞋 ——
  sneakers_white: U('1722489291778-cb2a414d6ee0'),
  boots_brown: U('1604750490450-54cbd865a7d0'),
  shoes_oxford: U('1614253429340-98120bd6d753'),

  // —— 配饰 ——
  bag_brown: U('1487611600095-f67bfe984358'),
  scarf_red: U('1624362774821-7676e1709acd'),

  // —— 男士专用（避免共用图出现女模特）——
  blazer_navy_m: U('1592878904946-b3cd8ae243d0'),
  sweater_gray_m: U('1631193839654-c441ff75237e'),
} as const;

export type PhotoKey = keyof typeof PHOTO_LIB;

/** 用于占位符 / 加载失败兜底（用 utf8 编码避免 btoa 报错） */
export const PLACEHOLDER_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f5f1ea"/><circle cx="100" cy="95" r="30" fill="none" stroke="#c9b896" stroke-width="2"/><path d="M70 130 L130 130" stroke="#c9b896" stroke-width="2" stroke-linecap="round"/></svg>`,
  );
