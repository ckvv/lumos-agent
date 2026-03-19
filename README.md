# lumos

一个使用 AI Coding 协作创建并持续迭代的 Electron 桌面应用项目，当前定位是本地优先的 AI Agent 聊天工作台。项目基于 Electron Forge、Vite、Vue 3 和 TypeScript 构建，围绕“本地账号 + 多模型提供商 + Agent 能力编排 + 桌面端持久化”展开。

## 当前功能

### 1. 本地认证与启动引导

- 支持本地注册、登录、登出
- 认证状态由主进程统一管理，渲染进程不直接接触 SQLite 和凭据存储
- 应用启动通过统一的 `app.getBootstrap()` 拉取数据库状态、认证状态、Provider 可用性、聊天摘要和推荐路由
- 路由按认证状态控制：
  - `/`：公开介绍页
  - `/auth`：登录 / 注册页
  - `/chat`：受保护的聊天工作区
  - `/chat/:id`：受保护的会话详情页

### 2. AI 聊天工作区

- 以聊天工作区为主界面，而不是模板式首页
- 支持新建会话、历史会话列表、会话切换和删除
- 支持流式响应，展示进行中的工具调用状态
- 会话消息持久化到 SQLite，保留原始消息、运行时快照和调用元数据
- 每个会话持久化独立运行时配置：
  - Provider
  - Model
  - System Prompt
  - Tool Policy
  - Enabled Capabilities
- 支持 `/skill-name` 形式的单次技能显式唤醒

### 3. 多提供商模型接入

- 内置 API Key Provider：
  - OpenAI
  - Anthropic
  - Google
- 支持 `@mariozechner/pi-ai/oauth` 暴露的 OAuth Provider
- 支持 OpenAI-compatible Provider：
  - 自定义 `baseUrl`
  - 自动请求 `${baseUrl}/models` 做模型发现
  - 发现失败时仍可手动维护模型列表
- Provider 可用性会汇总到应用启动态与聊天入口守卫中

### 4. Agent 能力编排

- 内置工具支持全局启停，当前已接入：
  - `read`
  - `grep`
  - `find`
  - `ls`
  - `edit`
  - `write`
  - `bash`
- 支持持久化管理 MCP Server：
  - 保存连接配置
  - 加密保存敏感信息
  - 记录最近一次检查结果和错误信息
  - 启用后对后续聊天请求全局生效
- 支持托管 Skills：
  - 从应用管理的技能目录发现技能
  - 支持启停和详情查看
  - 支持 `disable-model-invocation` 约束
- 聊天请求通过 `@mariozechner/pi-coding-agent` 的 `AgentSession` 执行，而不是只做单纯模型流式调用

### 5. 数据与桌面能力

- 主进程负责 SQLite 初始化、迁移执行和数据库访问
- 数据库当前覆盖：
  - 用户与会话
  - Provider 配置与模型
  - MCP Server
  - Conversations / Messages
  - Managed Skills
  - Built-in Tools
- 优先使用 Electron `safeStorage` 加密 Provider / MCP 敏感信息
- 通过 Preload + `contextBridge` 暴露受控桌面能力
- 通过 oRPC 在主进程与渲染进程之间传递类型安全的应用能力

### 6. 界面与基础体验

- Vue 3 Composition API + `<script setup lang="ts">`
- 使用 `@nuxt/ui` 构建桌面端 UI
- 支持中文 / 英文切换与持久化
- Electron 哈希路由，适配桌面分发场景
- GitHub Actions 支持多平台 Electron 打包

## 技术栈

- Electron Forge
- Vite
- Vue 3
- TypeScript
- @nuxt/ui
- Vue Router
- Vue I18n
- oRPC
- Drizzle ORM + SQLite
- `@mariozechner/pi-ai`
- `@mariozechner/pi-coding-agent`
- Tailwind CSS
- ESLint (`@antfu/eslint-config`)

## 环境要求

- Node.js 24+
- pnpm 10+

## 快速开始

```bash
pnpm install
pnpm start
```

常用命令：

```bash
pnpm start
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:delete
pnpm db:studio
pnpm package
pnpm make
```

脚本说明：

- `pnpm start`：启动 Electron Forge 开发环境
- `pnpm lint`：运行 ESLint 并自动修复可修复问题
- `pnpm typecheck`：运行 `vue-tsc` 类型检查
- `pnpm db:generate`：根据 Drizzle Schema 生成 SQLite migration
- `pnpm db:delete`：删除本地开发数据库
- `pnpm db:studio`：启动 Drizzle Studio
- `pnpm package`：构建应用但不生成安装包
- `pnpm make`：生成平台分发产物

## 目录结构

```text
src/
  main/                 Electron 主进程入口、生命周期、窗口与业务服务
  main/services/        认证、聊天、Provider、Agent 能力编排
  main/database/        SQLite、Drizzle Schema、迁移引导
  preload/              预加载桥接 API
  renderer/             Vue 渲染进程应用
  renderer/composables/chat/
                        聊天工作区状态与流式编排
  shared/               跨进程共享类型与协议
drizzle/                SQLite migration 文件
docs/                   贡献者与实现说明文档
```

## 相关文档

- [docs/auth.md](./docs/auth.md)：本地认证与统一启动引导
- [docs/chat-workspace.md](./docs/chat-workspace.md)：聊天工作区、路由与流式消息模型
- [docs/settings-capabilities.md](./docs/settings-capabilities.md)：Providers / MCP / Skills / Built-in Tools
- [docs/database.md](./docs/database.md)：SQLite、Drizzle 与当前表结构
- [docs/i18n.md](./docs/i18n.md)：国际化实现
- [docs/github-actions-packaging.md](./docs/github-actions-packaging.md)：GitHub Actions 打包流程

## 开发约定

- 优先使用 `pnpm`
- 渲染进程使用 Vue 3 Composition API 与 `<script setup lang="ts">`
- 桌面端能力通过 `preload` 暴露，不直接向页面开放 Node.js 能力
- 修改共享行为或公共能力时，同步更新 `docs/`
- 新增生产依赖前先确认

## 手动验证

当前仓库没有独立测试框架，建议至少手动验证以下内容：

1. 运行 `pnpm start`，确认应用能正常启动
2. 完成注册 / 登录，确认认证和路由守卫工作正常
3. 配置至少一个可用 Provider，确认可以进入聊天工作区
4. 验证会话创建、消息发送、历史记录和设置弹窗
5. 运行 `pnpm lint`
6. 运行 `pnpm typecheck`

## License

MIT
