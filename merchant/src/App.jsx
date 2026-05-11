import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Modal, Dropdown } from 'antd';
import {
  DashboardOutlined, MenuOutlined, TableOutlined,
  OrderedListOutlined, ShopOutlined, SettingOutlined,
  QrcodeOutlined, BarChartOutlined, StopOutlined, SoundOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SmileOutlined,
  FireOutlined,
} from '@ant-design/icons';

import './App.css';
import OperationPanel from './pages/operation/OperationPanel';
import OrderList from './pages/operation/OrderList';
import KitchenPage from './pages/kitchen/KitchenPage';
import MenuManage from './pages/admin/MenuManage';
import SoldOutManage from './pages/admin/SoldOutManage';
import WordLibrary from './pages/admin/WordLibrary';
import TableManage from './pages/admin/TableManage';
import QrManage from './pages/admin/QrManage';
import StatsPage from './pages/admin/StatsPage';
import SettingsPage from './pages/admin/SettingsPage';
import PreferencesPage from './pages/admin/PreferencesPage';
import Login from './pages/Login';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '经营看板' },
  { key: '/kitchen', icon: <FireOutlined />, label: '制作管理' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '订单列表' },
  { key: '/menu', icon: <MenuOutlined />, label: '菜品管理' },
  { key: '/soldout', icon: <StopOutlined />, label: '沽清管理' },
  { key: '/words', icon: <SoundOutlined />, label: '词库管理' },
  { key: '/tables', icon: <TableOutlined />, label: '桌台管理' },
  { key: '/qrcodes', icon: <QrcodeOutlined />, label: '活码管理' },
  { key: '/stats', icon: <BarChartOutlined />, label: '营业统计' },
  { key: '/preferences', icon: <SmileOutlined />, label: '偏好配置' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem('merchant_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function DashboardLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        trigger={null} theme="dark" width={180}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            height: 48, margin: '12px 8px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', fontSize: collapsed ? 14 : 18, flexShrink: 0,
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>{collapsed ? '🍢' : '慧点单商家后台'}</span>
            <Button type="text" icon={collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#fff', fontSize: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Menu
              theme="dark" mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
            />
          </div>
          <div style={{ padding: collapsed ? '8px 4px' : '8px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            {collapsed ? (
              <Button type="text" icon={<LogoutOutlined />} style={{ color: '#fff', width: '100%' }} onClick={() => setLogoutOpen(true)} />
            ) : (
              <Dropdown
                dropdownRender={() => (
                  <Menu
                    items={[{ key: 'logout', label: '退出登录' }]}
                    onClick={() => setLogoutOpen(true)}
                    theme="dark"
                    style={{ minWidth: 140, borderRadius: 8 }}
                  />
                )}
                placement="top" trigger={['click']}
              >
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, textAlign: 'center', cursor: 'pointer', padding: '4px 0' }}>
                  {user.username}
                </div>
              </Dropdown>
            )}
            <Modal title="确认退出" open={logoutOpen} onCancel={() => setLogoutOpen(false)} onOk={onLogout} okText="退出" cancelText="取消" okButtonProps={{ danger: true }} width={320} centered destroyOnClose>
              <p style={{ textAlign: 'center', margin: '16px 0' }}>是否退出登录？</p>
            </Modal>
          </div>
        </div>
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 180, transition: 'margin-left 0.2s' }}>
        <Content style={{ margin: 12, minHeight: 'calc(100vh - 24px)' }}>
          <Routes>
            <Route path="/" element={<OperationPanel />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/menu" element={<MenuManage />} />
            <Route path="/soldout" element={<SoldOutManage />} />
            <Route path="/words" element={<WordLibrary />} />
            <Route path="/tables" element={<TableManage />} />
            <Route path="/qrcodes" element={<QrManage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();

  const handleLogin = (userData, token) => {
    localStorage.setItem('merchant_token', token);
    localStorage.setItem('merchant_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_user');
    setUser(null);
    navigate('/login');
  };

  if (user && window.location.pathname === '/login') {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/*" element={
        user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />
      } />
    </Routes>
  );
}
