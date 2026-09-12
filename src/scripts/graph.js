// 知识图谱：标签关系力导向图（自写模拟，零依赖、可完全离线运行）
// 节点 = 标签（半径∝出现频次），边 = 同篇共现（粗细∝共现次数）
export function initGraph() {
  const wrap = document.getElementById('graph');
  if (!wrap) return;
  const svg = wrap.querySelector('svg');
  const info = document.getElementById('graph-info');
  const resetBtn = document.getElementById('graph-reset');

  const NS = 'http://www.w3.org/2000/svg';
  let W = wrap.clientWidth || 800;
  let H = Math.max(360, Math.min(640, Math.round(W * 0.62)));

  let nodes = [];
  let edges = [];
  let adj = new Map();
  let raf = 0;
  const sim = { a: 0.02, rep: 1400, damp: 0.85, min: 0.4 };

  function resize() {
    W = wrap.clientWidth || W;
    H = Math.max(360, Math.min(640, Math.round(W * 0.62)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  function showInfo(text) {
    if (info) info.textContent = text;
  }

  function build(data) {
    nodes = data.nodes.map((n, i) => ({
      id: n.id,
      count: n.count,
      r: 6 + Math.sqrt(n.count) * 3.2,
      x: W / 2 + Math.cos((i / data.nodes.length) * Math.PI * 2) * 120 + (Math.random() - 0.5) * 40,
      y: H / 2 + Math.sin((i / data.nodes.length) * Math.PI * 2) * 120 + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    }));
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    edges = data.edges
      .filter(([a, b]) => idx.has(data.nodes[a].id) && idx.has(data.nodes[b].id))
      .map(([a, b, w]) => ({ a: idx.get(data.nodes[a].id), b: idx.get(data.nodes[b].id), w }));
    adj = new Map(nodes.map((n) => [n.id, new Set()]));
    edges.forEach((e) => {
      adj.get(nodes[e.a].id).add(nodes[e.b].id);
      adj.get(nodes[e.b].id).add(nodes[e.a].id);
    });
    render();
    showInfo(`${nodes.length} 个标签 · ${edges.length} 条关联 · 悬浮高亮邻居`);
    loop();
  }

  function render() {
    const lineEls = [];
    const nodeEls = [];
    edges.forEach((e, i) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('data-i', String(i));
      l.setAttribute('stroke', 'var(--border)');
      l.setAttribute('stroke-width', String(0.6 + e.w * 0.7));
      lineEls.push(l);
    });
    edges.forEach((e) => {
      const l = lineEls[edges.indexOf(e)];
      l.setAttribute('x1', String(nodes[e.a].x));
      l.setAttribute('y1', String(nodes[e.a].y));
      l.setAttribute('x2', String(nodes[e.b].x));
      l.setAttribute('y2', String(nodes[e.b].y));
    });
    nodes.forEach((n, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('data-i', String(i));
      g.style.cursor = 'pointer';
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', String(n.r));
      c.setAttribute('fill', 'color-mix(in srgb, var(--accent) 30%, var(--surface))');
      c.setAttribute('stroke', 'var(--accent)');
      c.setAttribute('stroke-width', '1.5');
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('y', String(n.r + 12));
      t.setAttribute('fill', 'var(--text)');
      t.setAttribute('font-size', String(Math.min(13, 9 + n.count)));
      t.textContent = n.id;
      g.appendChild(c);
      g.appendChild(t);
      g.addEventListener('mouseenter', () => focus(n.id));
      g.addEventListener('mouseleave', () => focus(null));
      g.addEventListener('click', () => (location.href = `/tags/${encodeURIComponent(n.id)}/`));
      nodeEls.push(g);
    });
    svg.innerHTML = '';
    lineEls.forEach((l) => svg.appendChild(l));
    nodeEls.forEach((g) => svg.appendChild(g));
  }

  function focus(id) {
    const groups = svg.querySelectorAll('g[data-i]');
    const lines = svg.querySelectorAll('line[data-i]');
    if (!id) {
      groups.forEach((g) => {
        g.style.opacity = '1';
        g.querySelector('circle').setAttribute('stroke', 'var(--accent)');
      });
      lines.forEach((l) => l.setAttribute('stroke', 'var(--border)'));
      showInfo(nodes.length + ' 个标签 · 拖动体验力导向');
      return;
    }
    const nb = adj.get(id) || new Set();
    groups.forEach((g) => {
      const n = nodes[+g.dataset.i];
      const on = n.id === id || nb.has(n.id);
      g.style.opacity = on ? '1' : '0.18';
      g.querySelector('circle').setAttribute('stroke', n.id === id ? 'var(--accent-2)' : 'var(--accent)');
    });
    lines.forEach((l) => {
      const e = edges[+l.dataset.i];
      const on = nodes[e.a].id === id || nodes[e.b].id === id;
      l.setAttribute('stroke', on ? 'var(--accent-2)' : 'var(--border)');
      l.setAttribute('opacity', on ? '0.9' : '0.08');
    });
    const n = nodes.find((x) => x.id === id);
    showInfo(`# ${id} · 出现 ${n.count} 次 · 关联 ${nb.size} 个标签`);
  }

  function step() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      let fx = (W / 2 - a.x) * sim.a;
      let fy = (H / 2 - a.y) * sim.a;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        let dx = a.x - b.x,
          dy = a.y - b.y;
        let d2 = dx * dx + dy * dy + 0.01;
        const f = sim.rep / d2;
        const d = Math.sqrt(d2);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }
      a.vx = (a.vx + fx) * sim.damp;
      a.vy = (a.vy + fy) * sim.damp;
    }
    edges.forEach((e) => {
      const a = nodes[e.a],
        b = nodes[e.b];
      let dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = (d - 90) * sim.a * (0.5 + e.w * 0.5);
      const ux = dx / d,
        uy = dy / d;
      a.vx += ux * f;
      a.vy += uy * f;
      b.vx -= ux * f;
      b.vy -= uy * f;
    });
    nodes.forEach((n) => {
      n.x += Math.max(-20, Math.min(20, n.vx));
      n.y += Math.max(-20, Math.min(20, n.vy));
      n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x));
      n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y));
    });
  }

  function loop() {
    step();
    render();
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    render();
  });
  if (resetBtn) resetBtn.addEventListener('click', () => focus(null));

  fetch('/tags-graph.json')
    .then((r) => r.json())
    .then(build)
    .catch(() => showInfo('图谱数据加载失败（构建后才会生成）。'));

  // 模拟运行 6 秒后自动停止，省电；悬浮时重启
  let stopAt = Date.now() + 6000;
  (function autoStop() {
    if (Date.now() > stopAt && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    setTimeout(autoStop, 500);
  })();
  wrap.addEventListener('mouseenter', () => {
    if (!raf) {
      stopAt = Date.now() + 6000;
      loop();
    }
  });
}
