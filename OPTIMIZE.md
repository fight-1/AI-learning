# AI-learning 站点完整优化方案

> **现状**：Astro 5 静态站，Cloudflare Pages 部署（`ai-learning-3wy.pages.dev`）。
> 已具备：多皮肤 + 配色工坊、动态背景（力场/点击/古文）、订阅页 `/subscribe`、RSS、KV 访客计数器。
> **已完成**：✅ 第一批 SEO/分享（sitemap.xml / og:*/twitter:* / JSON-LD / canonical / robots.txt / 404 页）+ 页脚 GitHub 链接 + 文章页分享栏（复制链接/微博/X/微信二维码）。
> **约束**：纯静态无后端（点赞/收藏用 localStorage）；Chrome 152 已移除 XSLT；`SITE` 已为正式域名。
> **目标**：在不引入复杂后端的前提下，系统提升 SEO/分享、搜索、性能、可观测性与交互体验。
>
> 优先级：🔴 高（低风险高收益，建议优先）｜🟡 中｜🟢 低（按需/长期）。

---

## 一、SEO 与社交分享（🔴 高）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| 站点地图 | 接入 `@astrojs/sitemap`，自动生成 `sitemap.xml`（配置 `site` 即可） | 🔴 | 低 | 搜索引擎收录、提交 Search Console |
| OG/Twitter 卡片 | 每篇文章注入 `og:title/description/image/type`、`twitter:card` | 🔴 | 中 | 分享到微信/QQ/X 有富媒体预览 |
| JSON-LD 结构化数据 | 文章页注入 `Article`、站点注入 `WebSite`+`Breadcrumb` | 🔴 | 中 | 搜索结果富摘要（评分/作者/面包屑） |
| Canonical URL | 用 `Astro.url`/`SITE` 输出 `<link rel=canonical>` | 🔴 | 低 | 避免重复页权重分散 |
| robots.txt | 根目录放 `robots.txt` 指向 sitemap | 🔴 | 低 | 引导爬虫 |
| 自定义 404 | `src/pages/404.astro`，复用 BaseLayout 皮肤 | 🟡 | 低 | 访客体验 |

**落地建议**：sitemap + OG + canonical + robots 一起做，约半天，收益最高。

---

## 二、站内搜索（🔴 高）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| Pagefind 中文索引 | 构建期生成 `pagefind` 索引（支持中文分词/模糊），前端加搜索框 | 🔴 | 中 | 比前端即时检索更准更快，适合文章站 |
| 搜索快捷键 | 按 `/` 聚焦搜索框 | 🟡 | 低 | 效率 |
| 分类/标签过滤 | 搜索结果按标签聚合 | 🟢 | 中 | 精确 |

> 注：Pagefind 是静态站搜索首选，零后端、中文友好；Algolia DocSearch 需站点审核，备选。

---

## 三、性能与媒体（🟡 中高）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| 图片优化 | 用 Astro `<Image>` 自动转 WebP/AVIF + `loading=lazy` | 🟡 | 中 | 体积↓、LCP↑ |
| 字体子集化/预加载 | 仅打包用到的字形，`<link rel=preload>` | 🟡 | 低 | CLS↓、首屏↑ |
| 背景 canvas 自适应 | 低性能设备/弱网自动降粒子密度与 FPS | 🟡 | 中 | 移动端省电不掉帧 |
| CF 缓存/Brotli | 开启 Brotli、配置长期缓存头（`_headers`） | 🟡 | 低 | 传输↓ |
| 关键 CSS 内联 | 首屏 CSS 内联，非关键延后 | 🟢 | 中 | FCP↑ |

---

## 四、可观测与互动（🟡 中）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| Web Analytics | Cloudflare Web Analytics（隐私友好、免费、无需 KV） | 🟡 | 低 | 真实访客/来源/地区，比 KV 计数器更全 |
| 评论系统 | `giscus`（GitHub Discussions 后端，免服务器） | 🟡 | 中 | 文章互动、零运维 |
| 部署状态通知 | GitHub Actions / CF webhook → 飞书/钉钉/邮件 | 🟢 | 低 | 构建失败及时知 |
| 链接巡检 | CI 里跑死链检查（如 `astro` + `linkinator`） | 🟢 | 低 | 防止失效链接 |

> 注：你已绑 KV 计数器；Web Analytics 与 KV 计数器不冲突，可并存（Analytics 看趋势，计数器看页脚数字）。

---

## 五、交互与体验增强（🟡 中）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| 文章目录 TOC | 侧栏自动生成标题锚点，滚动高亮 | 🟡 | 中 | 长文导航 |
| 阅读进度条 | 顶部细进度条 | 🟡 | 低 | 沉浸感 |
| 移动端触控力场 | 当前力场基于 `pointermove`，补 `touch` 事件 | 🟡 | 中 | 手机端也能交互 |
| 回到顶部 | 右下角悬浮按钮 | 🟢 | 低 | 体验 |
| 配色工坊增强 | 随机配色 / 导入导出 / 更多预设 | 🟢 | 中 | 可玩性 |
| 草稿清单页 | `/drafts`（自己看，`draft:true` 聚合） | 🟢 | 低 | 写作管理 |
| 深浅色跟随系统 | 在皮肤之外加"自动（跟随系统）" | 🟢 | 低 | 省心 |

---

## 六、内容与运营（🟡 中低）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| 相关文章 | 按标签/分类推荐底部"相关阅读" | 🟡 | 中 | 停留时长↑ |
| 归档页 | 按年/月聚合 `/archive` | 🟢 | 低 | 内容总览 |
| 分类/标签页 | 自动生成分类与标签索引页 | 🟢 | 中 | SEO 内链 |
| RSS 增强 | 分类订阅源、全文/摘要开关 | 🟢 | 低 | 订阅体验 |

---

## 七、安全与合规（🟢 低）

| 方向 | 方案 | 优先级 | 工作量 | 预期收益 |
|---|---|---|---|---|
| CSP 响应头 | `astro.config` 或 CF `_headers` 加 `Content-Security-Policy` | 🟢 | 中 | 防 XSS |
| 隐私说明 | 用 Analytics/giscus 时加隐私/关于页 | 🟢 | 低 | 合规 |

---

## 推荐落地顺序

1. **第一批（🔴 高）**：`@astrojs/sitemap` + OG/Twitter 元信息 + canonical + `robots.txt` + 404 页 + 页脚 GitHub 链接 + 文章页分享栏 —— ✅ 已完成。
2. **第二批（🔴 高）**：Pagefind 站内搜索 + 搜索框 UI。
3. **第三批（🟡 中）**：Cloudflare Web Analytics + giscus 评论。
4. **第四批（🟡 中）**：性能（图片/字体/canvas 自适应）+ TOC/进度条/移动端触控。
5. **按需（🟢）**：配色工坊增强、归档/分类页、CSP、草稿页等。

> 每项都可独立提交、独立部署，不互相阻塞。需要落地时挑一项告诉我即可。
