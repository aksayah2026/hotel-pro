import React, { useEffect, useState, Suspense } from 'react';
import api from '../api';

import {
  Card, Row, Col, Statistic, Typography, Table, Tag, message,
  List, Avatar, Space, Select, DatePicker, Button, Tooltip
} from 'antd';

import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  DollarCircleOutlined,
  WarningOutlined,
  FilterOutlined,
  DownloadOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
const RevenueChart = React.lazy(() => import('../components/RevenueChart'));
const PlanChart = React.lazy(() => import('../components/PlanChart'));
import dayjs from 'dayjs';
import { API_URL } from '../config';

const { Title, Text } = Typography;
const { Option } = Select;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];


interface DashboardData {
  stats: { totalTenants: number; activeTenants: number; inactiveTenants: number; totalRevenue: number };
  monthlyRevenue: any[];
  planWise: any[];
  tenantWise: any[];
  expiringSoon: any[];
  recentTenants: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    stats: { totalTenants: 0, activeTenants: 0, inactiveTenants: 0, totalRevenue: 0 },
    monthlyRevenue: [],
    planWise: [],
    tenantWise: [],
    expiringSoon: [],
    recentTenants: []
  });


  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [loadCharts, setLoadCharts] = useState(false);
  const [filter, setFilter] = useState({
    type: 'monthly',
    year: dayjs().year(),
    month: dayjs().month() + 1,
    planId: undefined
  });

  const handleExport = async () => {
    setExportLoading(true);
    message.loading({ content: 'Preparing report...', key: 'exporting' });
    try {
      const res = await api.get('/dashboard/super-admin/export', {
        params: filter,
        responseType: 'blob'
      });
      
      // Build precise Dynamic Filename matching filter state
      let formattedName = `Executive_Overview_Year_${filter.year}.csv`;
      if (filter.type === 'monthly') {
        const monthStr = dayjs().month(filter.month - 1).format('MMMM');
        formattedName = `Executive_Overview_${monthStr}_${filter.year}.csv`;
      }

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', formattedName);
      document.body.appendChild(link);
      
      // Trigger Native Browser Save Stream
      link.click();
      
      // Clean cache to prevent Memory leak
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: 'Report downloaded successfully!', key: 'exporting', duration: 3 });
    } catch (err) {
      console.error('Dashboard export failed', err);
      message.error({ content: 'Failed to generate report. Please try again later.', key: 'exporting', duration: 3 });
    } finally {
      setExportLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/super-admin/stats', {
        params: filter
      });
      setData(res.data.data);
    } catch (err) {
      // Error is handled globally in api.ts interceptor
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadCharts(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const columns = [
    {
      title: 'Business',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: any) => (
        <Tag color={
          record.status === 'ACTIVE' ? 'success' :
            record.status === 'EXPIRED' ? 'error' :
              record.status === 'INACTIVE' ? 'default' :
                'processing'
        }>
          {(record.status || 'N/A').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_: any, record: any) => {
        const sub = record.subscriptions?.[0];
        return sub ? new Date(sub.endDate).toLocaleDateString() : '-';
      }
    }
  ];

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Executive Overview</Title>
          <Text type="secondary">Real-time platform performance and platform revenue analytics</Text>
        </div>
        <Space size="middle">
          <Select
            value={filter.type}
            onChange={(val) => setFilter({ ...filter, type: val })}
            style={{ width: 120 }}
          >
            <Option value="monthly">Monthly</Option>
            <Option value="yearly">Yearly</Option>
          </Select>

          {filter.type === 'monthly' ? (
            <DatePicker
              picker="month"
              value={dayjs().year(filter.year).month(filter.month - 1)}
              onChange={(date) => setFilter({ ...filter, year: date?.year(), month: (date?.month() || 0) + 1 })}
              allowClear={false}
            />
          ) : (
            <DatePicker
              picker="year"
              value={dayjs().year(filter.year)}
              onChange={(date) => setFilter({ ...filter, year: date?.year() })}
              allowClear={false}
            />
          )}

          <Button 
            icon={<DownloadOutlined />} 
            loading={exportLoading} 
            onClick={handleExport}
          >
            Export
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card" loading={loading}>
            <Statistic
              title="Total Businesses"
              value={data.stats.totalTenants ?? 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Tooltip title="Total subscription payments received from all hotels">
              <Statistic
                title={<span>SaaS Revenue <DollarCircleOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></span>}
                value={data.stats.totalRevenue ?? 0}
                precision={0}
                prefix={<Text style={{ color: '#52c41a', marginRight: 4 }}>₹</Text>}
                valueStyle={{ color: '#52c41a' }}
              />
            </Tooltip>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Statistic
              title="Active Licenses"
              value={data.stats.activeTenants ?? 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Statistic
              title="Inactive/Expired"
              value={data.stats.inactiveTenants ?? 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="Revenue Growth Trend" variant="borderless" extra={<Text type="secondary">Financial Year {filter.year}</Text>}>
            <div style={{ height: 300 }}>
              <Suspense fallback={<div style={{ textAlign: 'center', paddingTop: '40px' }}>Loading chart...</div>}>
                {loadCharts && <RevenueChart data={data.monthlyRevenue} />}
              </Suspense>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Plan Breakdown" variant="borderless">
            <div style={{ height: 300 }}>
              <Suspense fallback={<div style={{ textAlign: 'center', paddingTop: '40px' }}>Loading chart...</div>}>
                {loadCharts && <PlanChart data={data.planWise} />}
              </Suspense>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="Recently Joined Hotels" variant="borderless" extra={<CalendarOutlined />}>
            <Table
              columns={columns}
              dataSource={data.recentTenants}
              pagination={false}
              loading={loading}
              rowKey="id"
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Expiring Soon (7 Days)"
            variant="borderless"
            extra={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            bodyStyle={{ padding: '0 24px' }}
          >
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={data.expiringSoon}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#fffbe6', color: '#faad14' }} />}
                    title={item.businessName}
                    description={`Expires: ${new Date(item.subscriptions[0].endDate).toLocaleDateString()}`}
                  />
                  <Tag color="warning">Renew</Tag>
                </List.Item>
              )}
              locale={{ emptyText: 'No urgent renewals' }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="Tenant-wise Revenue Breakdown" variant="borderless" extra={<Text type="secondary">Top 10 Contributors</Text>}>
            <Table
              dataSource={data.tenantWise}
              pagination={false}
              rowKey="businessName"
              size="middle"
              loading={loading}
              locale={{ emptyText: 'No revenue records found' }}
              columns={[
                {
                  title: 'Hotel Name',
                  dataIndex: 'businessName',
                  key: 'businessName',
                  render: (t, record) => {
                    const isDeleted = !!record.isDeleted;
                    const displayName = t || 'Deleted Tenant';
                    return (
                      <Space>
                        <Text strong type={isDeleted ? 'secondary' : undefined}>
                          {displayName}
                        </Text>
                        {isDeleted && <Tag color="error" style={{ fontSize: '10px' }}>Deleted</Tag>}
                      </Space>
                    );
                  }
                },
                {
                  title: 'Lifetime SaaS Revenue',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  render: (a, record) => {
                    const isDeleted = !!record.isDeleted;
                    return (
                      <Text style={{ color: isDeleted ? '#8c8c8c' : '#52c41a' }}>
                        ₹{Number(a || 0).toLocaleString('en-IN')}
                      </Text>
                    );
                  }
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

