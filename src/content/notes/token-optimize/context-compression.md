---
title: Token 优化：上下文压缩的 5 个抓手
date: 2026-09-06
category: Token 优化
tags: [上下文, 成本, 缓存]
summary: 省钱省延迟的本质是"少往上下文里塞废话"。从检索、摘要、缓存到批处理，逐层瘦身。
featured: false
maturity: draft
---

# Token 优化：上下文压缩的 5 个抓手

Token 直接决定成本与延迟。优化不是玄学，是工程。

## 五个抓手

1. **检索而非全量**：RAG 只取相关片段，别把整本书塞进 prompt
2. **对话摘要**：长对话定期压缩成要点，保留语义丢掉废话
3. **Prompt 缓存**：不变的系统提示走缓存，命中不重复计费
4. **结构化输出**：用 JSON Schema 约束，减少冗余自然语言
5. **批处理**：同类小请求合并，摊薄固定开销

## 一个缓存示意

```python
resp = client.chat(
    model='xx',
    messages=[{'role': 'system', 'content': SYS}],  # 走 cache
    # 仅 user 内容变化
)
```

> 先量再优化：用 tokenizer 估算各环节占比，优先砍最大的那块。
