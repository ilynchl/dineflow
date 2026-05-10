import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, message, Modal, Dropdown } from 'antd';
import {
  TeamOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import Login from './pages/Login';
import Tenants from './pages/Tenants';
import SystemParams from './pages/SystemParams';
import AdminUsers from './pages/AdminUsers';
import './App.css';

const { Sider, Content } = Layout;

function getStoredUser() {
  try {
    const raw = localStorage.getItem('saas_user');
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

  // 展开子菜单：路径包含 /settings/ 时展开
  const defaultOpenKeys = location.pathname.startsWith('/settings/') ? ['settings'] : [];
  // 选中子菜单项
  const selectedKeys = [location.pathname];

  const menuItems = [
    { key: '/', icon: <TeamOutlined />, label: '商户管理' },
    {
      key: 'settings', icon: <SettingOutlined />, label: '系统设置',
      children: [
        { key: '/settings/accounts', label: '账号管理' },
        { key: '/settings/params', label: '系统参数' },
      ],
    },
  ];

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
            <span style={{ whiteSpace: 'nowrap' }}>{collapsed ? '慧' : '慧点单运营中台'}</span>
            <Button type="text" icon={collapsed ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#fff', fontSize: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Menu
              theme="dark" mode="inline"
              selectedKeys={selectedKeys}
              defaultOpenKeys={defaultOpenKeys}
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
            <Route path="/" element={<Tenants />} />
            <Route path="/settings" element={<AdminUsers />} />
            <Route path="/settings/accounts" element={<AdminUsers />} />
            <Route path="/settings/params" element={<SystemParams />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && window.location.pathname !== '/login') {
      // logged in, continue
    }
  }, [user]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('saas_token', token);
    localStorage.setItem('saas_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    setUser(null);
    navigate('/login');
  };

  // If logged in and at /login, redirect to /
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
