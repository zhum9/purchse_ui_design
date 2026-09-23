# Procurement Execution Center - Agent Instructions

开发本项目的前端、原型或 UI 时，必须先读取并遵守以下项目 Skills：

1. `enterprise-ui/SKILL.md`
2. `procurement-ui/SKILL.md`
3. `dynamic-form/SKILL.md`
4. `enterprise-table/SKILL.md`
5. `sap-integration-ui/SKILL.md`
6. `visual-quality/SKILL.md`

如果规则冲突，优先级：

`procurement-ui` > `sap-integration-ui` > `dynamic-form` > `enterprise-table` > `enterprise-ui` > `visual-quality`

## 技术建议

- React + TypeScript
- Ant Design 作为主 UI 体系
- Design Token 统一主题
- 复杂表格可使用 TanStack Table
- Playwright 负责关键流程回归测试

## 开发流程

每个新页面必须先输出：

1. 页面目标
2. 主要用户角色
3. 页面信息架构
4. 核心操作
5. 动态场景差异
6. SAP业务边界

确认上述结构后再生成组件代码。

## 不可违反的业务规则

- 采购合同不是所有采购订单的必经节点。
- 采购订单行是最小执行控制单元。
- 物料号不是所有采购行必填。
- 服务采购不能设计成普通库存入库。
- 退货和冲销必须分开。
- 财务会计科目不由采购业务前台维护。
- SAP技术码不能成为普通用户的主要操作语言。
- 简单收货优先 Drawer，复杂服务验收优先独立页面。
