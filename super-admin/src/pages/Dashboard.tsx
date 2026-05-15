import React, { useEffect, useState, Suspense } from 'react';
import api from '../api';

import {
  Card, Row, Col, Statistic, Typography, Table, Tag, message,
  Avatar, Space, Select, DatePicker, Button, Tooltip, Flex, Empty, Spin,
  Input
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
  CloseCircleOutlined,
  InboxOutlined,
  SearchOutlined
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
    month: dayjs().month() + 1
  });

  const [tableData, setTableData] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [search, setSearch] = useState('');
  const [sorter, setSorter] = useState({ field: 'revenue', order: 'descend' });

  const handleExport = async () => {
    setExportLoading(true);
    message.loading({ content: 'Preparing report...', key: 'exporting' });
    try {
      const res = await api.get('/dashboard/super-admin/export', {
        params: {
          ...filter,
          search,
          sortBy: sorter.field,
          sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc'
        },
        responseType: 'blob'
      });
      
      let formattedName = `Executive_Overview_Year_${filter.year}.csv`;
      if (filter.type === 'monthly') {
        const monthStr = dayjs().month(filter.month - 1).format('MMMM');
        formattedName = `Executive_Overview_${monthStr}_${filter.year}.csv`;
      } else if (filter.type === 'all') {
        formattedName = `Executive_Overview_All_Time.csv`;
      }

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', formattedName);
      document.body.appendChild(link);
      link.click();
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
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async (page = 1, limit = 10, searchStr = '', sort = sorter) => {
    setTableLoading(true);
    try {
      const res = await api.get('/dashboard/super-admin/revenue', {
        params: {
          ...filter,
          page,
          limit,
          search: searchStr,
          sortBy: sort.field,
          sortOrder: sort.order === 'ascend' ? 'asc' : 'desc'
        }
      });
      setTableData(res.data.data);
      setPagination({
        ...pagination,
        current: res.data.pagination.page,
        total: res.data.pagination.total,
        pageSize: res.data.pagination.limit
      });
    } catch (err) {
    } finally {
      setTableLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
    fetchRevenueData(1, pagination.pageSize, search, sorter);
  }, [filter]);

  const onTableChange = (newPagination: any, filters: any, newSorter: any) => {
    const s = Array.isArray(newSorter) ? newSorter[0] : newSorter;
    const sortParams = s.field ? { field: s.field, order: s.order } : { field: 'revenue', order: 'descend' };
    setSorter(sortParams);
    fetchRevenueData(newPagination.current, newPagination.pageSize, search, sortParams);
  };

  const onSearch = (value: string) => {
    setSearch(value);
    fetchRevenueData(1, pagination.pageSize, value, sorter);
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>Executive Overview</Title>
          <Text type="secondary" style={{ fontSize: '15px' }}>Real-time platform performance and revenue analytics across all business units</Text>
        </div>
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
          <Card variant="borderless" className="stat-card" loading={loading}>
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
          <Card variant="borderless" className="stat-card" loading={loading}>
            <Statistic
              title="Active Licenses"
              value={data.stats.activeTenants ?? 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="stat-card" loading={loading}>
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
            styles={{ body: { padding: '12px 24px' } }}
          >
            <Flex vertical gap="small">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '24px' }}><Spin /></div>
              ) : data.expiringSoon.length > 0 ? (
                data.expiringSoon.map((item: any) => (
                  <Flex key={item.id} align="center" justify="space-between" style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <Flex gap="middle" align="center">
                      <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#fffbe6', color: '#faad14' }} />
                      <div>
                        <Text strong style={{ display: 'block' }}>{item.businessName}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Expires: {new Date(item.subscriptions[0].endDate).toLocaleDateString()}
                        </Text>
                      </div>
                    </Flex>
                    <Tag color="warning">Renew</Tag>
                  </Flex>
                ))
              ) : (
                <Empty description="No urgent renewals" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Flex>
          </Card>
        </Col>
      </Row>
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            title="Tenant-wise Revenue Breakdown" 
            variant="borderless" 
            extra={
              <Flex gap="small" wrap="wrap" align="center" className="dashboard-toolbar">
                <Input
                  placeholder="Search hotels..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf', marginRight: 4 }} />}
                  onChange={(e) => onSearch(e.target.value)}
                  className="modern-input"
                  style={{ width: 220 }}
                  allowClear
                />
                
                <Select
                  value={filter.type}
                  onChange={(val) => setFilter({ ...filter, type: val })}
                  style={{ width: 110 }}
                  className="modern-select"
                >
                  <Option value="monthly">Monthly</Option>
                  <Option value="yearly">Yearly</Option>
                  <Option value="all">All Time</Option>
                </Select>

                {filter.type === 'monthly' && (
                  <DatePicker
                    picker="month"
                    value={dayjs().year(filter.year).month(filter.month - 1)}
                    onChange={(date) => setFilter({ ...filter, year: date?.year() || dayjs().year(), month: (date?.month() || 0) + 1 })}
                    allowClear={false}
                    className="modern-datepicker"
                    style={{ width: 140 }}
                  />
                )}
                
                {filter.type === 'yearly' && (
                  <DatePicker
                    picker="year"
                    value={dayjs().year(filter.year)}
                    onChange={(date) => setFilter({ ...filter, year: date?.year() || dayjs().year() })}
                    allowClear={false}
                    className="modern-datepicker"
                    style={{ width: 110 }}
                  />
                )}

                <Button 
                  icon={<DownloadOutlined />} 
                  loading={exportLoading} 
                  onClick={handleExport}
                  type="primary"
                  className="modern-button"
                >
                  Export
                </Button>
              </Flex>
            }
          >
             <Table
               dataSource={tableData}
               pagination={{
                 ...pagination,
                 showSizeChanger: true,
                 pageSizeOptions: ['10', '25', '50', '100'],
                 showTotal: (total) => `Total ${total} hotels`
               }}
               onChange={onTableChange}
               rowKey="id"
               size="middle"
               loading={tableLoading}
               locale={{ emptyText: 'No revenue records found' }}
               rowClassName={(record: any) => {
                 const isDeleted = !!record.isDeleted || record.businessName === 'Deleted Tenant';
                 return isDeleted ? 'archived-row' : '';
               }}
               columns={[
                 {
                   title: 'Hotel Name',
                   dataIndex: 'businessName',
                   key: 'businessName',
                   sorter: true,
                   render: (t, record: any) => {
                     const isDeleted = !!record.isDeleted || record.businessName === 'Deleted Tenant';
                     const displayName = t || 'Deleted Tenant';
                     return (
                       <Space align="center">
                         {isDeleted && <InboxOutlined style={{ color: '#8c8c8c' }} />}
                         <Text 
                           strong={!isDeleted} 
                           delete={isDeleted} 
                           type={isDeleted ? 'secondary' : undefined}
                           style={{ maxWidth: 250 }}
                           ellipsis
                         >
                           {displayName}
                         </Text>
                       </Space>
                     );
                   }
                 },
                 {
                   title: 'Revenue',
                   dataIndex: 'revenue',
                   key: 'revenue',
                   sorter: true,
                   render: (a, record: any) => {
                     const isDeleted = !!record.isDeleted || record.businessName === 'Deleted Tenant';
                     return (
                       <Text style={{ color: isDeleted ? '#8c8c8c' : '#52c41a', whiteSpace: 'nowrap', fontWeight: isDeleted ? 400 : 600 }}>
                         ₹{Number(a || 0).toLocaleString('en-IN')}
                       </Text>
                     );
                   }
                 },
                 {
                    title: 'Current Plan',
                    dataIndex: 'plan',
                    key: 'plan',
                    render: (p) => <Tag color="blue">{p || 'N/A'}</Tag>
                 },
                 {
                   title: 'Status',
                   key: 'status',
                   render: (_, record: any) => {
                     const isDeleted = !!record.isDeleted || record.businessName === 'Deleted Tenant';
                     return (
                       <Tag 
                         bordered={false}
                         color={isDeleted ? 'default' : 'success'}
                         icon={isDeleted ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                         style={{ borderRadius: '4px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}
                       >
                         {isDeleted ? 'Archived' : 'Active'}
                       </Tag>
                     );
                   }
                 },
                 {
                   title: 'Created Date',
                   dataIndex: 'createdAt',
                   key: 'createdAt',
                   sorter: true,
                   render: (d) => dayjs(d).format('DD MMM YYYY')
                 }
               ]}
             />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
