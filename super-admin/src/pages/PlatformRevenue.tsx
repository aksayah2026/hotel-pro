import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
  Card, Row, Col, Statistic, Typography, Table, Tag, 
  Space, Select, DatePicker, Button, Tooltip, Empty
} from 'antd';
import { 
  DollarCircleOutlined, 
  LineChartOutlined,
  HistoryOutlined,
  DownloadOutlined,
  BankOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend 
} from 'recharts';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PlatformRevenue() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(dayjs().year());

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
          <Button icon={<DownloadOutlined />}>Export Report</Button>
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip formatter={(val: any) => `₹${val.toLocaleString()}`} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#1890ff" 
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={<span><BarChartOutlined /> Plan Breakdown</span>} bordered={false}>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.planWise}>
                  <XAxis dataKey="plan" hide />
                  <YAxis />
                  <RechartsTooltip formatter={(val: any) => `₹${val.toLocaleString()}`} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {data?.planWise.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
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
                { title: 'Business Name', dataIndex: 'name', key: 'name' },
                { 
                  title: 'Platform Contribution', 
                  dataIndex: 'saasRevenue', 
                  key: 'saasRevenue',
                  render: (val) => <Text strong>₹{val.toLocaleString()}</Text>
                },
                {
                   title: 'Status',
                   key: 'status',
                   render: () => <Tag color="success">Paid</Tag>
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
