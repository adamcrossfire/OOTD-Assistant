<div align="center">

# 👔 OOTD 帮你搭

**基于你真实衣橱的 AI 形象顾问**

每天早上不用再为"今天穿什么"发愁。结合天气、场合、风格偏好，从你自己的衣橱里搭出最合适的一套。

[🌐 在线体验](https://ootd-assistant.vercel.app) · [📖 功能介绍](#-核心功能) · [🛠 技术栈](#-技术栈)

![Status](https://img.shields.io/badge/status-online-success)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-blue)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## 🌟 项目介绍

**OOTD 帮你搭** 是一款移动端优先的 AI 穿搭助手 Demo。它解决了一个再日常不过的问题——

> "衣柜里全是衣服，但每天还是不知道穿什么。"

不同于普通的购物种草 App，OOTD 帮你搭让你管理**真实的衣橱**，结合**实时天气**和**当天场合**，给出 AI 推荐的搭配方案，并附上具体的搭配理由。

---

## ✨ 核心功能

### 🌤️ 日常搭配（Daily）
- **真实天气感知** — 接入 Open-Meteo API，获取所在城市当前温度、天气、紫外线
- **6 大场景选择** — 通勤 / 约会 / 运动 / 面试 / 派对 / 日常
- **4 档 Dress Code** — Casual / Smart Casual / Formal / Sporty
- **8 种风格偏好** — 极简 / 日系 / Y2K / 老钱风 / 街头 / 甜美 / 酷感 / 商务
- **AI 智能搭配** — 综合颜色协调（30%）、风格匹配（40%）、天气适配（30%）三维评分
- **LLM 文字理由** — 每套搭配附带具体的"为什么这么搭"说明

### 👚 我的衣橱（Wardrobe）
- 按品类分类（上装 / 下装 / 外套 / 连衣裙 / 鞋 / 配饰）
- 男士 / 女士衣橱独立内置
- **图像识别上传** — 拍照或选图后，AI 自动识别品类、主色、风格（Mock 实现）
- 单品穿搭次数统计

### ✈️ 出行装（Travel）
- **全球城市自动补全** — 输入城市名，自动匹配真实地理位置
- **未来 7 天精准天气** — 实时获取目的地天气趋势
- **AI 行李清单** — 根据天数、天气、风格、托运/手提限制，生成完整出行打包清单

### 💖 收藏（Favorites）
- 喜欢的搭配一键收藏
- 历史 Look 永久保存（基于浏览器本地存储）

---

## 🚀 在线体验

直接访问：**[https://ootd-assistant.vercel.app](https://ootd-assistant.vercel.app)**

无需注册、无需登录。所有数据保存在你自己的浏览器里，完全私密。

> 💡 建议在手机浏览器中打开，体验最佳。

---

## 📸 界面预览

| 日常搭配 | 我的衣橱 | 出行打包 |
|:---:|:---:|:---:|
| 实时天气 + 场景 + AI 搭配 | 真实电商风照片库 | 全球城市 + 7 天天气 |

> 真实截图请访问在线 Demo 查看

---

## 🛠 技术栈

### 前端
- **React 18** + **TypeScript** — 主框架
- **Vite** — 构建工具，开发体验丝滑
- **Tailwind CSS v3** + **shadcn/ui** — 设计系统
- **Wouter** — 轻量级路由
- **TanStack Query** — 数据请求与缓存
- **React Hook Form** + **Zod** — 表单与校验

### 数据层
- **localStorage** — 用户数据本地持久化（性别、衣橱、收藏、历史）
- **Supabase-shape 接口** — 预留云端同步升级路径
- **Open-Meteo API** — 免费、无需密钥的全球天气与地理编码
- **Unsplash** — 真实衣物图片素材库

### AI 能力（当前为 Mock，预留对接位）
- **图像识别** — `lib/vision-api.ts`：识别衣物品类 / 主色 / 风格
- **LLM 搭配理由** — `lib/llm-stylist.ts`：生成自然语言搭配说明
- **打分引擎** — `lib/style-engine.ts`：颜色 / 风格 / 天气加权评分

### 部署
- **Vercel** — 静态部署 + 全球 CDN + 自动 HTTPS

---

## 📁 项目结构

```
ootd/
├── client/                # 前端应用
│   └── src/
│       ├── pages/         # 页面组件
│       │   ├── Daily.tsx        # 日常搭配
│       │   ├── Wardrobe.tsx     # 我的衣橱
│       │   ├── Travel.tsx       # 出行装
│       │   └── Favorites.tsx    # 收藏
│       ├── lib/           # 核心逻辑
│       │   ├── storage.ts            # 本地持久化层
│       │   ├── weather-api.ts        # Open-Meteo 天气接入
│       │   ├── vision-api.ts         # 图像识别（Mock）
│       │   ├── llm-stylist.ts        # LLM 搭配理由（Mock）
│       │   ├── style-engine.ts       # 搭配打分引擎
│       │   ├── wardrobe-photos.ts    # Unsplash 照片库
│       │   └── mock-data.ts          # 内置示例衣橱
│       └── components/    # UI 组件
├── server/                # Express 后端（开发用，生产为纯静态）
├── shared/                # 前后端共享类型
├── vercel.json            # Vercel 部署配置
└── package.json
```

---

## 🏃 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/adamcrossfire/<your-repo-name>.git
cd <your-repo-name>

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:5000
```

> 需要 Node.js 18+ 环境

---

## 🎨 设计原则

- **真实优先** — 不用 emoji 占位、不用渲染图，全部使用真实电商风/Unsplash 照片
- **移动端原生体验** — iOS 风格圆角、底部 TabBar、44px 安全触控区
- **零认知负担** — 全中文界面，所有交互一步可达
- **隐私友好** — 数据全部本地存储，不上传任何用户隐私

---

## 🗺 路线图

- [x] **阶段 1**：MVP — 日常搭配 / 衣橱 / 出行 / 收藏 四大模块
- [x] **阶段 2**：真实天气 API、本地持久化、Unsplash 照片库、图像识别 Mock、LLM 搭配理由
- [ ] **阶段 3**：接入真实 LLM API（OpenAI / Anthropic）
- [ ] **阶段 4**：接入真实视觉模型（CLIP / 阿里云图像识别）
- [ ] **阶段 5**：Supabase 云端同步 + 邮箱登录
- [ ] **阶段 6**：社区分享 Look + 收藏排行

---

## 🤝 贡献

这是一个个人 Demo 项目，欢迎 Star ⭐ 和 Issue 反馈！

如果你想 Fork 改造，请保留原作者署名即可。

---

## 📄 许可证

MIT License — 自由使用，欢迎学习参考。

---

<div align="center">

**Made with ❤️ for everyone who stares at their closet every morning.**

[⬆ 回到顶部](#-ootd-帮你搭)

</div>
