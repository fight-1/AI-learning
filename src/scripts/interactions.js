// ============================================================
// 星际通讯 (Interstellar Comm) — 文档1 §四 / 规格书 §二.2
// 点赞 = 注入能量（反应堆→光束射向卡片→引力波光环变亮→碰撞反馈）
// 收藏 = 牵引光束（长按卡片拖入边缘"收藏空间站"）
// 评论 = 星际广播（抛物线气泡，见 notes 详情页）
// ============================================================
import Matter from 'matter-js';
import gsap from 'gsap';
import { onTick, reduceMotion, isTouch } from '../lib/universe.js';
import { blipThrottled, panFromX } from './audio.js';

const KEY_FAV = 'favs';
const KEY_LIKE = 'likes';

const getFavs = () => JSON.parse(localStorage.getItem(KEY_FAV) || '[]');
const setFavs = (a) => {
  localStorage.setItem(KEY_FAV, JSON.stringify(a));
  document.dispatchEvent(new CustomEvent('favs:changed'));
};
const getLikes = () => JSON.parse(localStorage.getItem(KEY_LIKE) || '[]');
const setLikes = (a) => {
  localStorage.setItem(KEY_LIKE, JSON.stringify(a));
  document.dispatchEvent(new CustomEvent('ach:like'));
};

/* ——— 建造收藏空间站（屏幕边缘拖放区） ——— */
let dock = null;
function ensureDock() {
  if (dock) return dock;
  dock = document.createElement('div');
  dock.className = 'fav-dock';
  dock.innerHTML = `<span style="font-size:20px">🛰</span><span class="dock-label">收藏空间站</span><span id="dock-count" style="font-size:11px;color:var(--accent-color)">${getFavs().length}</span>`;
  document.body.appendChild(dock);
  document.addEventListener('favs:changed', () => {
    const c = dock.querySelector('#dock-count');
    if (c) c.textContent = String(getFavs().length);
  });
  return dock;
}

/* ——— 点赞：注入能量 ——— */
function fireBeam(fromEl, toEl) {
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x1 = a.left + a.width / 2,
    y1 = a.top + a.height / 2;
  const x2 = b.left + b.width / 2,
    y2 = b.top + b.height / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const beam = document.createElement('div');
  beam.className = 'energy-beam fire';
  beam.style.left = x1 + 'px';
  beam.style.top = y1 + 'px';
  beam.style.width = len + 'px';
  beam.style.setProperty('--ang', ang + 'deg');
  document.body.appendChild(beam);
  setTimeout(() => beam.remove(), 600);

  // 冲击波环（在目标卡片中心扩散）
  const ring = document.createElement('div');
  ring.className = 'energy-shock';
  const r = Math.max(b.width, b.height);
  ring.style.left = x2 + 'px';
  ring.style.top = y2 + 'px';
  ring.style.width = r + 'px';
  ring.style.height = r + 'px';
  document.body.appendChild(ring);
  setTimeout(() => ring.remove(), 720);

  // 粒子爆发
  const N = 10;
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div');
    s.className = 'energy-spark';
    const a2 = (i / N) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 42 + Math.random() * 64;
    s.style.left = x2 + 'px';
    s.style.top = y2 + 'px';
    s.style.setProperty('--dx', Math.cos(a2) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(a2) * dist + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 620);
  }

  // 浮字 +1 能量
  const pop = document.createElement('div');
  pop.className = 'energy-pop';
  pop.textContent = '+1 能量';
  pop.style.left = x1 + 'px';
  pop.style.top = y1 - 14 + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 920);

  // 物理碰撞反馈（轻微震动）
  if (!reduceMotion) gsap.fromTo(toEl, { x: -4 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
}

export function initComm() {
  ensureDock();
  // 收藏按钮（点按即可收藏，兼容既有交互）
  document.addEventListener('click', (e) => {
    const fb = e.target.closest('[data-fav]');
    if (fb) {
      e.preventDefault();
      e.stopPropagation();
      const id = fb.dataset.fav;
      const cur = getFavs();
      const has = cur.includes(id);
      const next = has ? cur.filter((x) => x !== id) : [id, ...cur];
      setFavs(next);
      fb.textContent = has ? '☆ 收藏' : '★ 已收藏';
      fb.classList.toggle('on', !has);
      blipThrottled(has ? 380 : 720, panFromX(e.clientX));
      return;
    }
    // 点赞：注入能量
    const lb = e.target.closest('[data-like]');
    if (lb) {
      e.preventDefault();
      const id = lb.dataset.like;
      const cur = getLikes();
      const has = cur.includes(id);
      const next = has ? cur.filter((x) => x !== id) : [id, ...cur];
      setLikes(next);
      lb.classList.toggle('liked', !has);
      const card =
        lb.closest('.stage-card') || lb.closest('.note-card') || document.querySelector('.detail');
      if (card && !has) fireBeam(lb, card);
      blipThrottled(has ? 300 : 900, panFromX(e.clientX));
    }
  });

  // 同步收藏按钮初始态
  const syncFavBtns = () => {
    const favs = getFavs();
    document.querySelectorAll('[data-fav]').forEach((b) => {
      const on = favs.includes(b.dataset.fav);
      b.classList.toggle('on', on);
      if (!b.classList.contains('fav-inline')) b.textContent = on ? '★ 已收藏' : '☆ 收藏';
    });
  };
  syncFavBtns();
  document.addEventListener('favs:changed', syncFavBtns);

  // 同步点赞初始态
  const likes = getLikes();
  document.querySelectorAll('[data-like]').forEach((b) =>
    b.classList.toggle('liked', likes.includes(b.dataset.like))
  );

  if (isTouch || reduceMotion) return; // 移动端/无障碍：不做长按牵引

  /* ——— 牵引光束：长按卡片拖入收藏空间站 ——— */
  const { Engine, Bodies, Composite, Body } = Matter;
  let pressTimer = null;
  let tractor = null;
  let suppressClick = false;

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      const card = e.target.closest('.stage-card, .note-card');
      if (!card || e.target.closest('button, a')) return;
      const id = card.dataset.id;
      if (!id) return;
      const sx = e.clientX,
        sy = e.clientY;
      pressTimer = setTimeout(() => startTractor(card, id, sx, sy), 420);
      const cancel = () => {
        clearTimeout(pressTimer);
        pressTimer = null;
      };
      const moveCheck = (ev) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) cancel();
      };
      addEventListener('pointermove', moveCheck, { once: false });
      addEventListener(
        'pointerup',
        () => {
          cancel();
          removeEventListener('pointermove', moveCheck);
        },
        { once: true }
      );
    },
    true
  );

  function startTractor(card, id, sx, sy) {
    const r = card.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'fav-ghost tractor';
    ghost.innerHTML = `<b>${card.querySelector('h3, .note-title')?.textContent || '笔记'}</b><div style="font-size:11px;color:var(--muted)">牵引中…拖到右侧空间站</div>`;
    ghost.style.left = r.left + 'px';
    ghost.style.top = r.top + 'px';
    document.body.appendChild(ghost);
    card.style.opacity = '0.35';
    blipThrottled(520, panFromX(sx));

    const engine = Engine.create({ gravity: { x: 0, y: 0.9, scale: 0.0012 } });
    const body = Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, 200, 60, {
      restitution: 0.72, // 规格书：0.6–0.8
      friction: 0.05,
      frictionAir: 0.02,
    });
    Composite.add(engine.world, body);
    let last = { x: sx, y: sy, t: performance.now() };
    let vel = { x: 0, y: 0 };

    const onMove = (ev) => {
      const now = performance.now();
      const dt = Math.max(16, now - last.t);
      vel = { x: ((ev.clientX - last.x) / dt) * 16, y: ((ev.clientY - last.y) / dt) * 16 };
      last = { x: ev.clientX, y: ev.clientY, t: now };
      Body.setPosition(body, { x: ev.clientX, y: ev.clientY });
      sync();
      const d = ensureDock().getBoundingClientRect();
      const hot =
        ev.clientX > d.left - 30 && ev.clientX < d.right + 30 && ev.clientY > d.top && ev.clientY < d.bottom;
      ensureDock().classList.toggle('hot', hot);
    };
    const sync = () => {
      ghost.style.transform = `translate(${body.position.x - 100}px, ${body.position.y - 30}px)`;
    };
    addEventListener('pointermove', onMove);

    const finish = (success) => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      ensureDock().classList.remove('hot');
      if (success) {
        const cur = getFavs();
        if (!cur.includes(id)) setFavs([id, ...cur]);
        blipThrottled(1000, 0);
        gsap.to(ghost, {
          scale: 0.2,
          opacity: 0,
          duration: 0.35,
          onComplete: () => ghost.remove(),
        });
      } else {
        // 回弹归位
        gsap.to(ghost, {
          left: r.left,
          top: r.top,
          duration: 0.5,
          ease: 'back.out(1.4)',
          onComplete: () => ghost.remove(),
        });
      }
      card.style.opacity = '';
      if (tractor && tractor.unsub) tractor.unsub();
      tractor = null;
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 50);
    };

    function onUp() {
      // 松手：把指针瞬时速度赋予刚体 → 抛物线运动（规格书 §二.2）
      Body.setVelocity(body, { x: vel.x * 0.9, y: vel.y * 0.9 });
      let settled = 0;
      const unsub = onTick((dt) => {
        Engine.update(engine, dt * 1000);
        sync();
        const d = ensureDock().getBoundingClientRect();
        const inDock =
          body.position.x > d.left - 20 &&
          body.position.x < d.right + 20 &&
          body.position.y > d.top &&
          body.position.y < d.bottom;
        if (inDock) {
          finish(true);
          return;
        }
        // 越界回弹（反向力 + 震动）
        let bounced = false;
        if (body.position.x < 0 || body.position.x > innerWidth) {
          Body.setVelocity(body, { x: -body.velocity.x * 0.7, y: body.velocity.y });
          Body.setPosition(body, {
            x: Math.max(0, Math.min(innerWidth, body.position.x)),
            y: body.position.y,
          });
          bounced = true;
        }
        if (body.position.y > innerHeight) {
          Body.setVelocity(body, { x: body.velocity.x, y: -Math.abs(body.velocity.y) * 0.7 });
          Body.setPosition(body, { x: body.position.x, y: innerHeight });
          bounced = true;
        }
        if (bounced) {
          blipThrottled(240, panFromX(body.position.x));
          gsap.fromTo(ghost, { rotation: -6 }, { rotation: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
        }
        if (Math.hypot(body.velocity.x, body.velocity.y) < 0.6) {
          if (++settled > 20) finish(false);
        } else settled = 0;
      });
      tractor = { unsub };
    }
    addEventListener('pointerup', onUp, { once: true });
  }

  // 牵引结束后抑制误触发的卡片跳转
  document.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}
