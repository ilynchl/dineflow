import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, ConfigProvider } from 'antd';
import {
  DashboardOutlined, MenuOutlined, TableOutlined,
  OrderedListOutlined, ShopOutlined, SettingOutlined,
  QrcodeOutlined, BarChartOutlined, StopOutlined, SoundOutlined,
} from '@ant-design/icons';

import OperationPanel from './pages/operation/OperationPanel';
import OrderList from './pages/operation/OrderList';
import MenuManage from './pages/admin/MenuManage';
import SoldOutManage from './pages/admin/SoldOutManage';
import WordLibrary from './pages/admin/WordLibrary';
import TableManage from './pages/admin/TableManage';
import QrManage from './pages/admin/QrManage';
import StatsPage from './pages/admin/StatsPage';
import SettingsPage from './pages/admin/SettingsPage';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '经营看板' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '订单列表' },
  { key: '/menu', icon: <MenuOutlined />, label: '菜品管理' },
  { key: '/soldout', icon: <StopOutlined />, label: '沽清管理' },
  { key: '/words', icon: <SoundOutlined />, label: '词库管理' },
  { key: '/tables', icon: <TableOutlined />, label: '桌台管理' },
  { key: '/qrcodes', icon: <QrcodeOutlined />, label: '活码管理' },
  { key: '/stats', icon: <BarChartOutlined />, label: '营业统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        theme="dark" width={180}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{
          height: 48, margin: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: collapsed ? 14 : 18,
        }}>
          {collapsed ? '🍢' : '🍢 烧烤摊'}
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 180, transition: 'margin-left 0.2s' }}>
        <Content style={{ margin: 12, minHeight: 'calc(100vh - 24px)' }}>
          <Routes>
            <Route path="/" element={<OperationPanel />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/menu" element={<MenuManage />} />
            <Route path="/soldout" element={<SoldOutManage />} />
            <Route path="/words" element={<WordLibrary />} />
            <Route path="/tables" element={<TableManage />} />
            <Route path="/qrcodes" element={<QrManage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
