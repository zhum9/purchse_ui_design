import { EditOutlined, PlusOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useMemo, useState } from 'react';
import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionScenario } from '@domain/procurement/types';
import { getExecutionFormSchema } from '@domain/execution-rule/schemas';
import type { DynamicFieldSchema, FieldComponent, FieldSource, FieldState } from '@domain/execution-rule/types';
import { purchaseOrderItems } from '@mocks/fixtures/purchaseOrders';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';

interface FieldRuleRow extends Omit<DynamicFieldSchema, 'defaultValue'> {
  id: string;
  scenario: ExecutionScenario;
  defaultValue?: string;
  ruleNote: string;
}

interface FieldRuleFormValues {
  scenario: ExecutionScenario;
  key: string;
  label: string;
  state: FieldState;
  source: FieldSource;
  group: DynamicFieldSchema['group'];
  component: FieldComponent;
  defaultValue?: string;
  businessHelp?: string;
}

const managedScenarios: ExecutionScenario[] = ['MAT_STOCK', 'MAT_FREE', 'SERVICE', 'SERVICE_LIMIT'];
const stateLabels: Record<FieldState, string> = {
  HIDDEN: '隐藏',
  DISPLAY: '只读显示',
  OPTIONAL: '选填',
  REQUIRED: '必填',
  AUTO: '自动计算',
};
const sourceLabels: Record<FieldSource, string> = {
  USER: '用户输入',
  SAP: 'SAP继承',
  MASTER: '主数据',
  CALCULATED: '系统计算',
  DEFAULT: '默认规则',
};
const groupLabels: Record<DynamicFieldSchema['group'], string> = {
  EXECUTION: '本次执行',
  DELIVERY: '库存与交付',
  SERVICE: '服务信息',
  ATTACHMENT: '附件与说明',
};
const componentLabels: Record<FieldComponent, string> = {
  input: '文本输入',
  number: '数值输入',
  select: '下拉选择',
  date: '日期',
  dateRange: '日期区间',
  textarea: '长文本',
  upload: '附件上传',
  radio: '单选',
};

const getRuleNote = (field: DynamicFieldSchema) => {
  if (field.state === 'HIDDEN') return '按执行场景隐藏，不占用表单位置';
  if (field.state === 'AUTO') return '由系统自动计算，业务人员不可修改';
  if (field.source === 'SAP') return '从采购订单继承，按字段状态控制编辑';
  if (field.max !== undefined) return field.businessHelp ?? '不得超过订单行剩余可执行值';
  if (field.defaultValue !== undefined) return `默认带入：${String(field.defaultValue)}`;
  return field.businessHelp ?? '按字段状态直接生效';
};

const createInitialRules = (): FieldRuleRow[] => managedScenarios.flatMap((scenario) => {
  const sample = purchaseOrderItems.find((item) => item.executionScenario === scenario);
  if (!sample) return [];
  return getExecutionFormSchema(sample).fields.map((field) => ({
    ...field,
    id: `${scenario}-${field.key}`,
    scenario,
    defaultValue: field.defaultValue === undefined ? undefined : String(field.defaultValue),
    ruleNote: getRuleNote(field),
  }));
});

const scenarioOptions = managedScenarios.map((value) => ({ value, label: scenarioMeta[value].label }));
const stateOptions = (Object.entries(stateLabels) as Array<[FieldState, string]>).map(([value, label]) => ({ value, label }));
const sourceOptions = (Object.entries(sourceLabels) as Array<[FieldSource, string]>).map(([value, label]) => ({ value, label }));
const groupOptions = (Object.entries(groupLabels) as Array<[DynamicFieldSchema['group'], string]>).map(([value, label]) => ({ value, label }));
const componentOptions = (Object.entries(componentLabels) as Array<[FieldComponent, string]>).map(([value, label]) => ({ value, label }));

export function DynamicFieldRulesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FieldRuleFormValues>();
  const [rules, setRules] = useState<FieldRuleRow[]>(createInitialRules);
  const [keyword, setKeyword] = useState('');
  const [scenario, setScenario] = useState<ExecutionScenario | 'ALL'>('ALL');
  const [state, setState] = useState<FieldState | 'ALL'>('ALL');
  const [source, setSource] = useState<FieldSource | 'ALL'>('ALL');
  const [editingRule, setEditingRule] = useState<FieldRuleRow | 'NEW' | null>(null);

  const filteredRules = useMemo(() => rules.filter((rule) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const matchesKeyword = !normalizedKeyword
      || rule.label.toLowerCase().includes(normalizedKeyword)
      || rule.key.toLowerCase().includes(normalizedKeyword);
    return matchesKeyword
      && (scenario === 'ALL' || rule.scenario === scenario)
      && (state === 'ALL' || rule.state === state)
      && (source === 'ALL' || rule.source === source);
  }), [keyword, rules, scenario, source, state]);

  const openCreate = () => {
    setEditingRule('NEW');
    form.resetFields();
    form.setFieldsValue({
      scenario: scenario === 'ALL' ? 'MAT_STOCK' : scenario,
      state: 'OPTIONAL',
      source: 'USER',
      group: 'EXECUTION',
      component: 'input',
    });
  };

  const openEdit = (record: FieldRuleRow) => {
    setEditingRule(record);
    form.setFieldsValue({ ...record, businessHelp: record.businessHelp ?? record.ruleNote });
  };

  const closeEditor = () => {
    setEditingRule(null);
    form.resetFields();
  };

  const saveRule = async () => {
    const values = await form.validateFields();
    const id = `${values.scenario}-${values.key.trim()}`;
    if (editingRule === 'NEW' && rules.some((rule) => rule.id === id)) {
      message.error('该场景下已存在相同字段编码。');
      return;
    }
    const nextRule: FieldRuleRow = {
      ...values,
      id: editingRule === 'NEW' ? id : editingRule.id,
      key: values.key.trim(),
      label: values.label.trim(),
      ruleNote: values.businessHelp?.trim() || '按字段状态直接生效',
    };
    setRules((current) => editingRule === 'NEW'
      ? [nextRule, ...current]
      : current.map((rule) => (rule.id === editingRule.id ? nextRule : rule)));
    closeEditor();
    message.success(editingRule === 'NEW' ? '字段规则已新增。' : '字段规则已更新。');
  };

  const resetFilters = () => {
    setKeyword('');
    setScenario('ALL');
    setState('ALL');
    setSource('ALL');
  };

  const columns: TableColumnsType<FieldRuleRow> = [
    {
      title: '执行场景',
      dataIndex: 'scenario',
      width: 120,
      fixed: 'left',
      render: (value: ExecutionScenario) => <Tag color={scenarioMeta[value].color}>{scenarioMeta[value].label}</Tag>,
    },
    {
      title: '字段',
      key: 'field',
      width: 190,
      fixed: 'left',
      render: (_, record) => <div className="primary-cell"><strong>{record.label}</strong><span>{record.key}</span></div>,
    },
    { title: '业务分组', dataIndex: 'group', width: 120, render: (value: DynamicFieldSchema['group']) => groupLabels[value] },
    { title: '控件类型', dataIndex: 'component', width: 110, render: (value: FieldComponent) => componentLabels[value] },
    { title: '字段来源', dataIndex: 'source', width: 110, render: (value: FieldSource) => sourceLabels[value] },
    {
      title: '字段状态',
      dataIndex: 'state',
      width: 115,
      render: (value: FieldState) => (
        <Tag color={value === 'REQUIRED' ? 'blue' : value === 'AUTO' ? 'green' : value === 'HIDDEN' ? 'default' : undefined}>
          {stateLabels[value]}
        </Tag>
      ),
    },
    { title: '默认值', dataIndex: 'defaultValue', width: 130, ellipsis: true, render: (value?: string) => value || '-' },
    { title: '生效规则 / 校验说明', dataIndex: 'ruleNote', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, record) => <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>,
    },
  ];

  const requiredCount = rules.filter((rule) => rule.state === 'REQUIRED').length;
  const inheritedCount = rules.filter((rule) => rule.source === 'SAP').length;
  const hiddenCount = rules.filter((rule) => rule.state === 'HIDDEN').length;

  return (
    <>
      <PageHeader
        title="动态字段规则"
        description="集中维护不同执行场景下字段的显示、必填、只读、默认值和校验规则。规则将用于生成实际履约表单。"
        actions={(
          <Space>
            <Button icon={<PlusOutlined />} onClick={openCreate}>新增字段规则</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('动态字段规则配置已保存。')}>
              保存配置
            </Button>
          </Space>
        )}
      />
      <MetricStrip items={[
        { label: '规则总数', value: rules.length },
        { label: '必填字段', value: requiredCount },
        { label: 'SAP继承字段', value: inheritedCount },
        { label: '场景隐藏字段', value: hiddenCount },
      ]} />
      <div className="content-surface content-surface--flush">
        <Form className="search-panel" layout="inline">
          <Form.Item>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="字段名称 / 字段编码"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={scenario}
              onChange={setScenario}
              options={[{ value: 'ALL', label: '全部执行场景' }, ...scenarioOptions]}
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={state}
              onChange={setState}
              options={[{ value: 'ALL', label: '全部字段状态' }, ...stateOptions]}
            />
          </Form.Item>
          <Form.Item>
            <Select
              value={source}
              onChange={setSource}
              options={[{ value: 'ALL', label: '全部字段来源' }, ...sourceOptions]}
            />
          </Form.Item>
          <Form.Item><Button onClick={resetFilters}>重置</Button></Form.Item>
        </Form>
        <Flex className="table-toolbar" justify="space-between">
          <Typography.Text strong>字段规则清单</Typography.Text>
          <Typography.Text type="secondary">当前显示 {filteredRules.length} 条</Typography.Text>
        </Flex>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filteredRules}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }}
          scroll={{ x: 1260 }}
          locale={{ emptyText: <Empty description="当前筛选条件下没有字段规则，可重置筛选或新增规则。" /> }}
        />
      </div>
      <Drawer
        title={editingRule === 'NEW' ? '新增字段规则' : `编辑字段规则 · ${editingRule?.label ?? ''}`}
        size={520}
        open={editingRule !== null}
        onClose={closeEditor}
        extra={(
          <Space>
            <Button onClick={closeEditor}>取消</Button>
            <Button type="primary" onClick={saveRule}>保存规则</Button>
          </Space>
        )}
      >
        <Form form={form} layout="vertical">
          <div className="dynamic-form-grid">
            <Form.Item name="scenario" label="执行场景" rules={[{ required: true, message: '请选择执行场景' }]}>
              <Select options={scenarioOptions} />
            </Form.Item>
            <Form.Item name="group" label="业务分组" rules={[{ required: true, message: '请选择业务分组' }]}>
              <Select options={groupOptions} />
            </Form.Item>
            <Form.Item name="key" label="字段编码" rules={[{ required: true, message: '请输入字段编码' }]}>
              <Input disabled={editingRule !== 'NEW'} placeholder="例如 deliveryNote" />
            </Form.Item>
            <Form.Item name="label" label="字段名称" rules={[{ required: true, message: '请输入字段名称' }]}>
              <Input placeholder="例如 送货单号" />
            </Form.Item>
            <Form.Item name="state" label="字段状态" rules={[{ required: true, message: '请选择字段状态' }]}>
              <Select options={stateOptions} />
            </Form.Item>
            <Form.Item name="source" label="字段来源" rules={[{ required: true, message: '请选择字段来源' }]}>
              <Select options={sourceOptions} />
            </Form.Item>
            <Form.Item name="component" label="控件类型" rules={[{ required: true, message: '请选择控件类型' }]}>
              <Select options={componentOptions} />
            </Form.Item>
            <Form.Item name="defaultValue" label="默认值"><Input placeholder="无默认值可留空" /></Form.Item>
            <Form.Item className="dynamic-form-grid__wide" name="businessHelp" label="生效规则 / 校验说明">
              <Input.TextArea rows={4} placeholder="使用业务语言描述字段显隐、必填或校验条件" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </>
  );
}
