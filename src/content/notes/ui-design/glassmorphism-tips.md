---
title: 玻璃拟态 UI：好看但不翻车的 4 条军规
date: 2026-09-05
category: UI 设计
tags: [玻璃拟态, 动效, 可访问性]
summary: 毛玻璃卡片很炫，但对比度、层级、性能任意一项没管好就会翻车。几条实战经验。
featured: false
maturity: polished
---

# 玻璃拟态 UI：好看但不翻车的 4 条军规

毛玻璃（glassmorphism）是本站默认皮肤"星空"的基调，落地时有几条红线。

## 军规

- **对比度优先**：半透明背景上文字必须够清晰，否则再美也不可用
- **层级要少**：玻璃叠玻璃会糊，最多两层
- **动效克制**：hover 微光即可，别全屏乱闪
- **性能兜底**：`backdrop-filter` 贵，低端机提供纯色降级

## 代码片段

```css
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

做到这四点，炫酷和可读就能兼得。
