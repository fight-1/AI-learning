// 知识图谱：标签关系力导向图（自写模拟，零依赖、可完全离线运行）
// 节点 = 标签（半径∝出现频次），边 = 同篇共现（粗细∝共现次数）
export function initGraph() {
  const wrap = document.getElementById('graph');
  if (!wrap) return;
  const svg = wrap.querySelector('svg');
  const info = document.getElementById('graph-info');
  const resetBtn = document.getElementById('graph-reset');

  const NS = 'http://www.w3.org/2000/svg';
  let W = (wrap.getBoundingClientRect().width || wrap.clientWidth) || 800;
  let H = Math.max(360, Math.min(640, Math.round(W * 0.62)));

  let nodes = [];
  let edges = [];
  let adj = new Map();
  let comps = [];
  let raf = 0;
  let ticks = 0;
  // 力导向参数（2026-09-12 调优，连通分量布局）：
  //  - 不依赖单一全局中心力（会让互不相连的分量要么塌中心、要么钉边界，无稳定中间态）
  //  - 改为「每个连通分量放到画布椭圆均布的初始槽位，节点用 homeK 弹力回归本分量中心」
  //  - k 为斥力系数（防重叠），link/ideal 为分量内弹簧（让三角紧凑）
  const sim = { k: 0.4, homeK: 0.02, damp: 0.9, link: 0.05, ideal: 60, spread: 0.32 };

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width || W;
    H = Math.max(360, Math.min(640, Math.round(W * 0.62)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (comps.length) computeHomes();
  }

  function showInfo(text) {
    if (info) info.textContent = text;
  }

  function build(data) {
    const count = data.nodes.length || 1;
    const rawNodes = data.nodes.map((n) => ({ id: n.id, count: n.count || 1 }));
    // 连通分量（并查集）：互不相连的分量要分到不同槽位，避免挤成一团
    const parent = rawNodes.map((_, i) => i);
    const find = (x) => {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    };
    data.edges.forEach(([a, b]) => {
      const ia = data.nodes[a] ? find(a) : -1;
      const ib = data.nodes[b] ? find(b) : -1;
      if (ia >= 0 && ib >= 0 && ia !== ib) parent[ia] = ib;
    });
    const compMap = new Map();
    rawNodes.forEach((_, i) => {
      const r = find(i);
      if (!compMap.has(r)) compMap.set(r, []);
      compMap.get(r).push(i);
    });
    comps = Array.from(compMap.values());

    nodes = rawNodes.map((n, i) => ({
      id: n.id,
      count: n.count,
      r: 7 + Math.sqrt(n.count) * 3.4,
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0,
      hx: W / 2,
      hy: H / 2,
    }));
    computeHomes();

    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    edges = data.edges
      .filter(([a, b]) => idx.has(data.nodes[a].id) && idx.has(data.nodes[b].id))
      .map(([a, b, w]) => ({ a: idx.get(data.nodes[a].id), b: idx.get(data.nodes[b].id), w }));
    adj = new Map(nodes.map((n) => [n.id, new Set()]));
    edges.forEach((e) => {
      adj.get(nodes[e.a].id).add(nodes[e.b].id);
      adj.get(nodes[e.b].id).add(nodes[e.a].id);
    });
    ticks = 0;
    render();
    showInfo(`${nodes.length} 个标签 · ${edges.length} 条关联 · 悬浮高亮邻居`);
    loop();
  }

  // 每个连通分量放到画布椭圆上均布的初始槽位；分量内节点绕自身槽位小环排布
  function computeHomes() {
    const n = comps.length;
    comps.forEach((c, ci) => {
      const ang = (ci / n) * Math.PI * 2 - Math.PI / 2;
      const cx = W / 2 + Math.cos(ang) * W * sim.spread;
      const cy = H / 2 + Math.sin(ang) * H * sim.spread * 0.92;
      c.forEach((gi, li) => {
        const la = (li / c.length) * Math.PI * 2;
        const lr = c.length > 1 ? 30 + c.length * 4 : 0;
        const node = nodes[gi];
        node.hx = cx + Math.cos(la) * lr;
        node.hy = cy + Math.sin(la) * lr;
        if (ticks === 0) {
          node.x = node.hx + (Math.random() - 0.5) * 10;
          node.y = node.hy + (Math.random() - 0.5) * 10;
        }
      });
    });
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
      g.setAttribute('transform', `translate(${n.x.toFixed(2)}, ${n.y.toFixed(2)})`);
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
    const pad = 46;
    // 斥力随画布面积/节点数自适应，保证不同屏宽下填充率一致、只防重叠
    const rep = sim.k * ((W * H) / Math.max(1, nodes.length));

    // 每个节点回归本连通分量的中心槽位（替代全局中心力，避免塌中心/钉边界）
    nodes.forEach((n) => {
      n.fx = (n.hx - n.x) * sim.homeK;
      n.fy = (n.hy - n.y) * sim.homeK;
    });

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.001) { d2 = 0.001; dx = 0.7; dy = 0.7; }
        const d = Math.sqrt(d2);
        const minD = a.r + b.r + 12;
        const rp = rep * (1 + (a.count + b.count) * 0.05);
        const f = (d < minD ? rp * 2.5 : rp) / d2;
        const ux = dx / d;
        const uy = dy / d;
        a.fx += ux * f;
        a.fy += uy * f;
        b.fx -= ux * f;
        b.fy -= uy * f;
      }
    }

    edges.forEach((e) => {
      const a = nodes[e.a];
      const b = nodes[e.b];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const ideal = sim.ideal + a.r + b.r + e.w * 16;
      const f = (d - ideal) * sim.link * (0.45 + e.w * 0.55);
      const ux = dx / d;
      const uy = dy / d;
      a.fx += ux * f;
      a.fy += uy * f;
      b.fx -= ux * f;
      b.fy -= uy * f;
    });

    nodes.forEach((n) => {
      n.vx = (n.vx + n.fx) * sim.damp;
      n.vy = (n.vy + n.fy) * sim.damp;
      const speed = Math.hypot(n.vx, n.vy);
      const limit = ticks < 160 ? 12 : 6;
      const s = speed > limit ? limit / speed : 1;
      n.x += n.vx * s;
      n.y += n.vy * s;
      // 软边界：贴边时施加反向力，避免标签超出画布
      if (n.x < pad + n.r) n.vx += (pad + n.r - n.x) * 0.05;
      if (n.x > W - pad - n.r) n.vx -= (n.x - (W - pad - n.r)) * 0.05;
      if (n.y < pad + n.r) n.vy += (pad + n.r - n.y) * 0.05;
      if (n.y > H - pad - n.r) n.vy -= (n.y - (H - pad - n.r)) * 0.05;
      n.x = Math.max(pad, Math.min(W - pad, n.x));
      n.y = Math.max(pad, Math.min(H - pad, n.y));
    });

    ticks++;
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

  // 模拟运行 8 秒后自动停止，省电；悬浮时重启
  let stopAt = Date.now() + 8000;
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
      stopAt = Date.now() + 8000;
      loop();
    }
  });
}
