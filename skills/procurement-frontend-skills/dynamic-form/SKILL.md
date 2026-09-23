# Skill: Dynamic Form

## 目标

为采购执行中心构建规则驱动的动态表单，使同一套前端能够支持不同 SAP PO 行场景，而不是复制多套硬编码表单。

## 字段状态模型

每个字段必须支持：

- HIDDEN：隐藏
- DISPLAY：只读显示
- OPTIONAL：可选
- REQUIRED：必填
- AUTO：自动带入/计算

条件状态额外支持：

- CONDITION_REQUIRED
- CONDITION_VISIBLE
- CONDITION_READONLY

## 规则类型

至少支持：

1. Visible Rule
2. Required Rule
3. Readonly Rule
4. Default Rule
5. Validation Rule
6. Calculation Rule
7. Mapping Rule

## 规则示例

### 批次

```text
IF batchManaged = true
THEN batch = REQUIRED
ELSE batch = HIDDEN or OPTIONAL
```

### 服务采购

```text
IF executionScenario = SERVICE
THEN serviceStartDate = REQUIRED
AND serviceEndDate = REQUIRED
AND storageLocation = HIDDEN
AND batch = HIDDEN
```

### 无物料号采购

```text
IF objectType = FREE_TEXT
THEN materialCode = HIDDEN
AND materialGroup = DISPLAY
AND shortText = DISPLAY
```

### 限额服务

```text
IF executionControlMode = LIMIT
THEN amount = REQUIRED
AND quantity = OPTIONAL
AND overallLimit = DISPLAY
AND remainingLimit = AUTO
```

## 表单架构建议

使用 schema-driven form。

推荐数据结构：

```ts
interface FieldRule {
  fieldCode: string;
  visible: boolean | RuleExpression;
  required: boolean | RuleExpression;
  readonly: boolean | RuleExpression;
  defaultValue?: unknown | RuleExpression;
  validation?: ValidationRule[];
}
```

不要在 JSX 中大量出现：

```ts
if (type === 'A') ...
else if (type === 'B') ...
```

业务差异优先进入配置层。

## 字段来源

字段来源统一标识：

- USER：用户输入
- SAP：SAP同步
- MASTER：主数据
- CALCULATED：系统计算
- DEFAULT：默认规则

SAP来源字段如果业务不允许修改，必须使用 DISPLAY/READONLY，不要伪装成可编辑输入框。

## 动态表单 UX

规则切换时：

- 隐藏字段不占空白
- 字段显隐变化要平滑，不造成页面大幅跳动
- 被隐藏字段如已填写，按业务规则决定是否清空；不能默认静默保留脏值
- 必填状态变化后立即刷新校验提示
- 自动计算字段明确使用只读视觉

## 错误提示

错误必须使用业务语言。

错误示例：

推荐：
> 本次收货后累计数量将超过订单允许的105吨。

不推荐：
> validation failed: qty overflow.

## 动态表单分组

字段根据语义分组：

- 订单上下文
- 本次执行
- 库存/交付信息
- 服务信息
- 业务归属
- 附件与说明
- SAP技术信息（折叠）

不要按数据库表字段顺序直接渲染表单。

## 计算字段

典型：

```text
剩余可收 = 订单可执行量 - 净执行量

净执行量 = 收货 - 收货冲销 - 采购退货 + 退货冲销

剩余额度 = Overall Limit - 累计执行金额
```

计算字段不能让用户直接修改。

## 高风险动作

以下表单提交必须二次确认或明确风险提示：

- 冲销
- 退货冲销
- 强制关闭
- 超容差执行
- SAP重复重试（状态未知时）

## 输出前检查

1. 是否存在硬编码场景分支？
2. 是否能支持无物料号？
3. 是否能支持服务/限额？
4. 隐藏字段是否留下空白？
5. SAP来源字段是否误做成可编辑？
6. 校验文案是否为业务语言？
