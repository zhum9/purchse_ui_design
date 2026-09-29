import {
  ApartmentOutlined,
  BellOutlined,
  CalendarOutlined,
  DeploymentUnitOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReconciliationOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Badge, Breadcrumb, Button, Dropdown, Flex, Input, Layout, Menu, Select, Space, Tag, Typography, type MenuProps } from 'antd';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@app/store';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/work/tasks', icon: <ReconciliationOutlined />, label: '我的工作' },
  { key: '/planning', icon: <CalendarOutlined />, label: '采购准备', children: [
    { key: '/planning/demands', label: '采购需求' },
    { key: '/planning/aggregation', label: '需求池与汇总' },
    { key: '/planning/plans', label: '采购计划' },
  ] },
  { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '采购订单' },
  { key: '/fulfillment', icon: <DeploymentUnitOutlined />, label: '采购履约', children: [
    { key: '/fulfillment/workbench', label: '履约工作台' },
    { key: '/fulfillment/records', label: '履约记录' },
  ] },
  { key: '/returns', icon: <RetweetOutlined />, label: '退货与冲销' },
  { key: '/sap', icon: <SyncOutlined />, label: 'SAP 集成', children: [
    { key: '/sap/monitor', label: '执行监控' },
    { key: '/sap/reconciliation', label: 'SAP 业务核对' },
  ] },
  { key: '/settings', icon: <SettingOutlined />, label: '执行配置', children: [
    { key: '/settings/execution-scenarios', label: '执行场景' },
    { key: '/settings/field-rules', label: '动态字段规则' },
  ] },
];

const breadcrumbNames: Record<string, string> = {
  work: '我的工作', tasks: '任务与审批', planning: '采购准备', demands: '采购需求', aggregation: '需求池与汇总', plans: '采购计划', new: '新建', edit: '编辑',
  'purchase-orders': '采购订单', fulfillment: '采购履约', workbench: '履约工作台', records: '履约记录',
  returns: '退货与冲销', sap: 'SAP 集成', monitor: '执行监控', reconciliation: '业务对账',
  settings: '执行配置', 'execution-scenarios': '执行场景', 'field-rules': '动态字段规则', service: '服务验收',
};

export function AppLayout() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { pathname } = useLocation();
  const collapsed = useAppStore((state) => state.navigationCollapsed);
  const setCollapsed = useAppStore((state) => state.setNavigationCollapsed);
  const [menuSearch, setMenuSearch] = useState('');
  const segments = pathname.split('/').filter(Boolean);
  const selectedKey = pathname.startsWith('/purchase-orders') ? '/purchase-orders' : pathname.startsWith('/planning/plans/') ? '/planning/plans' : pathname.startsWith('/planning/demands/') ? '/planning/demands' : pathname;
  const filteredMenu = menuItems?.filter((item) => item && ('children' in item ? [item.label, ...(item.children ?? []).map((child) => child && 'label' in child ? child.label : '')].join('') : 'label' in item ? String(item.label) : '').includes(menuSearch));
  const currentTitle = breadcrumbNames[segments.at(-1) ?? ''] ?? (pathname.includes('/purchase-orders/') ? '采购订单详情' : '业务详情');

  return (
    <Layout className="app-shell">
      <Sider width={224} collapsedWidth={72} collapsible collapsed={collapsed} trigger={null} className="app-sider">
        <div className="brand" aria-label="采购执行中心">
          <div className="brand__mark"><ReconciliationOutlined /></div>
          {!collapsed && <div><strong>采购执行中心</strong><span>Procurement Center</span></div>}
        </div>
        {!collapsed && <div className="menu-search"><Input variant="filled" size="small" prefix={<SearchOutlined />} placeholder="菜单搜索" aria-label="菜单搜索" allowClear value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} /></div>}
        <Menu theme="light" mode="inline" items={filteredMenu} selectedKeys={[selectedKey]} defaultOpenKeys={['/planning', '/fulfillment', '/sap', '/settings']} onClick={({ key }) => navigate(key)} />
        {!collapsed && <div className="sidebar-footnote">采购执行中心 · 核心版</div>}
      </Sider>
      <Layout>
        <Header className="app-header">
          <Flex align="center" justify="space-between">
            <Space size={16}>
              <Button type="text" aria-label={collapsed ? '展开导航' : '收起导航'} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
              <Select value="北方粮食集团" variant="borderless" suffixIcon={<ApartmentOutlined />} options={[{ value: '北方粮食集团', label: '北方粮食集团' }]} />
            </Space>
            <Space size={18}>
              <Tag className="prototype-tag">本机原型 · 非共享数据</Tag>
              <Dropdown trigger={['click']} menu={{ items: [
                { key: 'sap-unknown', label: '1 条 SAP 状态待核对' },
                { key: 'overdue', label: '1 条采购订单已超期' },
              ], onClick: ({ key }) => navigate(key === 'sap-unknown' ? '/sap/monitor' : '/fulfillment/workbench?status=OVERDUE') }}>
                <Badge dot><Button type="text" aria-label="通知" icon={<BellOutlined />} /></Badge>
              </Dropdown>
              <Dropdown menu={{ items: [{ key: 'profile', label: '个人设置' }, { key: 'logout', label: '退出登录' }], onClick: ({ key }) => message.info(key === 'profile' ? '个人设置入口已触发。' : '原型环境不会退出当前登录。') }}>
                <Space className="user-menu"><Avatar size="small" icon={<UserOutlined />} /><Typography.Text>采购运营 · 张敏</Typography.Text></Space>
              </Dropdown>
            </Space>
          </Flex>
          <div className="workspace-tabs"><Button type="text" onClick={() => navigate('/work/tasks')}>工作台</Button><span className="workspace-tab--active">{currentTitle}</span></div>
        </Header>
        <Content className="app-content">
          <Breadcrumb className="app-breadcrumb" items={[{ title: <SafetyCertificateOutlined /> }, ...segments.map((segment) => ({ title: breadcrumbNames[segment] ?? (segment.startsWith('PO-') ? '订单详情' : segment.startsWith('PLAN-') ? '计划详情' : segment) }))]} />
          <main><Outlet /></main>
        </Content>
      </Layout>
    </Layout>
  );
}
