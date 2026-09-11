// ============================================================
// 基础交互（与规格书对齐，移除旧迭代的 3D 倾斜 / 磁吸吸附）
// 保留：滚动揭示、环境光晕(§二.4)、返回顶部、代码复制、目录高亮
// 收藏/点赞逻辑统一由 interactions.js 负责，避免重复监听互相抵消
// ============================================================

// 1) 滚动揭示
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

// 2) 环境光晕（规格书 §二.4：卡片 Hover 时径向渐变精准跟随鼠标）
document.querySelectorAll('.note-card').forEach((card) => {
  let raf = 0;
  card.addEventListener(
    'pointermove',
    (e) => {
      const r = card.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 100;
      const py = ((e.clientY - r.top) / r.height) * 100;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty('--mx', px.toFixed(1) + '%');
        card.style.setProperty('--my', py.toFixed(1) + '%');
      });
    },
    { passive: true }
  );
});

// 3) 返回顶部
const top = document.getElementById('to-top');
if (top) {
  window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 400), { passive: true });
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// 3.5) 阅读进度条
const rbar = document.getElementById('read-progress');
if (rbar) {
  const fill = rbar.firstElementChild;
  const upd = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const p = max > 0 ? Math.min(1, (window.scrollY || doc.scrollTop) / max) : 0;
    fill.style.transform = 'scaleX(' + p + ')';
  };
  window.addEventListener('scroll', upd, { passive: true });
  window.addEventListener('resize', upd, { passive: true });
  upd();
}

// 4) 代码块头部（语言标签 + 文件名标题）+ 复制
const LANG_NAMES = {
  js: 'JavaScript', javascript: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JSX',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', astro: 'Astro',
  json: 'JSON', jsonc: 'JSON', html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
  bash: 'Shell', sh: 'Shell', shell: 'Shell', zsh: 'Shell', powershell: 'PowerShell',
  md: 'Markdown', markdown: 'Markdown', mdx: 'MDX',
  py: 'Python', python: 'Python', go: 'Go', rust: 'Rust', java: 'Java',
  c: 'C', cpp: 'C++', csharp: 'C#', php: 'PHP', ruby: 'Ruby', swift: 'Swift',
  yml: 'YAML', yaml: 'YAML', toml: 'TOML', ini: 'INI', xml: 'XML', sql: 'SQL',
  diff: 'Diff', dockerfile: 'Dockerfile', makefile: 'Makefile', text: 'Text', txt: 'Text',
};
document.querySelectorAll('pre.astro-code').forEach((pre) => {
  // 语言：优先 rehype 插件写入的 data-language，回退 language-xxx class
  let lang = pre.getAttribute('data-language') || '';
  if (!lang) {
    const m = /language-([\w-]+)/.exec(pre.className || '');
    if (m) lang = m[1];
  }
  if (!lang) {
    const codeEl0 = pre.querySelector('code');
    const m2 = /language-([\w-]+)/.exec((codeEl0 && codeEl0.className) || '');
    if (m2) lang = m2[1];
  }
  const title = pre.getAttribute('data-title') || '';

  const head = document.createElement('div');
  head.className = 'code-head';
  const langEl = document.createElement('span');
  langEl.className = 'code-lang';
  const key = String(lang).toLowerCase();
  langEl.textContent = LANG_NAMES[key] || (lang ? String(lang).toUpperCase() : 'CODE');
  head.appendChild(langEl);

  if (title) {
    const tEl = document.createElement('span');
    tEl.className = 'code-title';
    tEl.textContent = title;
    head.appendChild(tEl);
  }

  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.type = 'button';
  btn.textContent = '复制';
  btn.setAttribute('aria-label', '复制代码');
  btn.addEventListener('click', async () => {
    try {
      // 只复制代码本身，排除块头的语言/文件名/按钮文案
      const codeEl = pre.querySelector('code');
      await navigator.clipboard.writeText((codeEl || pre).textContent);
      btn.textContent = '已复制';
      setTimeout(() => (btn.textContent = '复制'), 1500);
    } catch (e) {}
  });
  head.appendChild(btn);

  pre.insertBefore(head, pre.firstChild);
});

// 5) 目录滚动高亮
const tocLinks = Array.from(document.querySelectorAll('.toc a'));
if (tocLinks.length) {
  const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const ho = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          tocLinks.forEach((l) => l.classList.remove('active'));
          const a = map.get(e.target.id);
          if (a) a.classList.add('active');
        }
      });
    },
    { rootMargin: '-80px 0px -70% 0px' }
  );
  document.querySelectorAll('.content :is(h2, h3)').forEach((hd) => hd.id && ho.observe(hd));
}
