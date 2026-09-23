import {
  ApartmentOutlined,
  BellOutlined,
  DeploymentUnitOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReconciliationOutlined,
  RetweetOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Badge, Breadcrumb, Button, Dropdown, Flex, Layout, Menu, Select, Space, Typography, type MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@app/store';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/purchase-orders', icon: <ShoppingCartOutlined />, label: '采购订单' },
  { key: '/fulfillment', icon: <DeploymentUnitOutlined />, label: '采购履约', children: [
    { key: '/fulfillment/workbench', label: '履约工作台' },
    { key: '/fulfillment/records', label: '履约记录' },
  ] },
  { key: '/returns', icon: <RetweetOutlined />, label: '退货与冲销' },
  { key: '/sap', icon: <SyncOutlined />, label: 'SAP 集成', children: [
    { key: '/sap/monitor', label: '执行监控' },
    { key: '/sap/reconciliation', label: '业务对账' },
  ] },
  { key: '/settings', icon: <SettingOutlined />, label: '执行配置', children: [
    { key: '/settings/execution-scenarios', label: '执行场景' },
    { key: '/settings/field-rules', label: '动态字段规则' },
  ] },
];

const breadcrumbNames: Record<string, string> = {
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
  const segments = pathname.split('/').filter(Boolean);
  const selectedKey = pathname.startsWith('/purchase-orders') ? '/purchase-orders' : pathname;

  return (
    <Layout className="app-shell">
      <Sider width={224} collapsedWidth={72} collapsible collapsed={collapsed} trigger={null} className="app-sider">
        <div className="brand" aria-label="采购执行中心">
          <div className="brand__mark"><ReconciliationOutlined /></div>
          {!collapsed && <div><strong>采购执行中心</strong><span>Procurement Center</span></div>}
        </div>
        <Menu theme="dark" mode="inline" items={menuItems} selectedKeys={[selectedKey]} defaultOpenKeys={['/fulfillment', '/sap', '/settings']} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Flex align="center" justify="space-between">
            <Space size={16}>
              <Button type="text" aria-label={collapsed ? '展开导航' : '收起导航'} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
              <Select value="北方粮食集团" variant="borderless" suffixIcon={<ApartmentOutlined />} options={[{ value: '北方粮食集团', label: '北方粮食集团' }]} />
            </Space>
            <Space size={18}>
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
        </Header>
        <Content className="app-content">
          <Breadcrumb className="app-breadcrumb" items={[{ title: <SafetyCertificateOutlined /> }, ...segments.map((segment) => ({ title: breadcrumbNames[segment] ?? (segment.startsWith('PO-') ? '订单详情' : segment) }))]} />
          <main><Outlet /></main>
        </Content>
      </Layout>
    </Layout>
  );
}
