<div align="center">

# 👔 OOTD 帮你搭

**基于真实衣橱的 AI 形象顾问 · 每天早上不再纠结穿什么**

[🌐 在线体验](https://ootd-assistant.vercel.app) · [✨ 功能介绍](#-核心功能) · [🛠 技术栈](#-技术栈) · [⚙️ 部署配置](#️-部署配置vercel--环境变量) · [🏃 本地运行](#-本地运行)

[![Status](https://img.shields.io/badge/status-online-success)](https://ootd-assistant.vercel.app)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-61dafb)](https://react.dev)
[![Style](https://img.shields.io/badge/UI-Tailwind%20%2B%20shadcn%2Fui-38bdf8)](https://tailwindcss.com)
[![AI](https://img.shields.io/badge/AI-Qwen%20%2B%20OpenAI-9333ea)](https://bailian.console.aliyun.com)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## 💡 项目简介

**OOTD 帮你搭** 解决的是一个日常痛点：

> 衣柜里全是衣服，但每天还是不知道穿什么。

不像普通的购物种草 App，OOTD 让你管理**真实衣橱**，结合**实时天气**、**今日场合**、**风格偏好**，AI 给出搭配方案，并附上具体理由，**还能一键虚拟上身预览效果**。所有数据保存在你自己的浏览器里，**完全私密、无需登录**。

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
- 每套附带**真 LLM 生成的搭配理由**

</td>
<td width="33%" valign="top">

### 👚 我的衣橱
- 上装 / 下装 / 外套 / 连衣裙 / 鞋 / 配饰
- 男士 / 女士衣橱独立内置
- **真实视觉模型识别上传** — 自动识别品类、主色、风格
- 单品穿搭次数统计

</td>
<td width="33%" valign="top">

### ✈️ 出行装
- 双模式：**智能推荐**（从全衣橱挑） / **从必带单品**（只在选中单品里轮换）
- 全球城市自动补全
- 1–30 天精准天气预报（后 14 天同期均值兑底）
- AI 行李清单 + 每日穿搭日历
- **保存为固定行装** → 下次出差一键载入，只重拉天气

</td>
</tr>
</table>

### ✨ 一键试穿（AI 虚拟上身）
LookCard 操作行内嵌 **「✨一键试穿」** 入口，点击弹出浮窗 → 调用 AI 图像生成，把整套搭配穿到通用模特身上；上传你自己的正面照后，可一键切换到「**穿到我身上**」预览，结果自动缓存避免重复消耗 API。

### 💖 收藏与历史
- 双子 Tab：**日常 Look** + **固定行装**
- 喜欢的搭配一键收藏，历史 Look 永久保存（基于浏览器本地存储）
- 出差高频套可命名保存，点卡片 → 跳出行页载入参数 + 重拉新天气

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
| **AI 搭配理由** | 通义千问 `qwen-plus`（首选）/ OpenAI `gpt-4o-mini`（备选） |
| **AI 衣物识别** | 通义千问 `qwen-vl-plus`（首选）/ OpenAI `gpt-4o-mini`（备选） |
| **AI 虚拟试穿** | OpenAI `gpt-image-1`（generations + edits API） |
| **服务端** | Vercel Edge Functions（`/api/*.ts`） |
| **部署** | Vercel · 全球 CDN · 自动 HTTPS |

---

## 🌐 在线体验

直接打开：**[https://ootd-assistant.vercel.app](https://ootd-assistant.vercel.app)**

> 💡 **建议在手机浏览器中打开**，体验最佳。所有交互（滑动卡片、收藏、添加衣物、试穿）都为移动端原生设计。

---

## ⚙️ 部署配置（Vercel · 环境变量）

项目部署到 Vercel 后，**需要在 Vercel 控制台配置环境变量**才能启用真实 AI 能力。三个 API 都做了三层兜底：**真 AI 调用 → 失败 → 本地模板/采色兜底**，所以即使不配 key 也能跑出完整 demo 体验，只是体验会退化成模板版。

### 配置步骤

1. 进入 Vercel 项目 → **Settings → Environment Variables**
2. 点 **Add Environment Variable**，按下表添加（**Key 必须严格按拼写**，只能用大写字母+下划线，**不要把 sk-xxx 粘到 Key 栏**）
3. Environments 三个全勾上：✅ Production ✅ Preview ✅ Development
4. 保存后 → **Deployments → 最新一条 → ··· → Redeploy**（不重新部署不生效）

### 必备环境变量

| 变量名 | 用途 | 申请地址 | 备注 |
|---|---|---|---|
| `DASHSCOPE_API_KEY` | 搭配理由 + 衣物识别（首选，便宜） | [阿里云百炼](https://bailian.console.aliyun.com/?apiKey=1#/api-key) | 首次开通有 100 万免费 token；千次搭配理由 ≈ 1 元 |
| `OPENAI_API_KEY` | 一键试穿（图像生成）；搭配理由/识别的备选 | [OpenAI](https://platform.openai.com/api-keys) | 试穿用 `gpt-image-1`，约 0.3 元/次 |

### 配置矩阵（不同 key 组合下的体验）

| `DASHSCOPE_API_KEY` | `OPENAI_API_KEY` | 搭配理由 | 衣物识别 | 一键试穿 |
|:---:|:---:|---|---|---|
| ✅ | ✅ | 真 AI（通义） | 真 AI（通义） | 真 AI（OpenAI） |
| ✅ | ❌ | 真 AI（通义） | 真 AI（通义） | Demo 占位图 |
| ❌ | ✅ | 真 AI（OpenAI） | 真 AI（OpenAI） | 真 AI（OpenAI） |
| ❌ | ❌ | 本地模板 | 本地采色 | Demo 占位图 |

### 验证 AI 是否生效

部署完打开线上版本，浏览器 F12 → **Network** → 输入 `stylist` 过滤：

- 看到 `{"comment":"...", "source":"qwen"}` ⇒ ✅ 通义千问真在工作
- 看到 `{"comment":"...", "source":"openai"}` ⇒ ✅ OpenAI 真在工作
- 看到 `{"error":"NO_API_KEY", ...}` 或 503 ⇒ ❌ 还没读到 key，需要 Redeploy
- 看到 404 ⇒ ❌ Vercel 还没识别到 `/api/*.ts` 文件，确认 GitHub 上 `api/` 目录里有 3 个 .ts 文件

### 想换其它供应商？

`/api/*.ts` 三个文件结构都很类似：fetch URL + Bearer 认证 + 标准 ChatGPT 协议。改一下 baseURL 和模型名就能换成豆包、智谱、Replicate 等任何兼容 OpenAI 协议的服务。

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

> 💡 本地开发时 `/api/*` 不会真调（Express dev server 没接 Vercel Edge Runtime），三个 AI 接口都会自动走本地兜底。要测试真 AI，请部署到 Vercel。

### 构建生产版本

```bash
npm run build
# 输出到 dist/public/
```

---

## 📁 项目结构

```
ootd/
├── api/                            # Vercel Edge Functions（部署到 Vercel 自动识别）
│   ├── stylist.ts                  # AI 搭配理由生成（Qwen-Plus / GPT-4o-mini）
│   ├── vision.ts                   # AI 衣物图像识别（Qwen-VL-Plus / GPT-4o-mini）
│   └── tryon.ts                    # AI 虚拟试穿图像生成（GPT-Image-1）
├── client/src/
│   ├── pages/                      # 页面
│   │   ├── Daily.tsx               # 日常搭（含 LookSwiper 滑动卡片 + 试穿浮窗 + 本人照片上传）
│   │   ├── Wardrobe.tsx            # 我的衣橱
│   │   ├── Travel.tsx              # 出行装
│   │   └── Favorites.tsx           # 收藏
│   ├── components/
│   │   ├── LookCard.tsx            # 含「✨一键试穿 / ❤收藏 / ✓就穿它」三栏操作行
│   │   ├── TryOnDialog.tsx         # 虚拟试穿浮窗（通用模特/本人切换、缓存、骨架加载）
│   │   └── ui/                     # shadcn/ui 组件
│   ├── lib/                        # 核心逻辑
│   │   ├── storage.ts              # 本地持久化（含 selfPortrait + tryOnCache）
│   │   ├── weather-api.ts          # Open-Meteo 天气
│   │   ├── vision-api.ts           # 优先 /api/vision，失败本地采色兜底
│   │   ├── llm-stylist.ts          # 优先 /api/stylist，失败本地模板兜底
│   │   ├── tryon-api.ts            # 优先 /api/tryon，失败 demo 占位图兜底
│   │   ├── style-engine.ts         # 搭配打分引擎
│   │   ├── wardrobe-photos.ts      # Unsplash 照片库
│   │   └── mock-data.ts            # 内置示例衣橱
│   └── public/tryon-demo/          # 6 张本地试穿 demo 占位图
├── server/                         # Express 后端（仅本地开发用）
├── shared/schema.ts                # 前后端共享类型
├── vercel.json                     # Vercel 部署配置（含 /api/* rewrite）
└── package.json
```

---

## 🎨 设计原则

- **真实优先** — 不用 emoji 占位、不用渲染图，全部使用真实电商风照片
- **移动端原生体验** — iOS 风格圆角、底部 TabBar、44px 安全触控区
- **零认知负担** — 全中文界面，所有交互一步可达
- **隐私友好** — 数据全部本地存储，不上传任何用户隐私
- **避免选择困难** — 一次只展示一套搭配，左右滑动切换
- **AI 兜底设计** — 任何外部 AI 服务挂了，本地兜底也能让产品体验闭环

---

## 🗺 路线图

- [x] **阶段 1**：MVP — 日常搭 / 衣橱 / 出行 / 收藏 四大模块
- [x] **阶段 2**：真实天气 API、本地持久化、Unsplash 照片库、图像识别 Mock、LLM 搭配理由 Mock、单卡滑动交互
- [x] **🌟 一键试穿**：AI 虚拟上身（通用模特 + 本人切换 + 浏览器缓存）
- [x] **阶段 3**：接入真实 LLM API（通义千问 Qwen-Plus / OpenAI GPT-4o-mini，自动 fallback）
- [x] **阶段 4**：接入真实视觉模型（通义千问 Qwen-VL-Plus / OpenAI GPT-4o-mini，自动 fallback）
- [ ] **阶段 5**：Supabase 云端同步 + 邮箱登录（解决换设备数据丢失）
- [ ] **阶段 6**：社区分享 Look + 关注 + 排行榜

---

## 📸 界面预览

> 部署在 [ootd-assistant.vercel.app](https://ootd-assistant.vercel.app)，打开即可体验完整功能

主要页面：日常搭（滑动卡片 + 一键试穿）· 我的衣橱（按品类筛选 + AI 识别上传）· 出行装（行李清单生成）· 收藏

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
