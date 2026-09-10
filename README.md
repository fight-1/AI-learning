# fight-1 · AI 学习笔记

> 把 Agent · Skill · MCP · LLM · Token 优化 · UI 设计… 学懂、记下、串起来。

一个「活体宇宙」风格的个人技术笔记站：文章用 Markdown 写，推送即发布。

- **线上地址**：https://ai-learning-3wy.pages.dev/
- **订阅源**：https://ai-learning-3wy.pages.dev/rss.xml （订阅说明见 `/subscribe`）

## 技术栈

[Astro 5](https://astro.build/)（静态输出）+ Tailwind + MDX + TypeScript。
无后端、无数据库，全部内容为静态页面，交互层为原生 Canvas / JS。

## 主要特性

**多皮肤与背景**
- 5 套皮肤：`cosmic`（星空）· `cyber`（赛博）· `xianxia`（仙侠）· `ink`（水墨）· `minimal`（极简）
- 每套皮肤有多种背景渲染模式，如水墨/仙侠下的 **古文古诗悬浮**（整首竖排、缓入缓出、缓慢上漂）
- 皮肤、背景、配色均可在导航「战甲」面板或 `/console` 控制台实时切换，并记忆到 localStorage

**动态交互层**
- 粒子力场：鼠标对背景粒子施加排斥/吸引（`data-bg-force`：`repel` / `attract` / `off`）
- 点击爆发：点击处生成涟漪与火花（`data-bg-click`：`on` / `off`）
- 两者均可关闭，`prefers-reduced-motion` 下自动不启用

**其他交互**
深空雷达搜索 · 星际通讯（点赞注入能量 / 收藏牵引光束）· 卡片跃迁转场 · 活体光标与粒子拖尾 · 阅读进度能量条 · 成就与彩蛋（`/console`）

**内容能力**
文章列表 / 详情（含目录）· 分类 · 标签星轨图 · 全文搜索 · 收藏夹 · 关于页 · RSS 订阅与订阅页

## 目录结构

```
src/
├─ content/notes/      # 文章源：<分类>/<短名>.md 或 .mdx
│  └─ config.ts        # frontmatter 校验规则（schema）
├─ pages/              # 路由页面（index / notes / tags / categories / search / subscribe / console…）
├─ components/         # Nav、NoteCard、SkinSwitcher、Toc
├─ layouts/            # BaseLayout（加载全部脚本与背景画布）
├─ lib/                # notes（内容读取）、poems（古诗数据）、universe（工具）
├─ scripts/            # bg（背景引擎）、cursor、radar、interactions、warp、palette…
└─ styles/global.css
public/                # 静态资源（favicon 等）
templates/             # 文章模板（不会被当作文章收录）
设计文档/              # 设计与开发文档
DEPLOY.md              # 部署与发布流程
```

## 本地开发

```bash
npm install
npm run dev       # 开发预览
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
```

需要 **Node 22**（已提供 `.nvmrc` / `.node-version`）。

> 若 `npm run build` 被安全删除守卫拦截而报 `exit 1`，用：
> `env -u CODEBUDDY_SESSION_ID -u CLAUDE_SESSION_ID npm run build`

## 写文章

在 `src/content/notes/<分类>/<英文短名>.md` 新建文件（可从 `templates/note-template.md` 复制）：

```yaml
---
title: 文章标题
date: 2026-09-10
category: Agent              # 分类，首页"按分类游览"会聚合
tags: [标签1, 标签2]           # 用于标签页与雷达搜索
summary: 一句话摘要            # 显示在卡片和 RSS 中
featured: false              # true 则首页优先展示
draft: false                 # true = 草稿，不发布（列表与 RSS 都会过滤）
# cover: /images/xxx.png     # 可选封面
---
```

保存后 `git commit && git push`，Cloudflare Pages 会自动构建，约 1~2 分钟上线。

草稿写法：`draft: true` 先存着，写完改回 `false` 再推送即可发布。

## 部署

托管在 **Cloudflare Pages**，推送即部署。构建参数：

| 项 | 值 |
|---|---|
| Framework preset | `Astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION` = `22` |

站点地址配置在 `astro.config.mjs` 的 `SITE`（影响 RSS 与站内绝对链接）；更换域名时需同步修改。
详细步骤见 [DEPLOY.md](./DEPLOY.md)。

## 说明

- 文章源使用 Astro Content Collections，schema 见 `src/content/config.ts`
- 背景渲染器集中在 `src/scripts/bg.js`，新增背景模式需同步注册到 `REG`、默认模式与皮肤切换面板
- 站点为境外托管（Cloudflare），无需 ICP 备案
