# Procurement Execution Center - Frontend Architecture

> 文件路径建议：`docs/FRONTEND_ARCHITECTURE.md`  
> 适用项目：采购执行中心 Procurement Execution Center  
> 适用范围：PC 端企业级 Web 前端  
> 推荐技术栈：React + TypeScript + Ant Design

---

## 1. 文档目的

本文档用于统一采购执行中心前端工程架构，作为 Codex、开发人员和后续 AI 编码工具的长期开发基线。

本文档重点解决：

- 前端项目目录如何组织；
- 采购订单、采购履约、退货/冲销、SAP 集成等模块如何拆分；
- 动态表单如何实现；
- 复杂业务表格如何实现；
- API、状态、权限、路由、异常如何统一；
- SAP 技术信息与业务信息如何隔离；
- 如何避免页面复制、业务规则散落和组件失控；
- 如何保证后续新增采购场景时不推翻已有架构。

本文件与以下内容共同构成项目约束：

- 根目录 `AGENTS.md`
- `docs/PROCUREMENT_EXECUTION_DESIGN.md`
- `skills/enterprise-ui/SKILL.md`
- `skills/procurement-ui/SKILL.md`
- `skills/dynamic-form/SKILL.md`
- `skills/enterprise-table/SKILL.md`
- `skills/sap-integration-ui/SKILL.md`
- `skills/visual-quality/SKILL.md`

---

# 2. 架构原则

## 2.1 业务优先，不以 SAP 字段组织前端

前端首先表达采购业务：

- 采购订单；
- 采购订单行；
- 采购履约；
- 收货；
- 服务验收；
- 限额执行；
- 退货；
- 冲销；
- 执行状态；
- 单据流。

SAP 技术字段只作为集成信息存在，不应成为页面主体。

禁止以如下字段直接组织主要页面：

- BSART；
- PSTYP；
- KNTTP；
- MOVE_TYPE；
- SAP BAPI 名称；
- SAP 技术结构名。

---

## 2.2 订单行驱动

采购执行最小控制单元为：

`PO + PO Item`

同一张采购订单中允许存在不同执行场景。

前端所有履约操作必须基于订单行上下文进行，不允许简单按整张订单类型决定表单和动作。

---

## 2.3 动态规则优先，避免复制页面

库存物料、无物料号、服务、限额等场景共享统一的业务框架。

差异通过：

- 执行场景；
- 动态字段；
- 动态校验；
- 动态动作；
- 动态展示；

进行处理。

禁止每增加一种采购业务就复制一套完整页面。

---

## 2.4 Server State 与 UI State 分离

服务端业务数据与前端交互状态不得混杂。

推荐：

- TanStack Query：服务端数据、缓存、刷新、请求状态；
- Zustand：跨组件 UI 状态、工作台筛选上下文、临时交互状态；
- React local state：组件内部短生命周期状态；
- URL Search Params：可分享、可恢复的列表筛选条件。

不要把所有数据都放入全局 Store。

---

## 2.5 业务规则集中管理

禁止把核心业务规则散落在 JSX 中，例如：

```ts
if (type === 'SERVICE') {
  ...
}
```

在多个页面重复出现。

执行场景、字段规则、状态、动作能力必须集中建模。

---

# 3. 推荐技术栈

## 3.1 基础技术

- React
- TypeScript
- Vite
- React Router
- Ant Design
- TanStack Query
- Zustand
- dayjs

## 3.2 表格

默认使用：

- Ant Design Table

复杂场景再引入：

- TanStack Table

使用原则：

### Ant Design Table 适合

- 普通业务列表；
- 查询 + 分页；
- 固定列；
- 排序；
- 常规筛选；
- 操作列；
- 状态列。

### TanStack Table 适合

- 动态列；
- 大量列配置；
- 复杂分组；
- 多层表头；
- 用户自定义列；
- 高级聚合；
- 大数据虚拟化。

不要为了技术炫技在普通页面中强制使用 TanStack Table。

---

## 3.3 表单

基础表单：

- Ant Design Form

动态表单：

- 自研 Schema Renderer
- 基于 Ant Design Form 渲染

不要引入重量级低代码平台作为第一阶段核心依赖。

---

## 3.4 测试

推荐：

- Vitest
- React Testing Library
- Playwright

用于覆盖：

- 业务工具函数；
- 动态字段规则；
- 关键页面交互；
- 收货/退货/冲销核心链路。

---

## 3.5 Mock

推荐：

- MSW

第一阶段没有完整后端时，使用 Mock Service Worker 模拟真实 API。

禁止在页面组件内直接写大量硬编码 Mock 数据。

---

# 4. 推荐项目目录

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ router.tsx
│  ├─ providers.tsx
│  ├─ queryClient.ts
│  └─ theme.ts
│
├─ layouts/
│  ├─ AppLayout/
│  ├─ AuthLayout/
│  └─ ErrorLayout/
│
├─ features/
│  ├─ purchase-order/
│  ├─ fulfillment/
│  ├─ return-reversal/
│  ├─ contract/
│  ├─ sap-integration/
│  └─ execution-config/
│
├─ shared/
│  ├─ components/
│  ├─ hooks/
│  ├─ utils/
│  ├─ constants/
│  ├─ types/
│  ├─ api/
│  ├─ permissions/
│  └─ styles/
│
├─ domain/
│  ├─ purchase-order/
│  ├─ fulfillment/
│  ├─ execution-rule/
│  ├─ document-flow/
│  └─ sap/
│
├─ mocks/
│  ├─ handlers/
│  ├─ fixtures/
│  └─ browser.ts
│
└─ main.tsx
```

---

# 5. Feature 模块结构

以 `fulfillment` 为例：

```text
features/fulfillment/
├─ pages/
│  ├─ FulfillmentWorkbenchPage.tsx
│  ├─ ServiceAcceptancePage.tsx
│  └─ FulfillmentRecordPage.tsx
│
├─ components/
│  ├─ FulfillmentTable.tsx
│  ├─ FulfillmentSummary.tsx
│  ├─ FulfillmentDrawer.tsx
│  ├─ ScenarioBadge.tsx
│  └─ ExecutionProgress.tsx
│
├─ forms/
│  ├─ GoodsReceiptForm.tsx
│  ├─ ServiceAcceptanceForm.tsx
│  ├─ LimitServiceForm.tsx
│  └─ DynamicExecutionForm.tsx
│
├─ hooks/
│  ├─ useFulfillmentList.ts
│  ├─ useExecutionContext.ts
│  └─ useExecutionActions.ts
│
├─ api/
│  └─ fulfillmentApi.ts
│
├─ model/
│  ├─ types.ts
│  ├─ schema.ts
│  └─ selectors.ts
│
└─ index.ts
```

Feature 内部实现尽量自包含。

跨 Feature 复用的内容放：

- `shared/`
- `domain/`

不要直接跨 Feature 深层引用内部文件。

---

# 6. Domain 层

`domain/` 用于存放不依赖具体页面的核心业务模型。

例如：

```text
domain/
├─ purchase-order/
│  ├─ types.ts
│  ├─ status.ts
│  └─ calculations.ts
│
├─ fulfillment/
│  ├─ executionScenario.ts
│  ├─ executionEvent.ts
│  ├─ calculations.ts
│  └─ validations.ts
│
├─ execution-rule/
│  ├─ fieldRule.ts
│  ├─ ruleEngine.ts
│  └─ conditions.ts
│
└─ sap/
   ├─ sapStatus.ts
   ├─ sapDocument.ts
   └─ mapping.ts
```

Domain 层原则：

- 不依赖 React；
- 不依赖页面；
- 尽量是纯 TypeScript；
- 便于单元测试；
- 可被多个 Feature 复用。

---

# 7. 核心领域类型

## 7.1 ProcurementObjectType

```ts
export type ProcurementObjectType =
  | 'MATERIAL'
  | 'FREE_TEXT'
  | 'SERVICE'
  | 'LIMIT_SERVICE'
  | 'ASSET'
  | 'SUBCONTRACT'
  | 'CONSIGNMENT'
  | 'OTHER';
```

---

## 7.2 ExecutionScenario

```ts
export type ExecutionScenario =
  | 'MAT_STOCK'
  | 'MAT_CONSUME'
  | 'MAT_FREE'
  | 'SERVICE'
  | 'SERVICE_LIMIT'
  | 'ASSET'
  | 'SUBCONTRACT'
  | 'CONSIGNMENT'
  | 'RETURN_PO'
  | 'OTHER';
```

---

## 7.3 ExecutionControlMode

```ts
export type ExecutionControlMode =
  | 'QUANTITY'
  | 'AMOUNT'
  | 'QUANTITY_AMOUNT'
  | 'LIMIT'
  | 'MILESTONE';
```

---

## 7.4 SAP Sync Status

```ts
export type SapSyncStatus =
  | 'WAITING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'UNKNOWN';
```

`UNKNOWN` 必须被视为独立状态。

禁止将其直接当作失败自动重试。

---

# 8. 状态设计

不要使用一个 `status` 承担所有含义。

建议：

```ts
interface PurchaseOrderStatus {
  documentStatus: DocumentStatus;
  fulfillmentStatus: FulfillmentStatus;
  receiptStatus: ReceiptStatus;
  approvalStatus?: ApprovalStatus;
  sapSyncStatus: SapSyncStatus;
}
```

例如：

```ts
type FulfillmentStatus =
  | 'OPEN'
  | 'PARTIAL'
  | 'COMPLETE'
  | 'DELIVERY_COMPLETE'
  | 'BLOCKED'
  | 'CLOSED';
```

统一状态文字和颜色通过配置生成：

```ts
const fulfillmentStatusMeta = {
  OPEN: { label: '待执行', tone: 'default' },
  PARTIAL: { label: '部分执行', tone: 'processing' },
  COMPLETE: { label: '执行完成', tone: 'success' },
  BLOCKED: { label: '已暂停', tone: 'warning' },
  CLOSED: { label: '已关闭', tone: 'default' },
};
```

禁止页面自行定义不同颜色。

---

# 9. API 架构

统一放在：

```text
shared/api/
```

基础能力：

```text
shared/api/
├─ client.ts
├─ error.ts
├─ interceptors.ts
└─ types.ts
```

业务 API：

```text
features/purchase-order/api/purchaseOrderApi.ts
features/fulfillment/api/fulfillmentApi.ts
features/sap-integration/api/sapIntegrationApi.ts
```

---

## 9.1 页面禁止直接使用 fetch

禁止：

```ts
fetch('/api/xxx')
```

散落在页面中。

必须通过统一 API Client。

---

## 9.2 标准响应模型

建议：

```ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  traceId?: string;
}
```

分页：

```ts
interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

---

# 10. TanStack Query 使用规范

服务端数据统一使用 Query Key Factory。

例如：

```ts
export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (params: PurchaseOrderQuery) =>
    [...purchaseOrderKeys.all, 'list', params] as const,
  detail: (id: string) =>
    [...purchaseOrderKeys.all, 'detail', id] as const,
};
```

禁止在页面中随意拼 query key。

---

# 11. 状态管理

## 11.1 TanStack Query

适合：

- 订单列表；
- 订单详情；
- 履约记录；
- SAP日志；
- 配置数据。

---

## 11.2 Zustand

适合：

- 工作台当前选中上下文；
- 跨 Drawer 的 UI 状态；
- 用户自定义列；
- 临时页面设置；
- 全局非服务端 UI 状态。

不适合：

- 保存所有订单数据；
- 替代 Query Cache。

---

## 11.3 URL Search Params

列表页查询条件优先与 URL 同步：

```text
/purchase-orders?status=PARTIAL&supplier=xxx&page=1
```

优点：

- 页面刷新不丢筛选；
- 可复制链接；
- 浏览器前进后退有效。

---

# 12. 动态表单引擎

这是采购执行中心核心基础能力之一。

建议定义统一 Schema：

```ts
interface DynamicFieldSchema {
  key: string;
  label: string;
  component:
    | 'input'
    | 'number'
    | 'select'
    | 'date'
    | 'dateRange'
    | 'textarea'
    | 'upload'
    | 'radio'
    | 'custom';

  state:
    | 'HIDDEN'
    | 'DISPLAY'
    | 'OPTIONAL'
    | 'REQUIRED'
    | 'AUTO';

  source?: 'USER' | 'SAP' | 'MASTER' | 'CALCULATED';

  defaultValue?: unknown;

  rules?: FieldRule[];

  props?: Record<string, unknown>;
}
```

---

## 12.1 Rule

建议：

```ts
interface FieldRule {
  type:
    | 'VISIBLE'
    | 'REQUIRED'
    | 'READONLY'
    | 'DEFAULT'
    | 'VALIDATION'
    | 'CALCULATION';

  when?: RuleCondition;
  value?: unknown;
  message?: string;
}
```

---

## 12.2 Rule Condition

例如：

```ts
interface RuleCondition {
  field: string;
  operator:
    | 'EQ'
    | 'NE'
    | 'IN'
    | 'NOT_IN'
    | 'GT'
    | 'GTE'
    | 'LT'
    | 'LTE'
    | 'EXISTS';

  value?: unknown;
}
```

第一阶段不要急于设计过度复杂 DSL。

保持简单可维护。

---

# 13. 动态表单渲染流程

```text
采购订单行
    ↓
ExecutionScenario
    ↓
获取场景Schema
    ↓
加载订单上下文
    ↓
应用字段规则
    ↓
生成最终FieldSchema
    ↓
DynamicFormRenderer
    ↓
用户填写
    ↓
业务校验
    ↓
提交Execution Command
```

页面不应该知道 SAP 具体 Movement Type。

---

# 14. 四类核心场景 Schema

## 14.1 MAT_STOCK

主要字段：

- materialCode：DISPLAY
- materialName：DISPLAY
- materialGroup：DISPLAY
- quantity：REQUIRED
- postingDate：REQUIRED
- plant：DISPLAY / REQUIRED
- storageLocation：REQUIRED
- batch：CONDITIONAL
- supplierBatch：OPTIONAL
- manufactureDate：OPTIONAL
- expiryDate：OPTIONAL
- deliveryNote：OPTIONAL

---

## 14.2 MAT_FREE

主要字段：

- shortText：DISPLAY
- materialGroup：DISPLAY
- quantity：REQUIRED
- unit：DISPLAY / REQUIRED
- receiptDate：REQUIRED
- deliveryLocation：OPTIONAL
- acceptanceResult：OPTIONAL
- attachments：OPTIONAL

不显示：

- 物料号选择器；
- 批次；
- 序列号；

除非特定规则要求。

---

## 14.3 SERVICE

主要字段：

- serviceName：DISPLAY
- serviceStartDate：REQUIRED
- serviceEndDate：REQUIRED
- completedQuantity：OPTIONAL / REQUIRED
- confirmedAmount：REQUIRED
- acceptanceResult：REQUIRED
- completionDescription：REQUIRED
- acceptanceComment：OPTIONAL
- attachments：OPTIONAL / REQUIRED

隐藏：

- storageLocation
- batch

---

## 14.4 SERVICE_LIMIT

主要字段：

- expectedValue：DISPLAY
- overallLimit：DISPLAY
- executedAmount：DISPLAY
- remainingLimit：DISPLAY
- actualServiceContent：REQUIRED
- serviceDate：REQUIRED
- quantity：OPTIONAL
- unitPrice：OPTIONAL
- confirmedAmount：REQUIRED
- acceptanceResult：REQUIRED

---

# 15. 执行动作模型

按钮不要在页面中硬编码。

定义：

```ts
interface ExecutionAction {
  code: string;
  label: string;
  type:
    | 'PRIMARY'
    | 'DEFAULT'
    | 'WARNING'
    | 'DANGER';

  permission?: string;

  enabled: boolean;

  disabledReason?: string;
}
```

例如：

库存物料：

```text
GOODS_RECEIPT → 收货
```

服务：

```text
SERVICE_ACCEPTANCE → 服务验收
```

限额：

```text
LIMIT_CONFIRMATION → 执行确认
```

---

# 16. 收货、退货、冲销

必须统一基于执行事件模型。

推荐前端类型：

```ts
type ExecutionEventType =
  | 'GOODS_RECEIPT'
  | 'SERVICE_ACCEPTANCE'
  | 'AMOUNT_CONFIRMATION'
  | 'GR_REVERSAL'
  | 'PURCHASE_RETURN'
  | 'RETURN_REVERSAL'
  | 'DELIVERY_COMPLETE';
```

原业务记录不得直接删除。

---

# 17. 采购退货与冲销组件边界

## 17.1 PurchaseReturnDrawer

负责：

- 原采购订单；
- 原收货单；
- 可退数量；
- 本次退货数量；
- 退货原因；
- 批次；
- 附件；
- SAP提交状态。

---

## 17.2 ReceiptReversalDrawer

负责：

- 原收货信息；
- 原 SAP 凭证；
- 冲销原因；
- 冲销日期；
- 过账日期；
- 二次确认。

顶部必须显示：

> 冲销用于撤销错误收货，不等同于采购退货。

不要复用一套文案混淆业务。

---

# 18. 单据流

推荐统一组件：

```text
shared/components/DocumentFlow/
```

数据模型：

```ts
interface DocumentFlowNode {
  id: string;
  type:
    | 'CONTRACT'
    | 'PURCHASE_ORDER'
    | 'GOODS_RECEIPT'
    | 'SERVICE_ACCEPTANCE'
    | 'RETURN'
    | 'REVERSAL';

  documentNo: string;
  title: string;
  timestamp?: string;
  quantity?: number;
  amount?: number;
  status?: string;
  parentId?: string;
}
```

单据流组件只负责：

- 节点关系；
- 时间；
- 状态；
- 数量/金额；
- 点击跳转。

不要做成 BPMN 编辑器。

---

# 19. SAP 前端模型

前端分两层：

## 19.1 Business Model

业务使用：

- 采购订单；
- 行项目；
- 收货；
- 验收；
- 退货；
- 冲销；
- SAP状态。

## 19.2 SAP Technical Model

仅技术区域使用：

```ts
interface SapTechnicalInfo {
  sapPoNo?: string;
  sapPoItem?: string;
  documentType?: string;
  itemCategory?: string;
  accountAssignmentCategory?: string;
  materialDocumentNo?: string;
  materialDocumentYear?: string;
  serviceEntrySheetNo?: string;
  sapStatus?: SapSyncStatus;
  sapMessage?: string;
}
```

普通业务组件禁止直接依赖更多 SAP 内部字段。

---

# 20. SAP Adapter 在前端的边界

前端只面对业务 API，例如：

```text
POST /executions/goods-receipt
POST /executions/service-acceptance
POST /executions/{id}/reverse
POST /executions/{id}/return
```

不要让前端调用：

```text
/bapi/BAPI_GOODSMVT_CREATE
```

或直接传 SAP BAPI 结构。

前端提交的是业务 Command。

后端 / Integration Adapter 负责转换 SAP 请求。

---

# 21. 权限体系

前端权限至少分为四层：

## 21.1 Route Permission

是否允许访问页面。

## 21.2 Menu Permission

是否显示菜单。

## 21.3 Action Permission

例如：

- receipt:create
- service:accept
- return:create
- reversal:create
- sap:retry
- order:force-close

## 21.4 Data Scope

例如：

- 公司；
- 采购组织；
- 采购组；
- 工厂；
- 库存地点。

前端负责交互控制。

后端必须再次校验权限。

不要认为前端隐藏按钮等于安全。

---

# 22. Permission 组件

建议：

```tsx
<PermissionGuard permission="receipt:create">
  <Button>收货</Button>
</PermissionGuard>
```

或：

```ts
const { can } = usePermission();

if (can('reversal:create')) {
  ...
}
```

禁止大量：

```ts
if (user.role === 'admin')
```

散落页面。

---

# 23. 路由设计

推荐：

```text
/
├─ /purchase-orders
│  └─ /purchase-orders/:id
│
├─ /fulfillment
│  ├─ /fulfillment/workbench
│  ├─ /fulfillment/records
│  └─ /fulfillment/service/:id
│
├─ /returns
├─ /reversals
│
├─ /contracts
│
├─ /sap
│  ├─ /sap/sync-monitor
│  ├─ /sap/execution-log
│  └─ /sap/reconciliation
│
└─ /settings
   ├─ /settings/execution-scenarios
   ├─ /settings/field-rules
   └─ /settings/tolerance-rules
```

---

# 24. 页面布局

统一 Layout：

```text
Top Header
+
Left Navigation
+
Breadcrumb
+
Page Container
```

页面宽度：

- 主体自适应；
- 企业后台优先；
- 推荐适配 1366 / 1440 / 1920 宽度。

不要只针对 1920 设计。

---

# 25. Design Token

统一在：

```text
src/app/theme.ts
```

定义：

- 主色；
- 背景色；
- 卡片背景；
- Border；
- Radius；
- Shadow；
- Spacing；
- 字号；
- 状态色。

禁止业务页面自行发明颜色。

状态使用语义 Token：

```ts
success
processing
warning
error
neutral
```

而不是直接写：

```ts
'#52c41a'
```

---

# 26. 页面头部

建议统一：

```text
shared/components/PageHeader/
```

支持：

- title；
- description；
- breadcrumbs；
- primaryAction；
- secondaryActions；
- extra；
- status。

避免每个页面重新拼一套标题布局。

---

# 27. StatusTag

统一：

```text
shared/components/StatusTag/
```

输入：

```ts
<StatusTag
  domain="fulfillment"
  value="PARTIAL"
/>
```

组件自己决定：

- 文案；
- icon；
- tone。

禁止页面手工决定 Tag 颜色。

---

# 28. Money / Quantity 格式

统一工具：

```text
shared/utils/format.ts
```

例如：

```ts
formatMoney()
formatQuantity()
formatPercent()
formatDate()
formatDateTime()
```

数量必须考虑：

- 精度；
- 单位；
- 千分位。

金额必须考虑：

- 币种；
- 小数位；
- 千分位。

---

# 29. 表格规范

统一：

- 行高度；
- 操作列；
- 状态列；
- 空状态；
- loading；
- 横向滚动；
- tooltip；
- 数字右对齐。

金额、数量：

右对齐。

文本：

左对齐。

状态：

居中或左对齐，但全系统一致。

---

# 30. 表格操作列

不要堆大量按钮。

推荐：

主操作：

```text
收货
```

其他操作进入：

```text
更多
```

例如：

```text
查看详情
查看单据流
采购退货
冲销
SAP信息
```

高风险操作不要与主操作视觉层级相同。

---

# 31. 详情页

推荐统一使用：

```text
EntityHeader
+
SummaryMetrics
+
Tabs
```

采购订单详情 Tabs：

- 基本信息；
- 订单明细；
- 履约记录；
- 单据流；
- 合同；
- SAP信息。

---

# 32. Drawer 规范

适用于：

- 普通收货；
- 简单退货；
- 收货冲销。

建议宽度：

- 720px
- 800px
- 880px

根据字段数量选择。

顶部必须保留订单上下文。

底部固定操作区。

---

# 33. 独立页面规范

适用于：

- 服务验收；
- 多附件；
- 多明细；
- 多步骤；
- 复杂配置。

不要把所有复杂业务都塞进 Drawer。

---

# 34. 错误处理

统一错误类型：

```ts
type AppErrorType =
  | 'NETWORK'
  | 'BUSINESS'
  | 'PERMISSION'
  | 'VALIDATION'
  | 'SAP'
  | 'UNKNOWN';
```

业务错误：

页面友好提示。

技术错误：

写入日志或折叠详情。

SAP 报文：

不要直接用长 MessageBox 覆盖业务页面。

---

# 35. SAP Error 组件

建议：

```text
shared/components/SapErrorPanel/
```

展示：

- 业务错误摘要；
- SAP状态；
- SAP错误码；
- 业务处理建议；
- 技术详情展开。

例如：

```text
SAP过账失败

原因：
库存地点 1001 不允许该物料入库。

建议：
检查采购订单库存地点或联系SAP管理员。

[查看技术详情]
```

---

# 36. Loading / Empty / Error

所有主要页面必须支持：

- Loading；
- Empty；
- Error；
- No Permission；
- Partial Data。

建议统一组件：

```text
PageLoading
PageEmpty
PageError
PermissionDenied
```

禁止每个页面自行设计。

---

# 37. Mock 数据

目录：

```text
mocks/fixtures/
├─ purchaseOrders.ts
├─ fulfillment.ts
├─ serviceAcceptance.ts
├─ sapLogs.ts
└─ executionRules.ts
```

Mock 数据必须覆盖：

- 库存物料；
- 无物料号；
- 服务；
- 限额；
- 部分执行；
- 完成；
- SAP失败；
- UNKNOWN；
- 退货；
- 冲销。

---

# 38. 代码导入规则

推荐 Alias：

```text
@app/*
@features/*
@shared/*
@domain/*
@mocks/*
```

避免：

```ts
../../../../shared/components
```

---

# 39. Feature 边界

禁止：

```text
features/a/components/*
```

直接深层引用：

```text
features/b/components/*
```

跨模块需要复用时：

- 提升到 shared；
- 或通过 Feature 的 `index.ts` 导出稳定接口。

---

# 40. 禁止事项

禁止：

1. 页面直接调用 fetch；
2. JSX 内大量业务判断；
3. 一个 status 表示全部状态；
4. materialCode 全局必填；
5. 服务采购强制显示库存地点；
6. 退货与冲销共用同一业务语义；
7. SAP Movement Type 让业务用户手填；
8. 业务页面维护 GL 科目；
9. 大量复制表单；
10. 使用裸色值；
11. 大量 any；
12. 页面组件超过合理复杂度仍不拆分；
13. API 请求、数据转换、UI 混在同一个组件中。

---

# 41. 第一阶段开发建议

## Phase 0：基础骨架

完成：

- Vite + React + TypeScript；
- Router；
- Query；
- Theme；
- App Layout；
- Permission 基础；
- API Client；
- Mock；
- 公共状态组件。

---

## Phase 1：采购履约核心

完成：

- 采购履约工作台；
- 四种核心执行场景；
- Dynamic Form Renderer；
- 场景 Schema；
- 执行动作；
- 收货 Drawer；
- 服务验收页面。

---

## Phase 1.5：采购需求与采购计划

完成：

- 采购需求创建、维护、提交与审批；
- 已审批需求明细汇总；
- 需求明细合并或拆分形成采购计划；
- 采购计划列表、详情与审批；
- 按计划明细生成采购订单；
- 采购订单反向追溯采购计划和原始需求。

该扩展不改变“采购订单是采购执行主线”的原则。系统仍必须保留合同、寻源结果、直接采购和 SAP 下发等非计划来源。

---

## Phase 2：采购订单

完成：

- 采购订单列表；
- 采购订单详情；
- 订单行；
- 履约记录；
- 单据流；
- SAP信息；
- 直接采购订单创建与草稿维护；
- 由采购计划生成采购订单。

---

## Phase 3：退货与冲销

完成：

- 采购退货；
- 收货冲销；
- 退货冲销；
- 事件历史。

---

## Phase 4：SAP集成

完成：

- SAP执行日志；
- SAP同步监控；
- SAP状态核对；
- SAP对账；
- UNKNOWN处理。

---

## Phase 5：规则配置

完成：

- 执行场景配置；
- 场景识别规则；
- 动态字段；
- 校验规则；
- 容差规则。

---

# 42. Codex 开发要求

Codex 每次开始开发任务前：

1. 阅读根目录 `AGENTS.md`；
2. 阅读本文件；
3. 根据任务加载对应 Skill；
4. 检查现有模块；
5. 优先复用已有公共组件；
6. 不破坏现有业务模型；
7. 完成后执行自检。

---

# 43. 完成定义 Definition of Done

一个页面不是“能打开”就算完成。

至少满足：

- TypeScript 无明显错误；
- Build 通过；
- 页面布局符合 Skill；
- 状态统一；
- Loading 完整；
- Empty 完整；
- Error 完整；
- 权限处理完整；
- 表单校验完整；
- 长文本不破版；
- 表格不溢出；
- 关键业务规则未被绕过；
- SAP技术复杂度未暴露给业务用户；
- 危险操作有确认；
- 无明显重复组件；
- 可继续扩展其他采购场景。

---

# 44. 最终目标

前端架构最终必须支持：

```text
一个统一采购履约工作台
        ↓
订单行驱动
        ↓
执行场景
        ↓
动态Schema
        ↓
动态表单
        ↓
统一执行事件
        ↓
SAP业务接口
```

后续新增采购场景时，目标应优先做到：

> 新增配置 + 新增少量 Schema / Rule

而不是：

> 再复制一套完整页面。

这也是本项目能否真正形成通用采购执行产品的核心判断标准。
