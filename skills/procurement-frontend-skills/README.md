# Procurement Frontend Skills

这套 Skill 用于“采购执行中心 / Procurement Execution Center”的前端原型与开发。

建议技术栈：React + TypeScript + Ant Design；复杂表格可结合 TanStack Table；自动化验收使用 Playwright。

目录：

- `enterprise-ui/SKILL.md`：企业后台通用布局与交互规范
- `procurement-ui/SKILL.md`：采购订单、履约、退货、冲销等业务UI规则
- `dynamic-form/SKILL.md`：动态字段、条件显隐、必填、只读、校验规则
- `enterprise-table/SKILL.md`：企业级复杂表格设计规范
- `sap-integration-ui/SKILL.md`：SAP集成、状态、凭证、错误及技术字段展示规范
- `visual-quality/SKILL.md`：视觉一致性、可访问性、响应式与最终验收规范

## 推荐使用方式

1. 把整个目录放入项目的 `skills/`、`.skills/` 或当前 Agent/Codex 能读取的项目技能目录。
2. 在项目级 `AGENTS.md` / `CLAUDE.md` / Codex 项目说明中加入：
   - 开发采购执行中心前端时，优先读取并遵守本目录全部 SKILL.md。
   - 若规则冲突，优先级：`procurement-ui` > `sap-integration-ui` > `dynamic-form` > `enterprise-table` > `enterprise-ui` > `visual-quality`。
3. 对复杂页面，先生成页面信息架构，再写代码，不直接堆组件。
4. 默认不修改本 Skill 中的业务边界，除非需求明确提出。

## 项目核心原则

- 采购订单是执行主线，采购订单行是最小执行单元。
- 合同不是所有采购的必经节点。
- 物料号不是所有采购行必填。
- 服务采购不能按普通物料入库处理。
- 退货与冲销必须分开。
- 业务系统不承担财务科目维护职责。
- SAP复杂字段和接口细节应隐藏在适配层和技术信息区。
