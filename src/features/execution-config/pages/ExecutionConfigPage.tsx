import { CheckCircleFilled } from '@ant-design/icons';
import { Alert, Card, Col, Descriptions, Row, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionScenario } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';

interface ScenarioDefinition {
  code: ExecutionScenario;
  control: string;
  action: string;
  recognition: string;
  source: string;
}

const scenarios: ScenarioDefinition[] = [
  { code: 'MAT_STOCK', control: '数量与库存', action: '采购收货', recognition: '有物料主数据；订单行要求库存管理', source: 'SAP订单行与已发布的场景识别规则' },
  { code: 'MAT_CONSUME', control: '数量与费用归属', action: '采购收货', recognition: '有物料主数据；订单行按消耗性采购执行', source: 'SAP订单行与已发布的场景识别规则' },
  { code: 'MAT_FREE', control: '数量', action: '采购收货', recognition: '无物料号的货物采购行', source: 'SAP订单行与已发布的场景识别规则' },
  { code: 'SERVICE', control: '服务数量与验收金额', action: '服务验收', recognition: '服务采购行，非限额控制', source: 'SAP订单行与已发布的场景识别规则' },
  { code: 'SERVICE_LIMIT', control: '预计金额与最高限额', action: '限额服务执行确认', recognition: '服务采购行，订单行设置最高限额', source: 'SAP订单行与已发布的场景识别规则' },
];

export function ExecutionConfigPage() {
  const [selected, setSelected] = useState<ExecutionScenario>('MAT_STOCK');
  const scenario = scenarios.find((item) => item.code === selected) ?? scenarios[0];
  return <>
    <PageHeader title="执行场景配置" description="查看采购订单行识别出的履约语义、控制方式和主业务动作。字段显示及校验见动态字段规则。" />
    <Alert className="editor-section" type="info" showIcon title="当前展示前端内置的核心场景目录。场景版本尚未接入 pur_rule_version / pur_rule_bundle 发布服务，页面不提供未持久化的编辑操作。" />
    <Row gutter={16} align="top" wrap={false}>
      <Col flex="260px">
        <Card className="business-card config-scenario-list" title="核心执行场景">
          <div className="config-scenario-items">{scenarios.map((item) => <button type="button" className={item.code === selected ? 'is-selected' : ''} onClick={() => setSelected(item.code)} key={item.code}>
            <CheckCircleFilled className="scenario-enabled" /><span><strong>{scenarioMeta[item.code].label}</strong><small>{item.control} · {item.action}</small></span>
          </button>)}</div>
        </Card>
      </Col>
      <Col flex="auto" className="config-editor-col">
        <Card className="business-card config-editor" title={scenarioMeta[selected].label} extra={<Tag color="processing">原型内置</Tag>}>
          <Tabs items={[
            { key: 'basic', label: '场景语义', children: <Descriptions bordered size="small" column={2} items={[
              { key: 'code', label: '场景编码', children: selected }, { key: 'name', label: '场景名称', children: scenarioMeta[selected].label },
              { key: 'control', label: '控制方式', children: scenario.control }, { key: 'action', label: '主执行动作', children: scenario.action },
              { key: 'source', label: '识别来源', children: scenario.source, span: 2 },
            ]} /> },
            { key: 'recognition', label: '识别条件', children: <Descriptions bordered size="small" column={1} items={[
              { key: 'recognition', label: '订单行条件', children: scenario.recognition },
              { key: 'unsupported', label: '未知/未适配组合', children: <Typography.Text type="warning">阻断履约，并提示需要补充业务适配；不会退化为普通收货。</Typography.Text> },
            ]} /> },
            { key: 'actions', label: '操作边界', children: <Descriptions bordered size="small" column={1} items={[
              { key: 'allowed', label: '主要动作', children: scenario.action },
              { key: 'returns', label: '后续反向处理', children: selected === 'SERVICE' ? '服务验收更正（原服务验收保持不变）' : '依据原履约事实选择采购退货或冲销' },
              { key: 'erp', label: 'SAP边界', children: '正式环境需先检查订单版本、审批、SAP状态、外部依赖和剩余余额；SAP 状态未知时不得重试。' },
            ]} /> },
          ]} />
        </Card>
      </Col>
    </Row>
  </>;
}
