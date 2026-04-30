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
  MenuUnfoldOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Result } from 'antd';

// BUG-005 & BUG-009: Lazy Loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Tenants = React.lazy(() => import('./pages/Tenants'));
const CreateTenant = React.lazy(() => import('./pages/CreateTenant'));
const Login = React.lazy(() => import('./pages/Login'));

// BUG-011: NotFound Page
const NotFound = () => (
  <Result
    status="404"
    title="404"
    subTitle="Sorry, the page you visited does not exist."
    extra={<Button type="primary"><Link to="/">Back Home</Link></Button>}
  />
);

// BUG-011: Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <WarningOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
          <Title level={3}>Something went wrong.</Title>
          <Button type="primary" onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <React.Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="loader">Loading...</div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/create-tenant" element={<CreateTenant />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
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
    <ErrorBoundary>
      <Router>
        <React.Suspense fallback={<div>Loading...</div>}>
          <AppContent onLogout={handleLogout} />
        </React.Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
