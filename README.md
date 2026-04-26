<div align="center">

# 👔 OOTD 帮你搭

**基于真实衣橱的 AI 形象顾问 · 每天早上不再纠结穿什么**

[🌐 在线体验](https://ootd-assistant.vercel.app) · [✨ 功能介绍](#-核心功能) · [🛠 技术栈](#-技术栈) · [🏃 本地运行](#-本地运行)

[![Status](https://img.shields.io/badge/status-online-success)](https://ootd-assistant.vercel.app)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-61dafb)](https://react.dev)
[![Style](https://img.shields.io/badge/UI-Tailwind%20%2B%20shadcn%2Fui-38bdf8)](https://tailwindcss.com)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 💡 项目简介

**OOTD 帮你搭** 解决的是一个日常痛点：

> 衣柜里全是衣服，但每天还是不知道穿什么。

不像普通的购物种草 App，OOTD 让你管理**真实衣橱**，结合**实时天气**、**今日场合**、**风格偏好**，AI 给出搭配方案，并附上具体理由。所有数据保存在你自己的浏览器里，**完全私密、无需登录**。

---

## ✨ 核心功能

<table>
<tr>
<td width="33%" valign="top">

### 🌤️ 日常搭
- 实时天气感知（Open-Meteo API）
- 6 大场景：通勤 / 约会 / 运动 / 面试 / 派对 / 日常
- 4 档 Dress Code：Casual / Smart Casual / Formal / Sporty
- 8 种风格偏好（多选）
- AI 多套搭配，**左右滑动切换**
- 每套附带搭配理由

</td>
<td width="33%" valign="top">

### 👚 我的衣橱
- 上装 / 下装 / 外套 / 连衣裙 / 鞋 / 配饰
- 男士 / 女士衣橱独立内置
- **图像识别上传** — 自动识别品类、主色、风格
- 单品穿搭次数统计

</td>
<td width="33%" valign="top">

### ✈️ 出行装
- 全球城市自动补全
- 未来 7 天精准天气预报
- AI 行李清单（按天数 / 风格 / 托运限制）
- 必带单品自定义

</td>
</tr>
</table>

### 💖 收藏与历史
喜欢的搭配一键收藏，历史 Look 永久保存（基于浏览器本地存储）

### 🎯 智能打分
综合 **颜色协调 30%** + **风格匹配 40%** + **天气适配 30%** 三维评分系统

---

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| **前端框架** | React 18 + TypeScript + Vite |
| **UI 系统** | Tailwind CSS v3 + shadcn/ui + Radix UI |
| **路由** | Wouter（轻量级 Hash 路由） |
| **状态/数据** | TanStack Query + React Hook Form + Zod |
| **持久化** | localStorage（Supabase-shape 接口预留升级位） |
| **天气数据** | Open-Meteo API（免费、无需密钥） |
| **图片素材** | Unsplash 真实电商风照片库 |
| **AI 能力** | 图像识别 + LLM 搭配理由（Mock 接口，预留对接位） |
| **部署** | Vercel · 全球 CDN · 自动 HTTPS |

---

## 🌐 在线体验

直接打开：**[https://ootd-assistant.vercel.app](https://ootd-assistant.vercel.app)**

> 💡 **建议在手机浏览器中打开**，体验最佳。所有交互（滑动卡片、收藏、添加衣物）都为移动端原生设计。

---

## 🏃 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/<your-username>/ootd-assistant.git
cd ootd-assistant

# 2. 安装依赖（需要 Node.js 18+）
npm install

# 3. 启动开发服务器
npm run dev
# 浏览器访问 http://localhost:5000
```

### 构建生产版本

```bash
npm run build
# 输出到 dist/public/
```

---

## 📁 项目结构

```
ootd/
├── client/src/
│   ├── pages/                  # 页面
│   │   ├── Daily.tsx           # 日常搭（含 LookSwiper 滑动卡片）
│   │   ├── Wardrobe.tsx        # 我的衣橱
│   │   ├── Travel.tsx          # 出行装
│   │   └── Favorites.tsx       # 收藏
│   ├── lib/                    # 核心逻辑
│   │   ├── storage.ts          # 本地持久化
│   │   ├── weather-api.ts      # Open-Meteo 天气
│   │   ├── vision-api.ts       # 图像识别 (Mock)
│   │   ├── llm-stylist.ts      # LLM 搭配理由 (Mock)
│   │   ├── style-engine.ts     # 搭配打分引擎
│   │   ├── wardrobe-photos.ts  # Unsplash 照片库
│   │   └── mock-data.ts        # 内置示例衣橱
│   └── components/             # UI 组件（含 LookCard）
├── server/                     # Express 后端（开发用）
├── shared/schema.ts            # 前后端共享类型
├── vercel.json                 # Vercel 部署配置
└── package.json
```

---

## 🎨 设计原则

- **真实优先** — 不用 emoji 占位、不用渲染图，全部使用真实电商风照片
- **移动端原生体验** — iOS 风格圆角、底部 TabBar、44px 安全触控区
- **零认知负担** — 全中文界面，所有交互一步可达
- **隐私友好** — 数据全部本地存储，不上传任何用户隐私
- **避免选择困难** — 一次只展示一套搭配，左右滑动切换

---

## 🗺 路线图

- [x] **阶段 1**：MVP — 日常搭 / 衣橱 / 出行 / 收藏 四大模块
- [x] **阶段 2**：真实天气 API、本地持久化、Unsplash 照片库、图像识别 Mock、LLM 搭配理由 Mock、单卡滑动交互
- [ ] **阶段 3**：接入真实 LLM API（OpenAI / Anthropic）替换 Mock 文案
- [ ] **阶段 4**：接入真实视觉模型（CLIP / 阿里云图像识别）
- [ ] **阶段 5**：Supabase 云端同步 + 邮箱登录
- [ ] **阶段 6**：社区分享 Look + 关注 + 排行榜

---

## 📸 界面预览

> 部署在 [ootd-assistant.vercel.app](https://ootd-assistant.vercel.app)，打开即可体验完整功能

主要页面：日常搭（滑动卡片）· 我的衣橱（按品类筛选）· 出行装（行李清单生成）· 收藏

---

## 🤝 贡献

这是一个个人 Demo 项目，欢迎 ⭐ Star 和 Issue 反馈！

如果你想 Fork 改造，请保留原作者署名。

---

## 📄 许可证

MIT License — 自由使用，欢迎学习参考。

---

<div align="center">

**Made with ❤️ for everyone who stares at their closet every morning.**

</div>
