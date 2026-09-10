---
title: 自建一个 MCP Server：把本地能力喂给大模型
date: 2026-09-07
category: MCP
tags: [连接器, 工具, 协议]
summary: MCP 用一套标准协议把"工具/资源"暴露给任意支持它的客户端，本文用最小例子讲清 Server 怎么写。
featured: true
---

# 自建一个 MCP Server

MCP（Model Context Protocol）把"模型能调用什么"标准化了：你写一个 Server，暴露 **tools / resources / prompts**，客户端（Claude、Cursor、自研 Agent）就能即插即用地用。

## 一个工具的骨架

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'get_weather',
    description: '查询某城市天气',
    inputSchema: { type: 'object', properties: { city: { type: 'string' } } },
  }],
}));
```

## 关键认知

- **传输层**：stdio（本地）或 SSE/HTTP（远程）
- **职责分离**：Server 只管"能力"，权限与编排交给客户端
- **复用**：写好一次，所有兼容客户端都能用，不用为每个模型重写适配

和 [多智能体](../agent/multi-agent-orchestration) 搭配，Agent 就能真正"动手"了。
