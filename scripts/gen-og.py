#!/usr/bin/env python3
"""为每篇文章生成 1200x630 的 OG 分享图（PNG），输出到 public/og/。

设计取舍：
- 站点是纯静态 + Cloudflare Pages 构建。引入 @vercel/og / satori 之类的
  构建期依赖会增加构建失败风险（还需要打包中文字体），因此改为「本地一次性生成、
  把 PNG 当静态资源提交」：零构建期依赖、零部署风险，图片内容依然来自
  各篇文章的 frontmatter（标题/分类/日期），是真正的按文章定制。

用法（本地，需要 Pillow）：
    pip install Pillow
    python scripts/gen-og.py

新增文章后重新运行本脚本即可生成/更新对应封面图；脚本可重复执行（幂等）。
未生成图片的页面会自动回退到 /og-default.svg，不会出错。
"""

import os
import re
import glob
from datetime import datetime

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("需要 Pillow：pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_DIR = os.path.join(ROOT, "src", "content", "notes")
OUT_DIR = os.path.join(ROOT, "public", "og")

W, H = 1200, 630
BG_TOP = (7, 10, 22)      # #070a16
BG_BOTTOM = (13, 20, 36)  # #0d1424
ACCENT = (94, 234, 212)   # #5eead4
ACCENT2 = (139, 92, 246)  # #8b5cf6
TEXT = (233, 238, 245)
MUTED = (138, 150, 168)

FONT_REGULAR = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"


def load_font(path, size):
    for p in (path, r"C:\Windows\Fonts\simhei.ttf", r"C:\Windows\Fonts\msyh.ttc"):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def parse_frontmatter(path):
    """极简 frontmatter 解析，只取需要的四个字段，避免引入 PyYAML 依赖。"""
    data = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            head = f.read(4000)
    except OSError:
        return data
    m = re.search(r"^---\s*\n(.*?)\n---\s*\n", head, re.S)
    if not m:
        return data
    body = m.group(1)
    for key in ("title", "date", "category", "summary"):
        km = re.search(rf'^{key}:\s*(.+?)\s*$', body, re.M)
        if km:
            val = km.group(1).strip().strip('"').strip("'")
            data[key] = val
    return data


def wrap_text(draw, text, font, max_width):
    """按像素宽度折行：中文逐字断行，英文按单词断行，兼顾两者混排。"""
    lines, cur = [], ""
    # 先把连续英文/数字视为一个不可断单位，中文逐字
    tokens = re.findall(r"[A-Za-z0-9_.\-+#/]+|\s+|[^\sA-Za-z0-9]", text)
    for tok in tokens:
        if tok.isspace():
            tok = " "
        trial = cur + tok
        if draw.textlength(trial, font=font) <= max_width or not cur:
            cur = trial
        else:
            lines.append(cur.rstrip())
            cur = tok.lstrip() if tok != " " else ""
    if cur.strip():
        lines.append(cur.rstrip())
    return lines


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (1, size[1]))
    d = ImageDraw.Draw(img)
    for y in range(size[1]):
        r = int(top[0] + (bottom[0] - top[0]) * y / max(1, size[1] - 1))
        g = int(top[1] + (bottom[1] - top[1]) * y / max(1, size[1] - 1))
        b = int(top[2] + (bottom[2] - top[2]) * y / max(1, size[1] - 1))
        d.point((0, y), fill=(r, g, b))
    return img.resize(size)


def add_glow(img, color, radius=520, alpha=46):
    """在右上/左下方叠加一层柔和光晕，呼应站点背景的辉光质感。"""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = img.width - 120, -60
    gd.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (alpha,))
    for i in range(radius, 0, -12):  # 简单羽化
        a = int(alpha * (1 - i / radius) * 0.5)
        gd.ellipse([cx - i, cy - i, cx + i, cy + i], fill=color + (a,))
    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")


def render(meta, out_path):
    img = vertical_gradient((W, H), BG_TOP, BG_BOTTOM)
    img = add_glow(img, ACCENT2)

    # 顶部渐变条
    bar = Image.new("RGB", (W, 8))
    bd = ImageDraw.Draw(bar)
    for x in range(W):
        t = x / max(1, W - 1)
        bd.point((x, 0), fill=tuple(int(ACCENT[i] + (ACCENT2[i] - ACCENT[i]) * t) for i in range(3)))
        bd.point((x, 1), fill=tuple(int(ACCENT[i] + (ACCENT2[i] - ACCENT[i]) * t) for i in range(3)))
    for y in range(2, 8):
        bd.line([(0, y), (W, y)], fill=tuple(int(c * (1 - (y - 2) / 6)) for c in ACCENT))
    img.paste(bar, (0, 0))

    d = ImageDraw.Draw(img)
    pad = 88

    # 分类标签
    cat = meta.get("category") or "笔记"
    f_cat = load_font(FONT_REGULAR, 30)
    chip_h = 52
    chip_w = int(d.textlength(cat, font=f_cat)) + 44
    d.rounded_rectangle([pad, 92, pad + chip_w, 92 + chip_h], radius=26, outline=ACCENT, width=2)
    d.text((pad + 22, 92 + 9), cat, font=f_cat, fill=ACCENT)

    # 标题（最多 3 行，超出省略）
    f_title = load_font(FONT_BOLD, 62)
    title = meta.get("title") or "未命名"
    lines = wrap_text(d, title, f_title, W - pad * 2)
    if len(lines) > 3:
        lines = lines[:3]
        lines[2] = lines[2].rstrip()[: len(lines[2]) - 1] + "…"
    y = 200
    for ln in lines:
        d.text((pad, y), ln, font=f_title, fill=TEXT)
        y += 86

    # 摘要（一行，超出截断）
    summary = (meta.get("summary") or "").strip()
    if summary:
        f_sum = load_font(FONT_REGULAR, 28)
        sm = wrap_text(d, summary, f_sum, W - pad * 2)
        d.text((pad, y + 16), sm[0], font=f_sum, fill=MUTED)

    # 底部：站点名 + 日期
    f_foot = load_font(FONT_REGULAR, 28)
    d.text((pad, H - 92), "fight-1 的 AI 学习笔记", font=f_foot, fill=ACCENT)
    date = (meta.get("date") or "")[:10]
    if date:
        dw = d.textlength(date, font=f_foot)
        d.text((W - pad - dw, H - 92), date, font=f_foot, fill=MUTED)

    img.save(out_path, "PNG", optimize=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(glob.glob(os.path.join(NOTES_DIR, "**", "*.md"), recursive=True))
    made = 0
    for fp in files:
        meta = parse_frontmatter(fp)
        if not meta.get("title"):
            continue
        if str(meta.get("draft", "false")).lower() == "true":
            continue
        rel = os.path.relpath(fp, NOTES_DIR).replace("\\", "/")
        slug = rel[:-3] if rel.endswith(".md") else rel           # agent/xxx
        name = slug.replace("/", "-") + ".png"                    # agent-xxx.png
        out = os.path.join(OUT_DIR, name)
        render(meta, out)
        made += 1
        print("生成 OG:", name, "←", meta.get("title"))
    print(f"完成：{made} 张 → public/og/")


if __name__ == "__main__":
    main()
