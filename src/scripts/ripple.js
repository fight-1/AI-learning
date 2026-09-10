// 点击涟漪：在点击坐标生成扩散圆环，颜色取 --accent；像素皮肤用方块爆裂
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const skin = document.documentElement.getAttribute('data-skin') || 'cosmic';
    const pixelSkin = skin === 'cyber' || skin === 'cosmic';
    const r = document.createElement('span');
    r.className = 'ripple' + (pixelSkin ? ' pixel' : '');
    const size = pixelSkin ? 26 : 14;
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    r.style.width = size + 'px';
    r.style.height = size + 'px';
    const scale = Math.max(window.innerWidth, window.innerHeight) / (size / 2);
    r.style.setProperty('--rs', scale);
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
    setTimeout(() => r.remove(), 800);
  });
})();
