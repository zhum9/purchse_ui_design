import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import {
  App,
  Alert,
  Button,
  Descriptions,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useState } from 'react';
import { PageHeader } from '@shared/components/PageHeader';

interface ReconciliationAnomaly {
  id: string;
  type: string;
  po: string;
  document: string;
  suggestion: string;
  severity: '高' | '中';
}

const anomalies: ReconciliationAnomaly[] = [
  { id: 'RC-001', type: 'SAP有凭证，本地没有结果', po: '4500023412 / 00010', document: '5000123999', suggestion: '核对业务请求ID后，将 SAP 凭证安全回写本地。', severity: '高' },
  { id: 'RC-002', type: 'PO发生变更，业务系统未同步', po: '4500023088 / 00010', document: '-', suggestion: '同步采购订单最新交货日期与库存地点后重新校验。', severity: '中' },
  { id: 'RC-003', type: '数量不一致', po: '4500012345 / 00010', document: '5000123511', suggestion: '核对冲销与退货事件，按净履约数量重新对账。', severity: '中' },
];

export function SapReconciliationPage() {
  const { message, modal } = App.useApp();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState('2026-09-11 15:30');
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const runReconciliation = () => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      setLastChecked(new Date().toLocaleString('zh-CN', { hour12: false }));
      message.success('对账完成，当前仍有未处理差异。');
    }, 650);
  };

  const handleAnomaly = (record: ReconciliationAnomaly) => {
    modal.confirm({
      title: `处理差异 ${record.id}`,
      okText: '标记已处理',
      cancelText: '取消',
      content: (
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'type', label: '异常类型', children: record.type },
            { key: 'po', label: 'SAP PO / Item', children: record.po },
            { key: 'suggestion', label: '处理建议', children: record.suggestion },
          ]}
        />
      ),
      onOk: () => {
        setResolvedIds((current) => [...new Set([...current, record.id])]);
        message.success(`${record.id} 已标记为已处理。`);
      },
    });
  };

  const columns: TableColumnsType<ReconciliationAnomaly> = [
    { title: '异常类型', dataIndex: 'type', width: 240 },
    { title: 'SAP PO / Item', dataIndex: 'po', width: 180 },
    { title: 'SAP凭证', dataIndex: 'document', width: 140 },
    {
      title: '风险',
      dataIndex: 'severity',
      width: 90,
      render: (value: ReconciliationAnomaly['severity']) => (
        <Tag color={value === '高' ? 'error' : 'warning'}>{value}</Tag>
      ),
    },
    { title: '处理建议', dataIndex: 'suggestion' },
    {
      title: '处理状态',
      key: 'status',
      width: 110,
      render: (_, record) =>
        resolvedIds.includes(record.id) ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>已处理</Tag>
        ) : (
          <Tag>待处理</Tag>
        ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          disabled={resolvedIds.includes(record.id)}
          onClick={() => handleAnomaly(record)}
        >
          {resolvedIds.includes(record.id) ? '已完成' : '处理'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="SAP业务对账"
        description="识别本地采购执行事实与 SAP 凭证状态之间的不一致，并提供可执行的处理建议。"
        actions={(
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={checking}
            onClick={runReconciliation}
          >
            立即对账
          </Button>
        )}
      />
      <Alert
        type="warning"
        showIcon
        title={`发现 ${anomalies.length - resolvedIds.length} 条需要处理的差异`}
        description={(
          <Typography.Text>
            最近对账：{lastChecked}。对账处理不会直接重试业务过账；状态未知记录需先完成 SAP 状态核对。
          </Typography.Text>
        )}
      />
      <div className="content-surface reconciliation-table">
        <Table
          rowKey="id"
          size="small"
          dataSource={anomalies}
          pagination={false}
          columns={columns}
        />
      </div>
    </>
  );
}
