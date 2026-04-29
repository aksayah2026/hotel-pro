import React, { useEffect, useState } from 'react';
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
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend 
} from 'recharts';
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
  const [filter, setFilter] = useState({
    type: 'monthly',
    year: dayjs().year(),
    month: dayjs().month() + 1,
    planId: undefined
  });

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
          
          <Button icon={<DownloadOutlined />}>Export</Button>
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#1890ff" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#1890ff' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Plan Breakdown" variant="borderless">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.planWise}>
                  <XAxis dataKey="plan" hide />
                  <YAxis hide />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {data.planWise.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
              rowKey="name"
              size="middle"
              loading={loading}
              locale={{ emptyText: 'No revenue records found' }}
              columns={[
                { title: 'Hotel Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
                { 
                  title: 'Lifetime SaaS Revenue', 
                  dataIndex: 'revenue', 
                  key: 'revenue', 
                  render: (a) => <Text style={{ color: '#52c41a' }}>₹{Number(a || 0).toLocaleString('en-IN')}</Text> 
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

