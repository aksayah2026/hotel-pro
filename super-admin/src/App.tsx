import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space } from 'antd';
import { 
  DashboardOutlined, 
  TeamOutlined, 
  UserAddOutlined, 
  LogoutOutlined,
  BankOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import CreateTenant from './pages/CreateTenant';
import Login from './pages/Login';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

function AppContent({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = window.innerWidth < 768;

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Overview</Link>,
    },
    {
      key: '/tenants',
      icon: <TeamOutlined />,
      label: <Link to="/tenants">Tenants</Link>,
    },
    {
      key: '/create-tenant',
      icon: <UserAddOutlined />,
      label: <Link to="/create-tenant">Onboard New</Link>,
    },
  ];


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null}
        collapsible 
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        theme="dark"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          zIndex: 100,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo Section */}
          <div style={{ padding: collapsed ? '24px 0' : '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <BankOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            {!collapsed && <Title level={4} style={{ color: 'white', margin: 0 }}>HotelPro</Title>}
          </div>

          {/* Navigation Section (Takes remaining space) */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Menu 
              theme="dark" 
              mode="inline" 
              selectedKeys={[location.pathname]} 
              items={menuItems} 
              style={{ padding: '16px 0', borderRight: 0 }}
            />
          </div>

          {/* Logout Section (Always at bottom) */}
          <div style={{ padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
            <Button 
              type="text" 
              danger 
              icon={<LogoutOutlined />} 
              onClick={onLogout}
              style={{ width: '100%', color: 'rgba(255,255,255,0.65)', textAlign: collapsed ? 'center' : 'left', padding: collapsed ? '0' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              {!collapsed && "Logout"}
            </Button>
          </div>
        </div>
      </Sider>
      
      {/* Main Layout */}
      <Layout style={{ 
        marginLeft: collapsed ? (isMobile ? 0 : 80) : 200, 
        transition: 'margin-left 0.2s',
        minHeight: '100vh'
      }}>
        <Header className="glass-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 90,
          width: '100%'
        }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            <Text strong style={{ fontSize: '16px' }}>Super Admin Panel</Text>
          </Space>
          <Space>
             <Text type="secondary" style={{ fontSize: '12px', display: isMobile ? 'none' : 'inline' }}>System Active</Text>
             <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#52c41a' }} />
          </Space>
        </Header>
        
        <Content style={{ 
          margin: isMobile ? '16px' : '24px', 
          minHeight: 280,
          overflow: 'initial' 
        }} className="fade-in-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/create-tenant" element={<CreateTenant />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>

  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  if (!token) {
    return <Login onLogin={(t) => setToken(t)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <Router>
      <AppContent onLogout={handleLogout} />
    </Router>
  );
}

export default App;
