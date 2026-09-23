# 采购执行中心

面向采购、收货、仓储、服务验收与 SAP 接口运维人员的企业级采购履约前端。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认访问 `http://127.0.0.1:5173`。开发环境使用 MSW 提供具有真实采购语义的接口数据，不依赖后端服务。

## 质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 当前能力

- 采购履约工作台：按采购订单行混合展示库存物料、无物料号、服务和限额服务。
- 动态履约表单：Schema 统一控制字段显隐、只读、必填、默认值及执行上限。
- 采购订单：列表、详情、订单行、履约记录、单据流和 SAP 信息分层。
- 退货与冲销：从原收货记录发起，分别表达业务语义，冲销需要二次确认。
- SAP 集成：执行监控、友好错误摘要、技术详情、失败重试及 UNKNOWN 状态核对。
- 执行配置：场景识别、业务动作和动态字段规则的产品化配置界面。

## 工程结构

```text
src/
├─ app/              应用入口、路由、主题、QueryClient、全局 UI 状态
├─ layouts/          企业后台整体布局
├─ features/         按业务能力组织的页面、组件与 API
├─ domain/           不依赖 React 的采购领域模型和执行规则
├─ shared/           公共组件、API Client、格式化工具和样式
└─ mocks/            MSW handlers 与真实业务 fixtures
```

业务边界与 UI 规范以根目录 `AGENTS.md`、`docs/FRONTEND_ARCHITECTURE.md`、产品设计文档及 `skills/procurement-frontend-skills/` 为准。

## GitHub Pages 原型发布

项目通过 `.github/workflows/deploy-pages.yml` 自动发布。推送到 `main` 后，GitHub Actions 会构建静态资源并部署到 GitHub Pages；线上原型启用 MSW Mock，不依赖后端服务。

首次使用时需要在 GitHub 仓库完成一次设置：

1. 打开 `Settings → Pages`。
2. 将 `Build and deployment → Source` 设置为 `GitHub Actions`。
3. 在 Pages 设置中填写自有域名并启用 HTTPS。
4. 在域名 DNS 控制台按 GitHub 提示配置记录。

前端使用 Hash Router，因此 GitHub Pages 上直接刷新详情页不会返回 404。部署构建使用相对资源路径，可同时兼容仓库默认 Pages 地址和自有域名。
