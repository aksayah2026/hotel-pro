import React, { useEffect, useState, Suspense } from 'react';
import api from '../api';
import {
  Card, Row, Col, Statistic, Typography, Table, Tag,
  Space, Select, DatePicker, Button, Tooltip, Empty, message
} from 'antd';
import {
  DollarCircleOutlined,
  LineChartOutlined,
  HistoryOutlined,
  DownloadOutlined,
  BankOutlined,
  BarChartOutlined
} from '@ant-design/icons';
const RevenueChart = React.lazy(() => import('../components/RevenueChart'));
const PlanChart = React.lazy(() => import('../components/PlanChart'));
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PlatformRevenue() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [loadCharts, setLoadCharts] = useState(false);
  const [year, setYear] = useState(dayjs().year());

  const handleExport = async () => {
    setExportLoading(true);
    message.loading({ content: 'Preparing revenue report...', key: 'revExport' });
    try {
      const res = await api.get('/dashboard/super-admin/export', {
        params: { type: 'yearly', year },
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Executive_Revenue_Report_${year}.csv`);
      document.body.appendChild(link);
      
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: 'Revenue report downloaded successfully!', key: 'revExport', duration: 3 });
    } catch (err) {
      console.error('Export error:', err);
      message.error({ content: 'Failed to generate report. Please try again.', key: 'revExport', duration: 3 });
    } finally {
      setExportLoading(false);
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/super-admin/stats', { params: { year } });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [year]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadCharts(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!data && !loading) return <Empty description="Failed to load revenue data" />;

  const stats = data?.stats || {};

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Platform Revenue Dashboard</Title>
          <Text type="secondary">Monitor SaaS subscription earnings and billing performance.</Text>
        </div>
        <Space>
          <DatePicker
            picker="year"
            value={dayjs(`${year}-01-01`)}
            onChange={(date) => setYear(date?.year() || dayjs().year())}
            allowClear={false}
          />
          <Button 
            icon={<DownloadOutlined />} 
            loading={exportLoading}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Statistic
              title={<span>Total SaaS Revenue (Lifetime) <DollarCircleOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></span>}
              value={stats.totalRevenue ?? 0}
              precision={2}
              prefix={<Text style={{ color: '#52c41a', marginRight: 4 }}>₹</Text>}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Statistic
              title="Active Subscriptions"
              value={stats.activeTenants ?? 0}
              prefix={<BankOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false} className="stat-card" loading={loading}>
            <Statistic
              title="Avg. Revenue Per User"
              value={stats.totalRevenue / (stats.totalTenants || 1)}
              precision={2}
              prefix="₹"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={16}>
          <Card title={<span><LineChartOutlined /> Revenue Trend ({year})</span>} bordered={false}>
            <div style={{ height: 350 }}>
              <Suspense fallback={<div style={{ textAlign: 'center', paddingTop: '40px' }}>Loading chart...</div>}>
                {loadCharts && <RevenueChart data={data?.monthlyRevenue || []} />}
              </Suspense>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<span><BarChartOutlined /> Plan Breakdown</span>} bordered={false}>
            <div style={{ height: 350 }}>
              <Suspense fallback={<div style={{ textAlign: 'center', paddingTop: '40px' }}>Loading chart...</div>}>
                {loadCharts && <PlanChart data={data?.planWise || []} />}
              </Suspense>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title={<span><HistoryOutlined /> Top Contributing Businesses</span>} bordered={false}>
            <Table
              dataSource={data?.tenantWise}
              loading={loading}
              columns={[
                { 
                  title: 'Business Name', 
                  dataIndex: 'businessName', 
                  key: 'businessName',
                  render: (t: string, record: any) => {
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
                  title: 'Platform Contribution',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  render: (val, record: any) => {
                    const isDeleted = !!record.isDeleted;
                    return (
                      <Text strong style={{ color: isDeleted ? '#8c8c8c' : undefined }}>
                        ₹{val.toLocaleString()}
                      </Text>
                    );
                  }
                },
                {
                  title: 'Status',
                  key: 'status',
                  render: (_, record: any) => (
                    record.isDeleted 
                      ? <Tag color="default">Deleted</Tag>
                      : <Tag color="success">Paid</Tag>
                  )
                }
              ]}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
