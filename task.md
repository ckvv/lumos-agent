# Agent 项目设计与搭建

我想完成一个通用 agent 项目, 项目是基于 electron 的桌面端

- 代码风格: eslint + @antfu/eslint-config
- 语言: TypeScript
- 前端: Vite + Vue 3 + @vueuse/core + vue-router + Nuxt UI 3 + markstream-vue
- AI SDK: ai + @ai-sdk/mcp
- 前后端通信: [orpc](https://orpc.dev/) 框架
- 参数校验: [zod](https://zod.dev/) 框架
- 日志: [pino](https://github.com/pinojs/pino) 框架

## 功能

```
核心功能
├── 对话系统
│   ├── 会话 CRUD（创建/删除/重命名）
│   ├── 消息持久化
│   ├── 流式输出 + 停止生成
│   ├── 重新生成 / 消息编辑
│   └── 消息分支
│
├── Agent 循环
│   ├── 自主工具调用循环
│   ├── 最大迭代限制
│   ├── 中途取消
│   └── 执行状态实时展示
│
├── 上下文管理
│   ├── 添加文件到上下文
│   ├── System Prompt 自定义
│   ├── 用户指令（全局规则）
│   └── Token 计数 + 截断策略
│
├── 内置工具
│   ├── 创建文件 / 删除文件 / 修改文件
│   ├── 读取文件
│   ├── 列出目录
│   ├── 搜索文件 / 搜索内容
│   ├── 读取 URL 内容
│   ├── exec（Shell 命令）
│   └── 执行 Node 代码
│
├── 工具安全
│   ├── 危险操作审批确认(删除文件、exec)
│   └── 自动执行白名单(创建文件、修改文件、读取文件、列出目录、搜索文件、搜索内容、读取 URL 内容、执行 Node 代码)
│
├── 设置
│   ├── LLM 配置（Provider/Model/参数）
│   ├── MCP Server 管理
│   └── Skill 管理
│
└── UI/UX
    ├── 工具调用折叠展示 + 工具调用状态
    ├── 代码块高亮 + 复制
    ├── 思考过程展示
    └── 快捷键
```

## 规划阶段

- [ ] 设计项目架构与撰写实施方案
- [ ] 用户审批方案

## 执行阶段

- [ ] 初始化 monorepo 项目结构
- [ ] 搭建前端（Vue 3 + Vite + Nuxt UI 3）
- [ ] 搭建后端（Hono + Node.js）
- [ ] 实现核心数据模型与数据库层
- [ ] 实现后端 API 路由（对话、配置、LLM、MCP、Skill）
- [ ] 实现前端页面与组件
- [ ] 前后端联调

## 验证阶段

- [ ] 前后端启动验证
- [ ] 功能测试
