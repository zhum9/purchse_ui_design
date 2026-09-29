# 前端与 KingbaseES 核心数据库映射

版本：核心版 V1.1 对照说明  
数据库基线：KingbaseES V8，Oracle 兼容模式  
DDL：[001_pur_core_schema.sql](../database/kingbase/001_pur_core_schema.sql)  
逻辑设计：[PROCUREMENT_CORE_DATABASE_DESIGN.md](PROCUREMENT_CORE_DATABASE_DESIGN.md)  
UI设计：[PROCUREMENT_CORE_UI_DESIGN.md](PROCUREMENT_CORE_UI_DESIGN.md)

## 1. 使用边界

当前前端是 React 原型，默认通过 MSW 和浏览器本机存储运行，没有生产后端、KingbaseES 连接、统一身份目录或真实 SAP Adapter。页面字段和命令按核心数据库逻辑设计组织；本机存储对象是演示适配模型，不能当作数据库实体，也不能把本地演示状态当成已写入正式库。

正式 API 中，数据库主键/逻辑关联 ID、NUMBER 数量和金额必须按数据库设计序列化为字符串。日期只传业务日期；审计时间采用约定的 UTC 时间。前端显示名称使用只读引用快照，服务端仍需校验引用对象、法人、版本及权限。任何表间关系都是应用层逻辑关联，DDL 不设置 FOREIGN KEY 或级联删除。

## 2. 核心前端模型映射

| 前端模型 / 页面 | KingbaseES 持久化模型 | 对照说明 |
| --- | --- | --- |
| `OrderDocument`、`OrderRevision`、`OrderDraft`；采购订单统一编制、版本审批、详情 | `pur_document`、`pur_document_revision`、`pur_document_line`、`pur_order_header`、`pur_order_line`、`pur_order_schedule`、`pur_order_distribution`、`pur_document_relation`、`pur_external_reference` | 当前新建订单版本使用字符串金额/数量和稳定行 ID；来源关系、正式版本与工作版本分开。生产适配需按 SQL 分拆头/行/安排/分配，不能把整个 `OrderDraft` JSON 塞进单表。编辑器当前只支持一条默认交付安排，不能代表数据库对分批交付的完整 UI 已完成。 |
| `ProcurementDemand`、`ProcurementDemandLine`；采购需求与需求池 | `pur_document`、`pur_document_revision`、`pur_document_line`、`pur_demand_header`、`pur_demand_line`、`pur_approval_instance`、`pur_approval_step` | 现有表单/列表是原型 DTO，尚未完全采用正式修订版本及审批实例协议；申请人、组织和建议供应商需映射为目录 ID 与名称快照。空预估价格必须保留为空，不能转成 0。 |
| `ProcurementPlan`、`ProcurementPlanLine`；采购计划及转单 | `pur_document`、`pur_document_revision`、`pur_document_line`、`pur_plan_header`、`pur_plan_line`、`pur_source_proposal`、`pur_source_allocation`、`pur_allocation_event`、`pur_allocation_trace` | 来源份额是可追溯的逐行关系。计划审批保留预占和确认分配两个阶段；计划转订单只能消费计划余额，不能再次消费需求余额。原型暂不自动合并不同规格、单位或日期的行。 |
| `AllocationEntry`；本地来源余额投影 | `pur_source_allocation`、`pur_allocation_event`、`pur_allocation_trace` | 本机 DTO 通过追加 reserve/commit/release 事件计算余额，生产端应按 SQL 的事件方向、来源目标、行版本和追溯分摊实现；不得直接以本机快照或需求/计划显示字段作为余额权威。 |
| `PurchaseOrderItem`、`ExecutionEvent`；履约工作台、收货/验收与退货冲销 | `pur_execution_header`、`pur_execution_line`、`pur_execution_event`、`pur_execution_hold`、`pur_execution_attribution`、`pur_order_schedule` | `ExecutionEvent` 是页面投影，不等于一张数据库表。执行占用、正式正反事件、来源归属分别落入对应表；负向履约必须指向直接原事件，并按 SAP 证据和业务影响条件确认生效。原型中的 `amount/quantity` 数值视图需由正式 API Adapter 转换为精确 decimal 字符串。 |
| 服务/限额表单 `ExecutionFormSchema`；动态字段 | `pur_rule_version`、`pur_rule_bundle`、`pur_sap_line_context` | 订单需固定引用规则 Bundle 版本，字段规则不能由浏览器临时覆盖。当前配置页尚未完成版本草稿、发布校验、内容哈希、作用范围和订单采用版本冻结；生产上线前应完成配置服务，不将浏览器 local state 作为规则源。 |
| 采购审批工作台的任务投影 | `pur_task`、`pur_approval_instance`、`pur_approval_step` | 目前“我的工作”由订单和样例状态派生，未实现真实待办持久化和 IAM 授权。不得将页面上的演示角色选择视为生产权限。 |
| 本机附件上传组件 | `pur_attachment`、`pur_attachment_link`、`pur_audit_event` | 当前二进制对象存入浏览器 IndexedDB，非数据库附件服务，非共享数据，也没有病毒扫描或正式访问控制。生产端需替换为授权附件服务并保留校验结果/审计关联。 |
| SAP 执行监控与业务对账 | `pur_integration_task`、`pur_integration_attempt`、`pur_integration_evidence`、`pur_external_document_link`、`pur_inbox_message`、`pur_command_dedup`、`pur_sap_line_context` | 当前记录来自内置演示 fixture 或浏览器本机业务事实；状态核对接口明确返回 UNKNOWN。没有真实 SAP 查询/发送证据前，不允许界面将状态改成成功或把失败重发显示为已完成。 |

## 3. 关键字段与业务规则对应

| 页面字段 / 规则 | 数据库字段与表 | 约束来源 |
| --- | --- | --- |
| PO 编号、订单来源、公司、供应商、采购组织/组、币种、付款/交货条款 | `pur_document`、`pur_order_header`、`pur_document_relation` | 目录 ID、展示快照和来源关系分开保存；公司、币种及供应商适用性由服务端校验。 |
| 行项目、执行场景、物料标识模式、数量/单位、计价方式、金额口径、税率与限额 | `pur_document_line`、`pur_order_line` | 不强制全局物料号；未知价格与未知税口径保留 NULL。限额的预估金额不代表限额本身，金额型与数量型余额不能混加。 |
| 约定交期、分批数量、工厂/地点、收货方 | `pur_order_schedule` | 订单行与交付安排分离。当前 UI 的单安排编辑能力是原型限制；投产需要交付安排列表、数量合计校验、编辑锁及对应 API。 |
| 建议供应商 | `pur_demand_line.suggested_supplier_id`（以及计划来源快照） | 非必填建议；后续生成计划/订单允许改选供应商，不自动构成强制来源关系。 |
| 原需求/计划/订单的转化、预占、承诺、释放 | `pur_source_proposal`、`pur_source_allocation`、`pur_allocation_event`、`pur_allocation_trace` | 每次命令内锁定来源并校验可用余额；提交预占、批准承诺、驳回/撤回释放。不得按前端聚合表格值直写余额。 |
| 服务期间与验收标准 | `pur_order_line.service_start/service_end/acceptance_criteria`；`pur_execution_line` | 服务验收数量和金额分别验证，服务期间必须位于订单约定区间。限额服务执行金额不能超过含税/未税口径换算后的有效上限。 |
| 退货、收货冲销、退货冲销、服务验收更正 | `pur_execution_event.original_event_id`、`event_type`、反向 delta、`effect_basis` | 保留原事件。只在依赖范围已知、原执行可反向且 SAP/本地效果依据满足时确认反向事件。采购退货与错误收货冲销分开。 |
| 提交幂等、并发版本、业务审计 | `pur_command_dedup`、各实体 `row_version`、`pur_audit_event` | 正式 API 应在同一 Kingbase 事务中持久化业务变更、来源分配和幂等结果；SAP 调用在事务外执行。浏览器 Web Locks/localStorage 不等于数据库事务。 |

## 4. 本机原型与正式 API 的边界

1. `src/domain/purchase-order/types.ts` 是新编订单的前端领域模型；保存前允许草稿空值，提交时由规则校验。适配层负责将其拆分到版本/头/行/交付安排/来源分配表。
2. `src/domain/procurement/types.ts` 主要承载旧样例和列表读模型。它含有数值型 `number` 和展示名称，不是 Kingbase 表结构；禁止将其直接用作金额写入 DTO。
3. `src/mocks/repository/store.ts` 将一份浏览器存储快照放在本机 `localStorage`，以 Web Locks 串行化同源写入；其范围仅覆盖当前浏览器原型，不提供跨用户并发、数据库隔离级别、审计不可抵赖、后端鉴权或数据备份。
4. SQL 中引用 IAM、审批策略和 SAP 主数据时，生产 Adapter 应访问企业权威服务并把稳定 ID 与必要名称快照写入业务记录。演示目录 ID 不可作为生产 ID 使用。
5. SQL 建表脚本是目标 schema 初始化基线，不因 UI 原型运行；其没有被应用自动执行，也没有连接用户 Kingbase 实例。物理外键数保持为 0。

## 5. 开发对照检查

新增或调整页面前，至少确认：页面提交的每个业务事实对应数据库实体/字段；草稿 NULL 与提交必填规则相符；字段类型和精度遵循数据库约定；跨行/跨表规则由服务端事务负责；规则版本、审批、事件和审计保持不可覆盖语义；样例或本机存储状态有明确标识。若页面字段找不到 SQL 归属，先修订领域设计，不要直接增加无来源的持久字段。
