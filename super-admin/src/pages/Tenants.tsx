
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);


import { 
  Table, 
  Tag, 
  Space, 
  Button, 
  Drawer, 
  Descriptions, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Typography,
  Card,
  Popconfirm,
  Tooltip,
  Switch,
  List
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  HistoryOutlined,
  BarChartOutlined,
  ContainerOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Tabs } from 'antd';

const { TabPane } = Tabs;



const { Title, Text } = Typography;

interface Plan {
  id: string;
  name: string;
  price: number;
  durationInDays: number;
  isTrial: boolean;
}



interface Tenant {
  id: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  isActive: boolean;
  isBlocked: boolean;
  accessLevel: string;
  isSystem: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  totalBookings: number;
  totalRevenue: number;
  subscriptions: any[];
}

export default function Tenants() {

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);


  
  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [planId, setPlanId] = useState('all');
  const [sort, setSort] = useState('latest');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // History states
  const [payments, setPayments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Drawer & Modal states
  const [viewVisible, setViewVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const [form] = Form.useForm();
  const [deleteForm] = Form.useForm();

  const fetchTenants = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(planId !== 'all' && { planId }),
        ...(sort !== 'latest' && { sort }),
        expiringSoon: expiringSoon.toString()
      };

      const res = await api.get('/tenants', { params });
      setTenants(res.data.data);

      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total
      });
    } catch (err) {
      message.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/tenants/plans');
      setPlans(res.data.data);
    } catch (err) {
      console.error('Failed to fetch plans');
    }
  };


  useEffect(() => {
    fetchPlans();
  }, []);

  // Debounced Search & Filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants(1, pagination.pageSize);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, status, planId]);

  const handleTableChange = (newPagination: any) => {
    fetchTenants(newPagination.current, newPagination.pageSize);
  };


  const handleView = async (record) => {
    console.log('Fetching history for tenant:', record.id, record.businessName);
    setSelectedTenant(record);
    setViewVisible(true);
    setHistoryLoading(true);
    try {
      const [payRes, logRes] = await Promise.all([
        api.get(`/saas-payments/tenant/${record.id}`),
        api.get(`/audit-logs?tenantId=${record.id}`)
      ]);
      setPayments(payRes.data.data);
      setLogs(logRes.data.data);
    } catch (err) {
      console.error('Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = (record) => {
    setSelectedTenant(record);
    const latestSub = record.subscriptions?.[0];
    form.setFieldsValue({
      businessName: record.businessName,
      ownerName: record.ownerName,
      address: record.address,
      phoneNumber: record.phoneNumber,
      mobile: record.mobile,
      planId: latestSub?.planId
    });
    setEditVisible(true);
  };

  const handleDeleteClick = (record) => {
    setSelectedTenant(record);
    deleteForm.resetFields();
    setDeleteVisible(true);
  };

  const onUpdate = async (values) => {
    setSubmitLoading(true);
    try {
      await api.put(`/tenants/${selectedTenant.id}`, values);
      message.success('Tenant updated successfully');
      setEditVisible(false);
      fetchTenants();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const onDelete = async (values) => {
    setSubmitLoading(true);
    try {
      await api.delete(`/tenants/${selectedTenant.id}`, {
        data: values
      });
      message.success('Tenant deleted successfully');
      setDeleteVisible(false);
      fetchTenants();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Deletion failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusChange = async (id, isActive) => {
    try {
      await api.patch(`/tenants/${id}/status`, { isActive });
      message.success(`Tenant ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchTenants();
    } catch (err) {
      message.error('Failed to update status');
    }
  };

  const columns = [
    {
      title: 'Business Name',
      dataIndex: 'businessName',
      key: 'businessName',
      render: (text, record) => {
        const isSystem = record.isSystem || record.businessName === 'HotelPro Systems';
        return (
          <Space>
            <Text strong>{text}</Text>
            {isSystem && <Tag color="gold" style={{ fontWeight: 'bold' }}>SYSTEM</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Owner',
      dataIndex: 'ownerName',
      key: 'ownerName',
    },
    {
      title: 'Activity',
      key: 'activity',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '12px' }} type="secondary">Login: {record.lastLoginAt ? dayjs(record.lastLoginAt).fromNow() : 'Never'}</Text>
          <Text style={{ fontSize: '12px' }} type="secondary">Bookings: {record.totalBookings || 0}</Text>
        </Space>
      )
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_, record) => {
        const isSystem = record.isSystem || record.businessName === 'HotelPro Systems';
        if (isSystem) return <Tag color="gold">Unlimited</Tag>;

        const sub = record.subscriptions?.[0];
        const plan = sub?.plan;
        
        if (!plan) return <Tag>N/A</Tag>;

        let color = plan.isTrial ? 'blue' : 'green';
        if (record.status === 'EXPIRED') color = 'red';

        return <Tag color={color}>{plan.name}</Tag>;
      }
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_, record) => {
        const isSystem = record.isSystem || record.businessName === 'HotelPro Systems';
        if (isSystem) return <Tag color="blue">Unlimited</Tag>;
        
        const sub = record.subscriptions?.[0];
        return sub ? new Date(sub.endDate).toLocaleDateString() : '-';
      }
    },
    {
      title: 'Active',
      key: 'isActive',
      render: (_, record) => {
        const isSystem = record.isSystem || record.businessName === 'HotelPro Systems';
        return (
          <Switch 
            checked={record.isActive} 
            onChange={(checked) => handleStatusChange(record.id, checked)}
            size="small"
            disabled={isSystem}
          />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isSystem = record.isSystem || record.businessName === 'HotelPro Systems';
        return (
          <Space size="small">
            <Tooltip title="View Details">
              <Button 
                type="primary" 
                ghost 
                icon={<EyeOutlined />} 
                onClick={() => handleView(record)}
              />
            </Tooltip>
            <Tooltip title={isSystem ? "System tenant cannot be modified" : "Edit Tenant"}>
              <Button 
                icon={<EditOutlined />} 
                onClick={() => !isSystem && handleEdit(record)}
                disabled={isSystem}
              />
            </Tooltip>
            {isSystem ? (
              <Tooltip title="Protected system tenant">
                <div style={{ padding: '4px 15px', color: '#999' }}>
                  <LockOutlined style={{ fontSize: 18 }} />
                </div>
              </Tooltip>
            ) : (
              <Tooltip title="Delete Tenant">
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDeleteClick(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },

    },
  ];

  const navigate = useNavigate();

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Tenant Management</Title>
          <Text type="secondary">View and manage all hotel business accounts</Text>
        </div>
        <Button type="primary" size="large" onClick={() => navigate('/create-tenant')}>
          Onboard New Hotel
        </Button>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size="middle">
            <Input 
              placeholder="Search business, owner, or mobile..." 
              style={{ width: 300 }} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              prefix={<ReloadOutlined style={{ color: '#bfbfbf' }} />}
            />
            <Select 
              value={status} 
              onChange={setStatus} 
              style={{ width: 150 }}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Expired', value: 'EXPIRED' },
                { label: 'Disabled', value: 'DISABLED' },
                { label: 'System', value: 'SYSTEM' },
              ]}
            />
            <Select 
              value={planId} 
              onChange={setPlanId} 
              style={{ width: 180 }}
              placeholder="Filter by Plan"
            >
              {plans.map((plan: any) => (
                <Select.Option key={plan.id} value={plan.id}>{plan.name}</Select.Option>
              ))}
            </Select>
            <Select 
              value={sort} 
              onChange={setSort} 
              style={{ width: 150 }}
              options={[
                { label: 'Latest Joined', value: 'latest' },
                { label: 'Highest Revenue', value: 'highestRevenue' },
                { label: 'Expiring Soon', value: 'expiringSoon' },
              ]}
            />
            <Tooltip title="Tenants expiring in next 7 days">
              <Switch 
                checked={expiringSoon} 
                onChange={setExpiringSoon} 
                unCheckedChildren="Expiring" 
                checkedChildren="Expiring" 
              />
            </Tooltip>
            <Button onClick={() => { setSearch(''); setStatus('all'); setPlanId('all'); setSort('latest'); setExpiringSoon(false); }}>Reset</Button>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchTenants(pagination.current, pagination.pageSize)}>
            Refresh
          </Button>
        </Space>
      </Card>

      <Card variant="borderless">
        <Table 
          columns={columns} 
          dataSource={tenants} 
          rowKey="id" 
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} tenants`
          }}
          onChange={handleTableChange}
          rowClassName={(record) => (record.isSystem || record.businessName === 'HotelPro Systems') ? 'system-row' : ''}
        />
      </Card>


      {/* VIEW DRAWER */}
      <Drawer
        title={<Title level={4} style={{ margin: 0 }}>{selectedTenant?.businessName} - Detailed View</Title>}
        width={800}
        onClose={() => setViewVisible(false)}
        open={viewVisible}
      >
        {selectedTenant && (
          <Tabs defaultActiveKey="info">
            <TabPane tab={<span><EyeOutlined /> General Info</span>} key="info">
              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Descriptions title="Business Information" bordered column={1}>
                  <Descriptions.Item label="Business Name">{selectedTenant.businessName}</Descriptions.Item>
                  <Descriptions.Item label="Owner Name">{selectedTenant.ownerName}</Descriptions.Item>
                  <Descriptions.Item label="Address">{selectedTenant.address}</Descriptions.Item>
                  <Descriptions.Item label="Phone Number">{selectedTenant.phoneNumber}</Descriptions.Item>
                  <Descriptions.Item label="Access Level">
                    <Tag color={selectedTenant.accessLevel === 'FULL' ? 'green' : selectedTenant.accessLevel === 'READ_ONLY' ? 'orange' : 'red'}>
                      {selectedTenant.accessLevel}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>

                <Descriptions title="Subscription Details" bordered column={1}>
                  {selectedTenant.subscriptions?.[0] ? (
                    <>
                      <Descriptions.Item label="Current Plan">{selectedTenant.subscriptions[0].plan?.name}</Descriptions.Item>
                      <Descriptions.Item label="Expiry Date">{new Date(selectedTenant.subscriptions[0].endDate).toLocaleDateString()}</Descriptions.Item>
                    </>
                  ) : (
                    <Descriptions.Item label="Status">No Active Subscription</Descriptions.Item>
                  )}
                </Descriptions>
              </Space>
            </TabPane>
            
            <TabPane tab={<span><DollarCircleOutlined /> Payments</span>} key="payments">
              <Table 
                dataSource={payments} 
                loading={historyLoading}
                rowKey="id"
                columns={[
                  { title: 'Date', dataIndex: 'paidAt', render: d => dayjs(d).format('DD MMM YYYY') },
                  { title: 'Plan', dataIndex: ['plan', 'name'] },
                  { title: 'Amount', dataIndex: 'amount', render: a => `₹${a}` },
                  { title: 'Method', dataIndex: 'method' },
                  { title: 'Invoice', render: (_, r) => r.invoice ? <Tag color="blue">{r.invoice.invoiceNumber}</Tag> : '-' }
                ]}
              />
            </TabPane>

            <TabPane tab={<span><HistoryOutlined /> Audit Logs</span>} key="logs">
              <List
                loading={historyLoading}
                dataSource={logs}
                renderItem={item => {
                  const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                  const labelMap = {
                    businessName: 'Business Name',
                    ownerName: 'Owner',
                    planId: 'Plan ID',
                    address: 'Address',
                    phoneNumber: 'Phone',
                    status: 'Status',
                    isActive: 'Active Status'
                  };

                  return (
                    <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #f0f0f0', padding: '16px 0' }}>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>{item.action.replace(/_/g, ' ')}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(item.createdAt).format('DD MMM, hh:mm A')}
                        </Text>
                      </div>
                      
                      <div style={{ paddingLeft: '8px', borderLeft: '2px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                          Performed by: <Text strong>{item.user?.name || 'System'}</Text>
                        </Text>
                        
                        {details && Object.keys(details).length > 0 && (
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
                            {Object.entries(details).map(([key, val]) => (
                              <React.Fragment key={key}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>{labelMap[key] || key}:</Text>
                                <Text style={{ fontSize: '12px', wordBreak: 'break-all' }}>{String(val)}</Text>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    </List.Item>
                  );
                }}
              />
            </TabPane>
          </Tabs>
        )}
      </Drawer>

      {/* EDIT MODAL */}
      <Modal
        title="Edit Tenant Details"
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={submitLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onUpdate}
        >
          <Title level={5}>Business Details</Title>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="ownerName" label="Owner Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          
          <Form.Item name="address" label="Address" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Title level={5} style={{ marginTop: '16px' }}>Login Details</Title>
          <Form.Item name="mobile" label="Mobile Number (Unique)">
            <Input disabled />
          </Form.Item>
          <Form.Item name="password" label="Reset Password (Optional)">
            <Input.Password placeholder="Leave blank to keep current" />
          </Form.Item>

          <Title level={5} style={{ marginTop: '16px' }}>Subscription</Title>
          <Form.Item name="planId" label="Assign New Plan (Optional)">
            <Select placeholder="Select a plan to extend/change">
              <Select.Option value={null}>No change</Select.Option>
              {plans.map(plan => (
                <Select.Option key={plan.id} value={plan.id}>
                  <Space>
                    {plan.name} - {plan.durationInDays} Days (₹{plan.price})
                    {plan.isTrial && <Tag color="green">Free Trial</Tag>}
                  </Space>
                </Select.Option>
              ))}

            </Select>
          </Form.Item>

        </Form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        title={<span><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} /> Delete Tenant</span>}
        open={deleteVisible}
        onCancel={() => setDeleteVisible(false)}
        onOk={() => deleteForm.submit()}
        confirmLoading={submitLoading}
        okText="Confirm Delete"
        okButtonProps={{ danger: true }}
      >
        {selectedTenant && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ backgroundColor: '#fff2f0', border: '1px solid #ffccc7', padding: '12px', borderRadius: '8px' }}>
              <Text type="danger" strong>Warning: Permanent Action</Text>
              <br />
              <Text type="secondary">
                You are about to delete <Text strong>{selectedTenant.businessName}</Text>. 
                This will deactivate all users and hide the business from the system.
              </Text>
            </div>
            
            <Form
              form={deleteForm}
              layout="vertical"
              onFinish={onDelete}
            >
              <Form.Item 
                name="reason" 
                label="Reason for Deletion" 
                rules={[
                  { required: true, message: 'Please provide a reason' },
                  { min: 5, message: 'Reason must be at least 5 characters' }
                ]}
              >
                <Input.TextArea placeholder="e.g. Business closed, Contract terminated..." rows={3} />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>
    </div>
  );
}
