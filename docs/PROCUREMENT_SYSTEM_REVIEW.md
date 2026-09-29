# 采购执行中心整体设计评审

评审日期：2026-09-24  
代码基线：`3220d36`  
评审范围：全系统产品定位、业务模型、模块协作、交互与扩展机制。  
方法：核对根目录 AGENTS、前端架构、两份原始产品 DOCX、六项项目 UI Skill、现有源码，并检索 SAP、Microsoft Dynamics 365、Oracle Procurement 官方资料。本轮未运行页面或业务测试，代码问题为静态检查结论。

## 1 结论

现有项目具有可复用的前端骨架和采购执行场景原型，但尚不能作为完整产品业务设计直接交付开发。主要不足不是少几个字段或菜单，而是缺少贯穿各模块的数据口径、分配关系、生命周期和业务约束。

需要保留的方向：订单行驱动、合同可选、无物料号采购、服务验收独立于库存收货、退货与冲销分开、SAP 技术信息分层、统一 UI 和 API 封装。

需要调整的工作方法：先确定业务对象和状态，再设计跨单据规则，最后落到页面。页面的成功提示必须对应可查询的业务结果；配置的保存必须有真实生效范围；枚举里有某个场景不代表产品已经支持该场景。

建议产品方案见 [采购执行中心产品设计 V2 草案](PROCUREMENT_PRODUCT_DESIGN_V2_DRAFT.md)。这是待评审方案，不表示相关功能已经实现，也不自动替代已确定的项目约束。

## 2 官方资料与适用范围

以下资料用于识别成熟设计中的共同原则。各厂商术语、版本和部署模式不同，不将某一家实现当作所有企业的强制标准。后续方案中的默认规则均为本项目建议。

| 参考 | 经核对的设计要点 | 本项目采用的方向 |
| --- | --- | --- |
| [Microsoft 采购申请与需求合并](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-requisitions-overview) | 合并处理时允许调整；原申请保留历史 | 来源快照与下游商业条件分离 |
| [Oracle 采购单据构建](https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/how-you-use-document-builder-to-create-purchasing-documents.html) | 创建前可以查看并调整行合并结果 | 先预览拆合单，再生成订单草稿 |
| [Oracle 申请分组规则](https://docs.oracle.com/en/cloud/saas/procurement/26b/oapro/group-requisitions-options.html) | 单据、订单行、交付计划分别有分组条件 | 分组不能只比较物料名称 |
| [Microsoft 创建采购订单](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-order-creation) | 订单头与行分层，涉及供应商、价格、交期、交付地点等 | 计划只提供部分来源数据，需要订单编制环节 |
| [Microsoft 采购策略](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-policies) | 可按组织配置价格传递、拆单及重新审批规则 | 策略按组织、范围和版本管理 |
| [Microsoft 订单审批与确认](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/purchase-order-approval-confirmation) | 审批、供应商确认和变更有各自过程；自动审批取决于设置 | 避免“生成即默认审批通过”，也不强制所有企业人工审批 |
| [Oracle 变更单生命周期](https://docs.oracle.com/en/cloud/saas/procurement/26b/oaprc/Chunk880179533.html) | 变更对比、审批、实施与历史保留 | 已生效订单使用变更版本 |
| [Oracle 采购审批](https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/how-purchase-order-approval-is-processed.html) | 审批规则可结合单头、行、交付及分配信息 | 审批基于业务条件，不由页面按钮直接改状态 |
| [SAP 服务验收审批](https://help.sap.com/docs/SAP_S4HANA_CLOUD_PE/af9ef57f504840d2b81be8667206d485/ddb5845dfd6744ffbfada3470be8e36d.html?version=2023.latest) | Lean Services 的服务录入、审批和后续凭证分阶段；审批后可生成收货凭证 | 业务前台仍使用服务验收，后台凭证交给适配器 |
| [SAP 限额服务](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/e296651f454c4284ade361292c633d69/c1c30e1963ae45a08b0112c0e82d900d.html?version=2021.000) | 示例机制区分预计值预警与总限额控制 | 预计金额、执行上限分别建模；客户版本需实施时再核对 |
| [Microsoft 收货及更正](https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/product-receipt-against-purchase-orders) | 到货、质量流程、正式收货可分阶段；取消收货保留反向交易 | 区分物理到货、业务确认和 ERP 过账 |
| [Oracle 单据历史](https://docs.oracle.com/en/cloud/saas/procurement/25c/oaprc/document-history-for-purchasing-documents.html) | 历史记录操作人、动作、时间及变更审批 | 单据关系和操作审计分别呈现 |
| [SAP Fiori 对象页面](https://experience.sap.com/fiori-design-web/object-page/) 与 [草稿处理](https://experience.sap.com/fiori-design-web/draft-handling/) | 对象上下文、整体及字段错误、编辑中断恢复 | 复杂单据使用独立编辑页与持续可见的校验摘要 |

资料可见性说明：Microsoft 与 Oracle 的主要页面已读取正文；部分 SAP Help 与旧 Fiori 页面直接打开时未返回正文，相关要点依据官方域名搜索结果的正文摘录。没有据此确认客户具体 SAP 版本、配置或接口能力。

## 3 现状问题及证据

优先级含义：P0 为会影响业务含义或形成错误开发基线的问题；P1 为通用产品闭环所需能力；P2 为后续增强。这里的优先级用于原型设计整改，不表示已验证的生产事故。

| 编号 | 优先级 | 发现与业务影响 | 代码证据 |
| --- | --- | --- | --- |
| R01 | P0 | 数量和金额共用 `orderedValue/executedValue`。计划服务按“12 月”存入，履约表单却将 12 当作可验收金额；直接采购入口又转换为金额。同一场景随来源改变含义 | [类型](../src/domain/procurement/types.ts) 第 64–70 行；[Mock](../src/mocks/handlers/index.ts) 第 193、237 行；[服务 Schema](../src/domain/execution-rule/schemas.ts) |
| R02 | P0 | 计划转订单只收行 ID，剩余数量一次全部转完；不能填写本次数量、成交价或确认交付条件 | [计划 API](../src/features/procurement-planning/api/procurementPlanningApi.ts) `PlanOrderInput`；[Mock](../src/mocks/handlers/index.ts) 第 175–201 行 |
| R03 | P0 | 订单金额按计划全量乘预估单价；不保存生成行单价。对部分已转订单的计划，剩余采购量和订单金额会不匹配 | 同上第 186–201 行 |
| R04 | P0 | 需求合并时累加估算金额，却保留第一条预估单价；下游重新按该单价算金额。不同价格合并后口径不一致 | [Mock](../src/mocks/handlers/index.ts) 第 120–135 行 |
| R05 | P0 | 合并键只有对象类型、物料/文本、单位和工厂，未处理公司、规格、业务归属与需求日期差异；也没有可核对的合并预览 | [Mock](../src/mocks/handlers/index.ts) 第 120 行；[需求汇总](../src/features/procurement-planning/pages/DemandAggregationPage.tsx) |
| R06 | P0 | 仅存来源 ID 数组与累计数量，没有每个来源分配了多少；无法可靠表达拆单、分批、撤回、取消后的占用释放 | [类型](../src/domain/procurement/types.ts) `ProcurementPlanLine`；[Mock](../src/mocks/handlers/index.ts) 第 140、188 行 |
| R07 | P0 | 计划转订单直接标为 ACTIVE/APPROVED；直接订单提交为 ACTIVE/PENDING，缺少后续审批接口和工作流。两个入口审批语义不同 | [Mock](../src/mocks/handlers/index.ts) 第 194、202、239 行；[路由](../src/app/router.tsx) |
| R08 | P0 | 工作台执行按钮只判断余额，详情又使用另一套判断；草稿、待审批、关闭、ERP状态等没有统一执行资格规则 | [工作台](../src/features/fulfillment/pages/FulfillmentWorkbenchPage.tsx)；[订单详情](../src/features/purchase-order/pages/PurchaseOrderDetailPage.tsx) 第 31、53 行 |
| R09 | P0 | 收货、验收、退货、冲销接口不读取业务请求、不写执行记录和累计值，只返回单号与 PROCESSING。成功提示描述了实际未发生的业务变化 | [Mock](../src/mocks/handlers/index.ts) 第 298–301 行；[履约提交](../src/features/fulfillment/components/ExecutionDrawer.tsx) |
| R10 | P0 | 可退数量直接等于原收货量，历史已退写死为 0；已冲销收货也进入可处理列表。缺少按原单净额和待处理占用校验 | [退货](../src/features/return-reversal/components/PurchaseReturnDrawer.tsx) 第 15、27 行；[列表](../src/features/return-reversal/pages/ReturnReversalPage.tsx) 第 17 行 |
| R11 | P0 | 多处退货/冲销 PO 写死；原单状态固定显示“已正式过账”。无法支撑跨订单业务 | [退货与冲销模块](../src/features/return-reversal/) |
| R12 | P0 | SAP 重试只有提示；状态核对总返回同一成功凭证且不回写；对账处理只把界面记录标记完成 | [SAP监控](../src/features/sap-integration/pages/SapMonitorPage.tsx) 第 24、27 行；[对账](../src/features/sap-integration/pages/SapReconciliationPage.tsx) 第 24–63 行；[Mock](../src/mocks/handlers/index.ts) 第 302 行 |
| R13 | P0 | 场景、字段规则只保存在页面 state，保存按钮只提示；履约继续使用固定 Schema。无法验证配置真的生效 | [场景配置](../src/features/execution-config/pages/ExecutionConfigPage.tsx)；[字段配置](../src/features/execution-config/pages/DynamicFieldRulesPage.tsx)；[Schema](../src/domain/execution-rule/schemas.ts) |
| R14 | P1 | 一张订单只有一个来源枚举与来源单号，不能完整表达“需求经计划、引用合同、依据报价定价”同时成立 | [类型](../src/domain/procurement/types.ts) `PurchaseOrder` |
| R15 | P1 | 限额服务虽有样例额度，创建表单仍是数量×单价，未采集预计金额、总限额和有效期；服务单位编辑时硬编码为“月” | [订单编辑](../src/features/purchase-order/pages/PurchaseOrderEditorPage.tsx)；[订单 API](../src/features/purchase-order/api/purchaseOrderApi.ts) |
| R16 | P1 | 草稿和正式提交使用同一套完整必填校验；履约草稿只保存，未发现恢复入口；批准后的订单无变更版本 | [需求编辑](../src/features/procurement-planning/components/DemandEditorDrawer.tsx)；[订单编辑](../src/features/purchase-order/pages/PurchaseOrderEditorPage.tsx)；[草稿](../src/shared/utils/draft.ts) |
| R17 | P1 | 计划转订单抽屉通过截取列去掉价格、金额和交期，用户无法完成商务核对；订单明细也未展示行价税金额 | [计划详情](../src/features/procurement-planning/pages/ProcurementPlanDetailPage.tsx) 第 81–92 行；[订单详情](../src/features/purchase-order/pages/PurchaseOrderDetailPage.tsx) |
| R18 | P1 | 计划进度直接汇总不同单位数量后相除；吨、件、月不可相加，结果没有可解释的业务含义 | [计划列表](../src/features/procurement-planning/pages/ProcurementPlanListPage.tsx) 第 33 行 |
| R19 | P1 | 权限是固定集合，菜单、路由、审批、配置和技术数据未形成统一角色及组织范围控制 | [权限组件](../src/shared/components/PermissionGuard/PermissionGuard.tsx)；[Layout](../src/layouts/AppLayout/AppLayout.tsx)；[路由](../src/app/router.tsx) |
| R20 | P1 | 单据流仅显示履约事件时间线，没有需求/计划/订单行分配和变更关系；订单“履约记录”页签只是空提示 | [单据流](../src/shared/components/DocumentFlow/DocumentFlow.tsx)；[订单详情](../src/features/purchase-order/pages/PurchaseOrderDetailPage.tsx) |
| R21 | P1 | 未识别场景默认走普通收货；配置展示的“Material 存在”也不能准确区分无物料号、服务与扩展场景 | [Schema](../src/domain/execution-rule/schemas.ts) 第 81 行；[配置](../src/features/execution-config/pages/ExecutionConfigPage.tsx) 第 78 行 |
| R22 | P1 | Mock 分散维护订单数组与行数组；编辑订单只替换订单对象，工作台使用的行数组不随之更新；刷新还会重新加载初始数据 | [Mock](../src/mocks/handlers/index.ts) 第 248、268、279 行；[fixtures](../src/mocks/fixtures/purchaseOrders.ts) |
| R23 | P1 | 附件仅在浏览器选择文件，未建立附件 ID、存储和关联；Schema 的 min/max 多为控件属性，缺少完整跨字段与服务端校验 | [动态表单](../src/shared/components/DynamicForm/DynamicForm.tsx)；[Schema](../src/domain/execution-rule/schemas.ts) |
| R24 | P1 | 部分样例需求显示未纳入计划，但已存在引用该需求的计划；样例也需区分草稿拟分配、审批占用与已批准分配 | [采购计划样例](../src/mocks/fixtures/procurementPlanning.ts) `DEM-004` / `PLAN-002` |

另外，正式订单价格基准、税额、币种扩展、供应商主数据标识、付款条款、分批交付、关闭剩余量、服务验收撤销等没有形成一致设计。它们应先进入领域方案，再按版本实现，不能仅因为缺少菜单就全部新增页面。

## 4 为什么此前方式不足

1. 原始产品文档主要围绕订单执行。新增需求和计划后，没有重新审视来源分配、预算估算与交易价格的区别，直接把上下游接在一起。
2. 优先实现了页面、字段与成功反馈，未定义每个动作的前提、状态变化、数据回写、失败恢复和审计结果。
3. 领域层虽已有类型，但 `orderedValue` 等过度抽象掩盖了数量、金额、额度之间的差异。
4. 配置、Mock 和实际执行规则各自维护数据，形成多套行为来源。
5. 未区分产品稳定约束、企业可配置策略、行业扩展和演示数据，导致部分客户示例变成了默认业务。

这不是现有 UI 风格需要推翻，而是业务基础必须补齐。前端技术栈与成熟公共组件可以继续使用。

## 5 建议改造顺序

| 阶段 | 主要结果 | 可以判定完成的条件 |
| --- | --- | --- |
| D0 产品设计基线 | 确定对象、数据归属、数量金额口径、状态、策略边界、能力范围 | 同一个业务例子在所有模块含义一致；关键设计决策已明确 |
| D1 业务基础 | 统一计量与金额模型、来源分配、审批资格、单据版本、可执行资格、统一 Mock 数据存储 | 同一行从多个入口读到一致数据；无未审批直接执行路径 |
| D2 采购准备与订单 | 需求、汇总预览、计划、统一订单编制、分批下单、变更、来源追溯 | 可以从真实需求走到可执行订单，取消剩余量后上游正确释放 |
| D3 执行与反向业务 | 四类场景、占用与净履约、退货/冲销/退货冲销、服务更正、关闭剩余 | 操作后各页面结果一致，重复提交不重复消耗 |
| D4 集成与配置 | 可模拟失败和 UNKNOWN 的任务、核对证据、规则发布与生效 | 配置改变实际行为；核对不能无证据标成功 |
| D5 产品交付能力 | 角色模板、实施参数、样例数据包、初始化与升级说明、验收脚本 | 新企业采用参数和映射接入，不需要复制整套页面 |

D1 的资格控制必须先于 D2/D3；D2 也不能在审批、集成只是占位的情况下宣称闭环完成。阶段描述是依赖顺序，不承诺一次性实现所有可选能力。

## 6 本轮交付边界

本轮交付为整体设计评审与产品设计草案。未修改业务代码、未发布新功能、未执行业务点击测试。核心模型变化应依据配套草案作产品决策，再组织实施；此前发布的原型仍保持原状。
