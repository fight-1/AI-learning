/* 配色工坊：预设（色相映射 + 明暗自适应亮度） + 色轮自定义
 * 调用点：导航战甲面板（SkinSwitcher.astro）、舰长控制台（pages/console.astro）
 * 状态：localStorage `palette`(预设 id) + `palette_custom`({accent,accent2,glow})
 * 优先级：自定义 > 预设 > 皮肤自带
 *
 * 设计要点：预设只存「色相 H + 饱和度 S」，亮度 L 由 data-theme 自适应
 * （dark 用亮色突出、light 用暗色保证对比度），因此同一预设在任意皮肤、
 * 任意明暗下都保持协调与可读——避免出现「紫色 accent 压在米色宣纸上」
 * 这类跨色温打架的问题。
 */

const root = document.documentElement;
const LS_PRESET = 'palette';
const LS_CUSTOM = 'palette_custom';

/* 各皮肤自带主色（仅作兜底）。必须与 styles/global.css 的 --accent 一致；
 * 正常路径走 computed 读真实值（见 currentColors），避免两处漂移。 */
const SKIN_ACCENT = {
  cosmic: { dark: '#5eead4', light: '#0d9488' },
  ink: { dark: '#b23b2e', light: '#b23b2e' },
  cyber: { dark: '#38bdf8', light: '#0284c7' },
  xianxia: { dark: '#7c3aed', light: '#7c3aed' },
  minimal: { dark: '#3b82f6', light: '#2563eb' },
};

export const PRESETS = [
  { id: 'default', name: '跟随皮肤', h: null },
  { id: 'forest', name: '森林', h: 152, s: 0.6 },
  { id: 'ocean', name: '海洋', h: 197, s: 0.72 },
  { id: 'amber', name: '琥珀', h: 30, s: 0.82 },
  { id: 'crimson', name: '绛红', h: 348, s: 0.66 },
  { id: 'violet', name: '紫罗兰', h: 268, s: 0.66 },
];

/* ---------- 颜色工具 ---------- */
function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return { r: 94, g: 234, b: 212 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s, l };
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return (
    '#' +
    rgb
      .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

function glowOf(hex, alpha = 0.22) {
  const { h, s, l } = hexToHsl(hex);
  return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${alpha})`;
}

/* 副色：同族 +30° 色相偏移，与主题反向微调亮度，保证主副可区分 */
function deriveAccent2(hex, theme) {
  const { h, s } = hexToHsl(hex);
  const l = theme === 'light' ? 0.42 : 0.72;
  return hslToHex(h + 30, clamp(s * 0.95, 0.2, 0.9), l);
}

/* ---------- 应用 ---------- */
function write({ accent, accent2, glow }) {
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-2', accent2);
  root.style.setProperty('--glow', glow);
}

function clear() {
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-2');
  root.style.removeProperty('--glow');
}

export function currentSkin() {
  return root.getAttribute('data-skin') || 'cosmic';
}
export function currentTheme() {
  return root.getAttribute('data-theme') || 'dark';
}

export function skinAccent(skin = currentSkin(), theme = currentTheme()) {
  const t = SKIN_ACCENT[skin] || SKIN_ACCENT.cosmic;
  return t[theme] || t.dark;
}

/* 当前生效的三色（用于回填色轮与 hex 文案） */
export function currentColors() {
  const custom = readCustom();
  if (custom) return custom;
  let preset = null;
  try {
    preset = localStorage.getItem(LS_PRESET);
  } catch (e) {}
  if (preset && preset !== 'default' && preset !== 'custom') {
    const p = PRESETS.find((x) => x.id === preset);
    if (p && p.h != null) return presetToColors(p);
  }
  // 「跟随皮肤」：直接读 computed 真实值——此时没有内联覆盖，读到的是
  // 皮肤 CSS 定义的原色（含皮肤自带的 accent-2，如玄幻的紫金配）。
  const cs = getComputedStyle(root);
  const accent = cs.getPropertyValue('--accent').trim() || skinAccent();
  const accent2 = cs.getPropertyValue('--accent-2').trim() || deriveAccent2(accent, currentTheme());
  const glow = cs.getPropertyValue('--glow').trim() || glowOf(accent);
  return { accent, accent2, glow };
}

function presetToColors(p) {
  const theme = currentTheme();
  // dark：亮而通透；light：压暗保证在浅底上的对比度
  const l = theme === 'light' ? 0.4 : 0.62;
  const accent = hslToHex(p.h, p.s, l);
  return {
    accent,
    accent2: hslToHex(p.h + 30, clamp(p.s * 0.95, 0.2, 0.9), theme === 'light' ? 0.46 : 0.72),
    glow: `hsla(${p.h}, ${Math.round(p.s * 100)}%, ${Math.round(l * 100)}%, 0.22)`,
  };
}

function readCustom() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.accent) return o;
  } catch (e) {}
  return null;
}

export function applyPreset(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
  try {
    localStorage.setItem(LS_PRESET, p.id);
    localStorage.removeItem(LS_CUSTOM);
  } catch (e) {}
  if (p.h == null) clear();
  else write(presetToColors(p));
  syncUI();
}

export function applyCustom(accent) {
  const theme = currentTheme();
  const c = {
    accent,
    accent2: deriveAccent2(accent, theme),
    glow: glowOf(accent),
  };
  write(c);
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(c));
    localStorage.setItem(LS_PRESET, 'custom');
  } catch (e) {}
  syncUI();
}

export function resetToSkin() {
  try {
    localStorage.setItem(LS_PRESET, 'default');
    localStorage.removeItem(LS_CUSTOM);
  } catch (e) {}
  clear();
  syncUI();
}

/* ---------- 随机 / 导出 / 导入 ---------- */
/* 随机协调配色：随机色相 + 协调饱和度，副色 +30°，辉光取主色，
 * 亮度随明暗自适应，保证任意皮肤/明暗下都协调可读。 */
export function randomPalette() {
  const h = Math.floor(Math.random() * 360);
  const s = 0.55 + Math.random() * 0.3; // 0.55~0.85
  const theme = currentTheme();
  const l = theme === 'light' ? 0.42 : 0.64;
  const c = {
    accent: hslToHex(h, s, l),
    accent2: hslToHex(h + 30, clamp(s * 0.95, 0.2, 0.9), theme === 'light' ? 0.46 : 0.72),
    glow: `hsla(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, 0.22)`,
  };
  write(c);
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(c));
    localStorage.setItem(LS_PRESET, 'custom');
  } catch (e) {}
  syncUI();
  return c;
}

/* 导出当前配色为 JSON 字符串（含预设来源，便于分享/备份） */
export function exportPalette() {
  const preset = (() => {
    try {
      return localStorage.getItem(LS_PRESET);
    } catch (e) {
      return 'default';
    }
  })();
  const c = currentColors();
  return JSON.stringify({ preset, custom: c }, null, 2);
}

/* 导入配色 JSON：接受 {custom:{accent,accent2,glow}} 或裸 {accent,accent2,glow}。
 * 返回是否成功。 */
export function importPalette(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch (e) {
    return false;
  }
  const c = o && o.custom ? o.custom : o;
  if (!c || !c.accent) return false;
  const col = {
    accent: c.accent,
    accent2: c.accent2 || deriveAccent2(c.accent, currentTheme()),
    glow: c.glow || glowOf(c.accent),
  };
  write(col);
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(col));
    localStorage.setItem(LS_PRESET, 'custom');
  } catch (e) {}
  syncUI();
  return true;
}

/* ---------- UI 同步（两处面板共用同一套 data 属性） ---------- */
export function syncUI() {
  const preset = (() => {
    try {
      return localStorage.getItem(LS_PRESET) || 'default';
    } catch (e) {
      return 'default';
    }
  })();
  const c = currentColors();

  document.querySelectorAll('[data-pal-set]').forEach((b) => {
    b.classList.toggle('is-active', b.getAttribute('data-pal-set') === preset);
  });
  document.querySelectorAll('[data-pal-color]').forEach((inp) => {
    const key = inp.getAttribute('data-pal-color'); // accent | accent2 | glow
    const v = key === 'glow' ? c.glow : c[key];
    if (inp.type === 'color' && v) inp.value = toHexInput(v);
  });
  document.querySelectorAll('[data-pal-hex]').forEach((el) => {
    const key = el.getAttribute('data-pal-hex');
    const v = key === 'glow' ? c.glow : c[key];
    if (v) el.textContent = key === 'glow' ? v.replace(/^hsla?\(/, 'hsla(').slice(0, 28) : v.toUpperCase();
  });
  document.querySelectorAll('[data-pal-reset]').forEach((b) => {
    b.disabled = preset === 'default';
  });
}

function toHexInput(v) {
  if (/^#/.test(v)) return v.length === 4 ? '#' + v.slice(1).split('').map((x) => x + x).join('') : v.slice(0, 7);
  // hsla(...) → hex
  const m = v.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (m) return hslToHex(parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
  return '#5eead4';
}

/* ---------- 初始化：绑定两处面板 + 恢复存档 ---------- */
let inited = false;
export function initPalette() {
  // 恢复存档（无存档则保持皮肤自带）
  const custom = readCustom();
  if (custom) write(custom);
  else {
    const preset = (() => {
      try {
        return localStorage.getItem(LS_PRESET);
      } catch (e) {
        return null;
      }
    })();
    if (preset && preset !== 'default') {
      const p = PRESETS.find((x) => x.id === preset);
      if (p && p.h != null) write(presetToColors(p));
    }
  }
  syncUI();

  if (inited) return;
  inited = true;

  // 预设按钮：事件委托——面板可能是后续插入的
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-pal-set]');
    if (!b) return;
    e.stopPropagation();
    applyPreset(b.getAttribute('data-pal-set'));
  });

  // 色轮：input 实时预览，change 落盘
  document.addEventListener('input', (e) => {
    const inp = e.target;
    if (!inp.getAttribute || inp.getAttribute('data-pal-color') !== 'accent') return;
    const hex = inp.value;
    const c = {
      accent: hex,
      accent2: deriveAccent2(hex, currentTheme()),
      glow: glowOf(hex),
    };
    write(c); // 拖动中只写样式，不落盘
    document.querySelectorAll('[data-pal-color="accent2"]').forEach((i2) => {
      if (i2 !== inp) i2.value = c.accent2;
    });
    document.querySelectorAll('[data-pal-hex="accent"]').forEach((el) => {
      el.textContent = hex.toUpperCase();
    });
  });
  document.addEventListener('change', (e) => {
    const inp = e.target;
    if (!inp.getAttribute) return;
    const key = inp.getAttribute('data-pal-color');
    if (!key) return;
    if (key === 'accent') applyCustom(inp.value);
    else {
      // 副色/辉光单独微调
      const c = currentColors();
      c[key] = key === 'glow' ? glowOf(inp.value) : inp.value;
      write(c);
      try {
        localStorage.setItem(LS_CUSTOM, JSON.stringify(c));
        localStorage.setItem(LS_PRESET, 'custom');
      } catch (err) {}
      syncUI();
    }
  });

  // 「跟随皮肤」复位
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-pal-reset]');
    if (!b) return;
    e.stopPropagation();
    resetToSkin();
  });

  // 随机配色
  document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest('[data-pal-random]'))) return;
    e.stopPropagation();
    randomPalette();
  });

  // 导出配色（下载 JSON）
  document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest('[data-pal-export]'))) return;
    e.stopPropagation();
    const blob = new Blob([exportPalette()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // 导入配色（选 JSON 文件）
  document.addEventListener('click', (e) => {
    if (!(e.target.closest && e.target.closest('[data-pal-import]'))) return;
    e.stopPropagation();
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.style.display = 'none';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        importPalette(String(r.result));
      };
      r.readAsText(f);
      inp.remove();
    };
    document.body.appendChild(inp);
    inp.click();
    inp.remove();
  });

  // 明暗切换后，预设亮度需重新自适应
  new MutationObserver(() => {
    const preset = (() => {
      try {
        return localStorage.getItem(LS_PRESET);
      } catch (e) {
        return 'default';
      }
    })();
    if (preset && preset !== 'default' && preset !== 'custom') {
      const p = PRESETS.find((x) => x.id === preset);
      if (p && p.h != null) write(presetToColors(p));
      syncUI();
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}
