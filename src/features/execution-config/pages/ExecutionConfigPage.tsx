import { CheckCircleFilled, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Flex,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import { useState } from 'react';
import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionScenario } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';

interface ScenarioConfig {
  code: ExecutionScenario;
  mode: string;
  action: string;
  enabled: boolean;
}

const initialScenarios: ScenarioConfig[] = [
  { code: 'MAT_STOCK', mode: '数量 + 金额', action: '采购收货', enabled: true },
  { code: 'MAT_FREE', mode: '数量', action: '采购收货', enabled: true },
  { code: 'SERVICE', mode: '金额', action: '服务验收', enabled: true },
  { code: 'SERVICE_LIMIT', mode: '额度', action: '执行确认', enabled: true },
];

const modeOptions = ['数量 + 金额', '数量', '金额', '额度'].map((value) => ({ value, label: value }));
const actionOptions = ['采购收货', '服务验收', '执行确认'].map((value) => ({ value, label: value }));
const operationOptions = [
  { value: 'PARTIAL', label: '允许部分执行' },
  { value: 'RETURN', label: '允许采购退货' },
  { value: 'REVERSAL', label: '允许冲销' },
];

export function ExecutionConfigPage() {
  const { message } = App.useApp();
  const [scenarioList, setScenarioList] = useState(initialScenarios);
  const [selected, setSelected] = useState<ExecutionScenario>('MAT_STOCK');
  const [allowedOperations, setAllowedOperations] = useState<Partial<Record<ExecutionScenario, string[]>>>({});
  const [conditionCounts, setConditionCounts] = useState<Partial<Record<ExecutionScenario, number>>>({});

  const scenario = scenarioList.find((item) => item.code === selected) ?? scenarioList[0];
  const selectedOperations = allowedOperations[selected] ?? ['PARTIAL', 'RETURN', 'REVERSAL'];
  const conditionCount = conditionCounts[selected] ?? 2;

  const updateScenario = (patch: Partial<ScenarioConfig>) => {
    setScenarioList((current) => current.map((item) => (item.code === selected ? { ...item, ...patch } : item)));
  };

  const addScenario = () => {
    const existing = scenarioList.find((item) => item.code === 'OTHER');
    if (existing) {
      setSelected(existing.code);
      message.info('已定位到“其他”扩展场景。');
      return;
    }
    setScenarioList((current) => [
      ...current,
      { code: 'OTHER', mode: '数量', action: '执行确认', enabled: false },
    ]);
    setSelected('OTHER');
    message.success('已新增扩展场景，请继续完善识别条件。');
  };

  const recognitionItems = [
    { key: 'condition1', label: '条件 1', children: 'Material 存在' },
    {
      key: 'condition2',
      label: '条件 2',
      children: selected === 'SERVICE' || selected === 'SERVICE_LIMIT'
        ? 'Product Type Group = Service'
        : 'GR Required = Yes',
    },
    ...Array.from({ length: Math.max(conditionCount - 2, 0) }, (_, index) => ({
      key: `condition${index + 3}`,
      label: `条件 ${index + 3}`,
      children: <Typography.Text type="secondary">待配置条件</Typography.Text>,
    })),
    {
      key: 'result',
      label: '识别结果',
      children: <Typography.Text strong>{scenarioMeta[selected].label}</Typography.Text>,
    },
  ];

  return (
    <>
      <PageHeader
        title="执行场景配置"
        description="管理采购订单行的场景识别、执行控制方式和允许的业务动作。字段显示与校验请在“动态字段规则”中维护。"
        actions={(
          <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('执行场景配置已保存。')}>
            保存配置
          </Button>
        )}
      />
      <Row gutter={16} align="top" wrap={false}>
        <Col flex="260px">
          <Card
            className="business-card config-scenario-list"
            title="执行场景"
            extra={<Button type="text" aria-label="新增场景" icon={<PlusOutlined />} onClick={addScenario} />}
          >
            <div className="config-scenario-items">
              {scenarioList.map((item) => (
                <button
                  type="button"
                  className={item.code === selected ? 'is-selected' : ''}
                  onClick={() => setSelected(item.code)}
                  key={item.code}
                >
                  <CheckCircleFilled className={item.enabled ? 'scenario-enabled' : undefined} />
                  <span>
                    <strong>{scenarioMeta[item.code].label}</strong>
                    <small>{item.mode} · {item.action}</small>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </Col>
        <Col flex="auto" className="config-editor-col">
          <Card
            className="business-card config-editor"
            title={scenarioMeta[selected].label}
            extra={(
              <Space size={8}>
                <Typography.Text type="secondary">启用场景</Typography.Text>
                <Switch size="small" checked={scenario.enabled} onChange={(enabled) => updateScenario({ enabled })} />
              </Space>
            )}
          >
            <Tabs
              items={[
                {
                  key: 'basic',
                  label: '基本信息',
                  children: (
                    <Form layout="vertical">
                      <div className="dynamic-form-grid">
                        <Form.Item label="场景编码"><Input readOnly value={scenario.code} /></Form.Item>
                        <Form.Item label="场景名称"><Input value={scenarioMeta[selected].label} readOnly /></Form.Item>
                        <Form.Item label="执行控制方式">
                          <Select value={scenario.mode} options={modeOptions} onChange={(mode) => updateScenario({ mode })} />
                        </Form.Item>
                        <Form.Item label="主执行动作"><Input value={scenario.action} readOnly /></Form.Item>
                        <Form.Item className="dynamic-form-grid__wide" label="允许操作">
                          <Checkbox.Group
                            value={selectedOperations}
                            options={operationOptions}
                            onChange={(values) => setAllowedOperations((current) => ({ ...current, [selected]: values as string[] }))}
                          />
                        </Form.Item>
                      </div>
                    </Form>
                  ),
                },
                {
                  key: 'recognition',
                  label: '场景识别条件',
                  children: (
                    <>
                      <Descriptions bordered size="small" column={1} items={recognitionItems} />
                      <Flex justify="flex-end" className="config-actions">
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setConditionCounts((current) => ({ ...current, [selected]: conditionCount + 1 }));
                            message.success('已添加一条待配置识别条件。');
                          }}
                        >
                          添加条件
                        </Button>
                      </Flex>
                    </>
                  ),
                },
                {
                  key: 'actions',
                  label: '业务动作',
                  children: (
                    <div className="config-action-panel">
                      <Typography.Text type="secondary">订单行识别为该场景后，工作台优先展示以下主操作：</Typography.Text>
                      <Radio.Group
                        value={scenario.action}
                        options={actionOptions}
                        onChange={(event) => updateScenario({ action: event.target.value })}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
