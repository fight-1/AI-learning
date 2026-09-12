# fight-1 的 AI 学习笔记 · 活体宇宙

一个**会动的技术笔记站**：把 Agent 编排 · Skill 工程 · MCP 协议 · LLM 应用 · Token 优化 · UI 设计
学懂、记下、串起来。纯静态优先，部署在 Cloudflare Pages，push 即上线。

- 🌐 线上地址：https://ai-learning-3wy.pages.dev/
- 📦 仓库：https://github.com/fight-1/AI-learning

---

## ✨ 主要特性

**观感与个性化**
- 5 套皮肤：星空 / 墨剑江湖 / 赛博战甲 / 灵蕴修真 / 极简素白
- 明暗主题支持「跟随系统」（`prefers-color-scheme` 自动切换）
- 配色工坊：预设 + 色轮自定义 + **🎲 随机配色 / ⤓ 导出 / ⤒ 导入** JSON，亮度按明暗自适应
- 每套皮肤多种背景动效（星点、银河、流星、符文、墨晕、祥云、印章…），支持 `A+B` 组合
- 动态交互：粒子力场（排斥/吸引）、点击涟漪、古文古诗悬浮
- **快捷键可自定义**：在控制台改「专注阅读 / 切换主题 / 回到顶部」的键位，即时记忆
- **移动端 / 平板友好**：≤860px 自动切换为汉堡抽屉 + 底部快捷栏（首页 / 笔记 / 搜索 / 设置）

**阅读体验**
- 目录（TOC）滚动高亮、阅读时长估算、阅读进度条
- **专注阅读模式**：隐藏背景动效加宽正文，**正文对齐可切居左（默认）/ 居中**
- **阅读主题预设**：纸书 / 羊皮卷 / 护眼，只改正文区配色，不动导航外观
- 文章成熟度徽章（🌱 草稿 / 🌿 成长中 / 💎 已打磨），修订后显示「更新于 X」
- 锚点一键复制、代码块块头（语言名 + 文件名）+ 一键复制、图片/表格打印防跨页断裂
- 上一篇 / 下一篇、相关阅读、收藏、打印 / 导出 PDF、**下载原文 Markdown**

**内容组织与发现**
- Pagefind 全站搜索，按 `/` 直接聚焦搜索框；结果支持分类 / 标签**分面筛选**与命中高亮
- 归档、分类、标签（文字云 + 引力星轨）、草稿清单、RSS（含按分类订阅）
- **双链 wiki-link**：正文写 `[[slug]]` 即成内链，被引用的文章自动出现「🔗 被这些文章引用」
- **系列** `/series`：把文章串成阅读线，并显示**已读进度条**
- **知识图谱** `/graph`：标签共现力导向图，悬浮高亮邻居、点击下钻
- **本地摘录** `/clippings`：选中正文即可摘录（仅存本机）
- **更新日志** `/changelog`：按最后变动时间倒序，区分「新增 / 更新」
- **最近浏览** `/history`：本机阅读足迹，显示相对时间，可一键清空
- 笔记舞台：`/notes` 支持网格 / 列表 / 扇形 / 纵深 / 圆柱 / 球面 / 螺旋 / 波浪 8 种布局

**工程与性能**
- PWA：Service Worker 离线可读、回访秒开
- 背景 FPS 自适应降级（<50fps 自动减粒子 / 降 DPR / 关力场，帧率恢复后自动还原）
- 访客计数 + 热门文章榜（Cloudflare KV）
- SEO：sitemap、robots、canonical、OG/Twitter、WebSite + Article + BreadcrumbList 结构化数据
- 每篇文章独立的 1200×630 动态 OG 分享图

---

## 🛠 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Astro 5（静态输出）、MDX、TypeScript |
| 样式 | Tailwind + 全局 `global.css`（CSS 变量主题系统） |
| 搜索 | Pagefind（构建期生成中文索引） |
| 部署 | Cloudflare Pages + Pages Functions + KV（`VISITOR_KV`） |
| 评论 | giscus（GitHub Discussions，默认关闭可手动开启） |
| 分享图 | Python + Pillow 本地生成（`scripts/gen-og.py`） |

---

## 🚀 快速开始

```bash
npm install
npm run dev        # 本地开发 http://localhost:4321
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
npm run og         # 为文章重新生成 OG 分享图（需 Pillow：pip install Pillow）
```

> 新增或修改了文章的标题/摘要后，**记得跑一次 `npm run og`**，否则分享卡片会回退到默认图。

写文章：在 `src/content/notes/<分类>/<短名>.md` 写 frontmatter 即可，
字段见下方「文档」中的用户手册。`draft: true` 的文章不会发布，只出现在 `/drafts`。

---

## 📚 文档

完整说明拆成三份，按需查阅：

| 文档 | 内容 |
|---|---|
| **[项目说明.md](./项目说明.md)** | 项目定位、技术栈、目录结构、快速开始、部署与 KV 绑定 |
| **[架构设计.md](./架构设计.md)** | 总体架构、内容管线、主题系统、背景动效引擎与 FPS 降级、PWA、KV、SEO、缓存与无障碍 |
| **[用户手册.md](./用户手册.md)** | 读者篇（换肤/配色/搜索/专注模式/成就）+ 作者篇（写文章、生成 OG 图、部署、邮件订阅） |

---

## 🧭 页面一览

`/` 首页 · `/notes` 笔记（8 种舞台布局，支持 `?category=` `?tag=` 筛选） · `/archive` 归档 · `/categories` 分类 ·
`/tags` 标签（文字云 + 星轨） · `/series` 系列（含已读进度） · `/graph` 知识图谱 · `/search` 搜索 ·
`/favorites` 收藏 · `/clippings` 摘录 · `/changelog` 更新日志 · `/history` 最近浏览 · `/console` 舰长控制台 ·
`/drafts` 草稿 · `/subscribe` 订阅 · `/about` 关于

---

## 📄 说明

内容为作者学习笔记，随手写随更新；代码与文章同源，均在本仓库，可自由参考转载请注明出处。
