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

// 4) 代码复制
document.querySelectorAll('pre.astro-code').forEach((pre) => {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.type = 'button';
  btn.textContent = '复制';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      btn.textContent = '已复制';
      setTimeout(() => (btn.textContent = '复制'), 1500);
    } catch (e) {}
  });
  pre.appendChild(btn);
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
