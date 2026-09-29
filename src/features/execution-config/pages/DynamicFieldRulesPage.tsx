import { SearchOutlined } from '@ant-design/icons';
import { Alert, Empty, Form, Input, Select, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { getExecutionFormSchema } from '@domain/execution-rule/schemas';
import type { DynamicFieldSchema, ExecutionFormSchema, FieldSource, FieldState } from '@domain/execution-rule/types';
import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionScenario, PurchaseOrderItem } from '@domain/procurement/types';
import { purchaseOrderItems } from '@mocks/fixtures/purchaseOrders';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';

interface FieldRuleRow extends DynamicFieldSchema {
  id: string;
  scenario: ExecutionScenario;
  ruleNote: string;
}

const scenarios: ExecutionScenario[] = ['MAT_STOCK', 'MAT_CONSUME', 'MAT_FREE', 'SERVICE', 'SERVICE_LIMIT'];
const stateLabel: Record<FieldState, string> = { HIDDEN: '隐藏', DISPLAY: '只读显示', OPTIONAL: '选填', REQUIRED: '必填', AUTO: '自动计算' };
const sourceLabel: Record<FieldSource, string> = { USER: '用户输入', SAP: 'SAP继承', MASTER: '主数据', CALCULATED: '系统计算', DEFAULT: '默认规则' };
const stateTone: Record<FieldState, string | undefined> = { HIDDEN: undefined, DISPLAY: undefined, OPTIONAL: undefined, REQUIRED: 'processing', AUTO: 'success' };
const rules: FieldRuleRow[] = scenarios.flatMap((scenario) => {
  const item = purchaseOrderItems.find((row: PurchaseOrderItem) => row.executionScenario === scenario);
  if (!item) return [];
  const schema: ExecutionFormSchema = getExecutionFormSchema(item);
  return schema.fields.map((field) => ({
    ...field,
    id: `${scenario}-${field.key}`,
    scenario,
    ruleNote: field.businessHelp ?? (field.state === 'AUTO' ? '系统自动计算，不允许手工修改' : field.max !== undefined ? '不得超过最新订单可执行余额' : '按当前原型表单规则处理'),
  }));
});

export function DynamicFieldRulesPage() {
  const [keyword, setKeyword] = useState('');
  const [scenario, setScenario] = useState<ExecutionScenario | 'ALL'>('ALL');
  const [state, setState] = useState<FieldState | 'ALL'>('ALL');
  const [source, setSource] = useState<FieldSource | 'ALL'>('ALL');
  const filtered = useMemo(() => rules.filter((field) => {
    const matchText = !keyword.trim() || `${field.label} ${field.key}`.toLowerCase().includes(keyword.trim().toLowerCase());
    return matchText && (scenario === 'ALL' || field.scenario === scenario) && (state === 'ALL' || field.state === state) && (source === 'ALL' || field.source === source);
  }), [keyword, scenario, source, state]);
  const columns: TableColumnsType<FieldRuleRow> = [
    { title: '执行场景', dataIndex: 'scenario', width: 145, fixed: 'left', render: (value: ExecutionScenario) => <Tag color={scenarioMeta[value].color}>{scenarioMeta[value].label}</Tag> },
    { title: '业务字段', key: 'field', width: 200, fixed: 'left', render: (_, field) => <div className="primary-cell"><strong>{field.label}</strong><span>{field.key}</span></div> },
    { title: '分组', dataIndex: 'group', width: 120 }, { title: '字段来源', dataIndex: 'source', width: 120, render: (value: FieldSource) => sourceLabel[value] },
    { title: '字段状态', dataIndex: 'state', width: 120, render: (value: FieldState) => <Tag color={stateTone[value]}>{stateLabel[value]}</Tag> },
    { title: '最大值', dataIndex: 'max', width: 120, render: (value?: number) => value ?? '未设置' },
    { title: '规则说明', dataIndex: 'ruleNote', ellipsis: true },
  ];
  const required = rules.filter((rule) => rule.state === 'REQUIRED').length;
  const sapFields = rules.filter((rule) => rule.source === 'SAP').length;
  const autoFields = rules.filter((rule) => rule.state === 'AUTO').length;
  return <>
    <PageHeader title="动态字段规则" description="查看各履约场景当前表单字段的显示状态、来源与校验说明。" />
    <Alert className="editor-section" type="info" showIcon title="当前规则来自前端内置表单定义，页面仅供核对。尚未接入 pur_rule_version / pur_rule_bundle 的版本草稿、审批发布和运行时加载，不能在此编辑并声称规则已生效。" />
    <MetricStrip items={[{ label: '当前字段定义', value: rules.length }, { label: '原型必填字段', value: required }, { label: 'SAP继承字段', value: sapFields }, { label: '自动计算字段', value: autoFields }]} />
    <div className="content-surface content-surface--flush">
      <Form className="search-panel" layout="inline">
        <Form.Item><Input allowClear prefix={<SearchOutlined />} placeholder="字段名称 / 字段编码" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></Form.Item>
        <Form.Item><Select value={scenario} onChange={setScenario} options={[{ value: 'ALL', label: '全部执行场景' }, ...scenarios.map((value) => ({ value, label: scenarioMeta[value].label }))]} /></Form.Item>
        <Form.Item><Select value={state} onChange={setState} options={[{ value: 'ALL', label: '全部字段状态' }, ...Object.entries(stateLabel).map(([value, label]) => ({ value, label }))]} /></Form.Item>
        <Form.Item><Select value={source} onChange={setSource} options={[{ value: 'ALL', label: '全部字段来源' }, ...Object.entries(sourceLabel).map(([value, label]) => ({ value, label }))]} /></Form.Item>
        <Typography.Text type="secondary">当前显示 {filtered.length} 条</Typography.Text>
      </Form>
      <Space className="table-toolbar"><Typography.Text strong>表单字段定义</Typography.Text><Typography.Text type="secondary">核心金额、额度和余额规则由业务服务强制校验</Typography.Text></Space>
      <Table rowKey="id" size="small" columns={columns} dataSource={filtered} pagination={{ pageSize: 15, showSizeChanger: false }} scroll={{ x: 1100 }} locale={{ emptyText: <Empty description="没有匹配的字段定义" /> }} />
    </div>
  </>;
}
