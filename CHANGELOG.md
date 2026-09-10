# 更新日志（Changelog）

本项目的所有重要变更都会记录在这里。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

暂无。

## [1.0.0] - 2026-09-10

首个正式版本上线：https://ai-learning-3wy.pages.dev/

### 新增

**内容体系**
- 文章源 `src/content/notes/<分类>/*.md`，基于 Astro Content Collections，支持 Markdown / MDX
- 文章列表、详情页（含自动生成目录）、分类页、标签页、全文搜索、收藏夹、关于页
- frontmatter 支持 `title / date / category / tags / summary / featured / cover / draft`
- `draft: true` 可作为草稿暂存，不进入列表与 RSS

**皮肤与背景**
- 5 套皮肤：`cosmic`（星空）、`cyber`（赛博）、`xianxia`（仙侠）、`ink`（水墨）、`minimal`（极简）
- **古文古诗悬浮背景**：整首竖排呈现（标题/作者/正文），缓入缓出 + 缓慢上漂，诗文数据在 `src/lib/poems.ts`
- 水墨/仙侠/星空/赛博各有多套背景渲染模式（符文法阵、祥云、印章、星云、六边形等中国元素）
- 配色工坊：可在导航「战甲」面板与 `/console` 控制台实时调色并记忆偏好

**动态交互层**
- 粒子力场：鼠标对背景粒子施加排斥/吸引（`data-bg-force`：`repel` / `attract` / `off`）
- 点击爆发：点击处生成涟漪与火花（`data-bg-click`：`on` / `off`）
- 两者均可关闭，并遵循 `prefers-reduced-motion` 无障碍设置

**站点交互**
- 深空雷达搜索、星际通讯（点赞注入能量 / 收藏牵引光束）、卡片跃迁转场
- 活体光标与粒子拖尾、阅读进度能量条、成就系统与彩蛋（`/console`）
- RSS 订阅源与 `/subscribe` 订阅说明页（订阅地址一键复制）

**工程**
- 部署至 Cloudflare Pages：推送即构建，构建参数已固化（Astro / `npm run build` / `dist` / Node 22）
- 补充 `.gitignore`、`.nvmrc`、`.node-version`、文章模板与部署文档

### 修复

- **古文古诗背景画布未逐帧清屏**：导致点击后的粒子/涟漪永久残留（"烟花不消失"），
  且诗句逐帧叠加成拖影、越看越糊。已在 `guwen().frame()` 开头补 `clear()`
- 配色工坊色轮回填值与 CSS 不同步（`palette.js` 常量与 `global.css` 漂移）
- 多皮肤切换时脚本加载顺序导致的皮肤属性错乱

### 变更

- **放弃用 XSL 样式表美化 RSS**：2026 年起 Chrome / Edge 已移除 XSLT（`XSLTProcessor` 不存在），
  带 `<?xml-stylesheet?>` 的 XML 在新内核中会退化成纯文本。改为保持 RSS 纯净 XML，
  另建 `/subscribe` 页面承担浏览器端的可读预览
- 站点地址配置 `SITE` 由占位值更新为正式域名，RSS 与站内绝对链接全部指向真实地址

### 已知限制

- 背景组合模式（`data-bg="A+B"`）并非真正叠加：后一模式的 `clear()` 会擦掉前一个，
  仅含自身底图的模式（如 `meteor`）组合才完整；`guwen` 建议单独使用
- 站点托管于境外（Cloudflare），国内访问速度受网络环境影响

---

## 版本号说明

- **主版本号**：结构性调整或破坏性变更
- **次版本号**：新增功能（向下兼容）
- **修订号**：缺陷修复与细节优化
