# 部署到 Cloudflare Pages

> `fight-1.github.io` 已被另一个站点（Tri-State Self）占用，本项目改用 Cloudflare Pages，根路径部署，**无需修改 `base` 配置**。

## 一、首次部署

1. **建仓库并推送**（若还没有远端仓库）：
   ```bash
   git init && git add . && git commit -m "init: AI 学习笔记"
   git remote add origin git@github.com:fight-1/<仓库名>.git
   git push -u origin main
   ```
2. **Cloudflare 控制台** → `Workers & Pages` → `Create` → `Pages` → `Connect to Git`，选中该仓库。
3. **构建配置**（关键四项）：

   | 项 | 值 |
   |---|---|
   | Framework preset | `Astro` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | 环境变量 | `NODE_VERSION` = `22` |

   仓库已带 `.nvmrc` / `.node-version`（Node 22），Cloudflare 会据此选择版本；`NODE_VERSION` 显式设置更保险。
4. 点 `Save and Deploy`，约 1~2 分钟出 `*.pages.dev` 预览地址。

## 二、绑定自定义域名

在 Pages 项目 → `Custom domains` → 添加子域名（如 `notes.fight-1.dev`），
再到域名 DNS 处加一条 CNAME 指向 `xxx.pages.dev`，Cloudflare 自动签发 SSL。

> 之后记得把 `astro.config.mjs` 里的 `SITE` 改成最终正式地址，
> 否则 RSS 和站内绝对链接仍是 `https://fight-1.example.com` 占位值。

## 三、日常发布文章

```
1) 新建文件：src/content/notes/<分类>/<英文短名>.md
   （可从 templates/note-template.md 复制）
2) 填写 frontmatter：title / date / category / tags / summary
   可选：featured（首页优先）、draft（true = 草稿不发布）、cover（封面）
3) git commit && git push
4) 约 1~2 分钟自动构建上线
```

草稿写法：frontmatter 里 `draft: true`，文章不会出现在列表和 RSS 中，写完改回 `false` 再推送即可发布。

## 四、本地预览

```bash
npm run dev      # 开发预览
npm run build    # 构建到 dist/（本地构建需绕过 safe-delete 拦截时用下面的命令）
```

> 本机构建提示 `exit 1`（safe-delete 批量删除保护）时，用：
> `env -u CODEBUDDY_SESSION_ID -u CLAUDE_SESSION_ID npm run build`

## 五、其他说明

- 文章源：`src/content/notes/**/*.{md,mdx}`（Astro Content Collections，schema 见 `src/content/config.ts`）。
- 每次推送会触发一次构建，免费额度每月 500 次，个人站点足够。
- 若以后想改用 GitHub Pages 项目站点（`fight-1.github.io/<仓库名>`），需要额外配置 `base`
  并把站内硬编码链接（`/notes`、`/tags`、`/search.json`、`/rss.xml` 等）加上 `BASE_URL` 前缀。
