import React, { useState, useEffect } from 'react';
import api from '../api';
import dayjs from 'dayjs';
import CustomModal from '../components/CustomModal';

import {
  Table,
  Tag,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Tooltip
} from 'antd';

import {
  AppstoreAddOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DollarOutlined,
  LineChartOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface PlanStats {
  id: string;
  name: string;
  durationInDays: number;
  price: number;
  description: string;
  isActive: boolean;
  isTrial: boolean;
  createdAt: string;
  updatedAt: string;
  activeUsageCount: number;
  queuedUsageCount: number;
  estimatedRevenue: number;
}

export default function Plans() {
  const [plans, setPlans] = useState<PlanStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modal controls
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanStats | null>(null);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans');
      setPlans(res.data.data || []);
    } catch (err) {
      message.error('Failed to retrieve plans listing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Toggle active/inactive status
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/plans/${id}/status`, { isActive: !currentStatus });
      message.success(`Plan ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchPlans();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update plan status');
    }
  };

  // Create new plan
  const onCreatePlan = async (values: any) => {
    setSubmitLoading(true);
    try {
      await api.post('/plans', values);
      message.success('Subscription plan created successfully');
      setCreateVisible(false);
      form.resetFields();
      fetchPlans();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Plan creation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Edit plan
  const onEditPlan = async (values: any) => {
    if (!selectedPlan) return;
    setSubmitLoading(true);
    try {
      await api.put(`/plans/${selectedPlan.id}`, values);
      message.success('Plan details updated successfully');
      setEditVisible(false);
      fetchPlans();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update plan details');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClick = (plan: PlanStats) => {
    setSelectedPlan(plan);
    editForm.setFieldsValue({
      name: plan.name,
      durationInDays: plan.durationInDays,
      price: plan.price,
      description: plan.description,
      isActive: plan.isActive,
      isTrial: plan.isTrial
    });
    setEditVisible(true);
  };

  // Hard Delete plan
  const handleDeletePlan = async (id: string) => {
    try {
      await api.delete(`/plans/${id}`);
      message.success('Plan permanently deleted');
      fetchPlans();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Plan deletion failed');
    }
  };

  // Metrics calculations
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.isActive).length;
  const inactivePlans = totalPlans - activePlans;
  const activeTenantUsage = plans.reduce((sum, p) => sum + p.activeUsageCount, 0);
  const queuedUsage = plans.reduce((sum, p) => sum + p.queuedUsageCount, 0);
  const estimatedRevenue = plans.reduce((sum, p) => sum + p.estimatedRevenue, 0);

  const columns = [
    {
      title: 'Plan Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: PlanStats) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '15px' }}>{text}</Text>
          {record.isTrial && <Tag color="blue" style={{ marginTop: '2px' }}>Free Trial</Tag>}
        </Space>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'durationInDays',
      key: 'durationInDays',
      render: (days: number) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
          <Text>{days} Days</Text>
        </Space>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ color: price === 0 ? '#52c41a' : '#1890ff' }}>
          {price === 0 ? 'FREE' : `₹${price.toLocaleString('en-IN')}`}
        </Text>
      )
    },
    {
      title: 'Active Tenants',
      dataIndex: 'activeUsageCount',
      key: 'activeUsageCount',
      render: (count: number) => (
        <Tag color={count > 0 ? 'green' : 'default'} style={{ fontWeight: 'bold', borderRadius: '4px' }}>
          {count} Active
        </Tag>
      )
    },
    {
      title: 'Queued Queue',
      dataIndex: 'queuedUsageCount',
      key: 'queuedUsageCount',
      render: (count: number) => (
        <Tag color={count > 0 ? 'orange' : 'default'} style={{ fontWeight: 'bold', borderRadius: '4px' }}>
          {count} Queued
        </Tag>
      )
    },
    {
      title: 'Total Revenue',
      dataIndex: 'estimatedRevenue',
      key: 'estimatedRevenue',
      render: (rev: number) => (
        <Text strong style={{ color: '#2f54eb' }}>
          ₹{rev.toLocaleString('en-IN')}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: PlanStats) => (
        <Tooltip title={isActive ? "Plan is Active & Available for new signups/upgrades" : "Plan is Inactive & Hidden from sales catalog"}>
          <Space>
            <Switch
              checked={isActive}
              onChange={() => handleToggleStatus(record.id, isActive)}
              checkedChildren="Active"
              unCheckedChildren="Inactive"
            />
          </Space>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PlanStats) => {
        const isInUse = record.activeUsageCount > 0 || record.queuedUsageCount > 0;
        return (
          <Space size="middle">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleEditClick(record)}
            />
            {isInUse ? (
              <Tooltip title="This plan is currently assigned to active or queued subscriptions and cannot be deleted.">
                <Button
                  type="text"
                  danger
                  disabled
                  icon={<DeleteOutlined style={{ color: '#bfbfbf' }} />}
                />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Are you sure you want to delete this plan permanently?"
                description="This action cannot be undone. Expired or historical records remain untouched."
                onConfirm={() => handleDeletePlan(record.id)}
                okText="Delete Forever"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>💼 SaaS Subscription Plans</Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>Configure and manage your commercial HotelPro SaaS subscriptions catalog.</Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPlans}>Refresh</Button>
          <Button
            type="primary"
            icon={<AppstoreAddOutlined />}
            onClick={() => {
              form.resetFields();
              setCreateVisible(true);
            }}
          >
            Create New Plan
          </Button>
        </Space>
      </div>

      {/* Metrics Dashboard Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}><LineChartOutlined /> Total Active Plans</span>}
              value={activePlans}
              suffix={`/ ${totalPlans} Total`}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}><UsergroupAddOutlined /> Active Tenants</span>}
              value={activeTenantUsage}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}><ClockCircleOutlined /> Queued Upgrades</span>}
              value={queuedUsage}
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}><DollarOutlined /> Platform Revenue</span>}
              value={estimatedRevenue}
              prefix="₹"
              valueStyle={{ color: '#2f54eb', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Plans List Card */}
      <Card variant="borderless" style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={plans}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* CREATE NEW PLAN MODAL */}
      {createVisible && (
        <CustomModal
          title={<Title level={4} style={{ margin: 0 }}>💼 Create Subscription Plan</Title>}
          open={createVisible}
          onCancel={() => setCreateVisible(false)}
          onOk={() => form.submit()}
          confirmLoading={submitLoading}
          width={500}
          okText="Create Plan"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onCreatePlan}
            initialValues={{ price: 0, durationInDays: 30, isActive: true, isTrial: false }}
          >
            <Form.Item
              name="name"
              label="Plan Name"
              rules={[
                { required: true, message: 'Please enter plan name' },
                { min: 2, message: 'Plan name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g. 6 Months Premium" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="durationInDays"
                label="Duration (Days)"
                rules={[{ required: true, message: 'Please enter duration' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
              </Form.Item>

              <Form.Item
                name="price"
                label="Plan Price (₹)"
                rules={[{ required: true, message: 'Please enter plan price' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="5000" />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label="Description / Marketing Text"
            >
              <Input.TextArea placeholder="Provide highlights e.g. Unlimited rooms, full analytics package..." rows={3} />
            </Form.Item>

            <div style={{ display: 'flex', gap: '40px', marginTop: '16px' }}>
              <Form.Item name="isActive" label="Make Active?" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <Form.Item name="isTrial" label="Free Trial Plan?" valuePropName="checked">
                <Switch checkedChildren="Trial" unCheckedChildren="Standard" />
              </Form.Item>
            </div>
          </Form>
        </CustomModal>
      )}

      {/* EDIT PLAN MODAL */}
      {editVisible && (
        <CustomModal
          title={<Title level={4} style={{ margin: 0 }}>⚙️ Edit Plan Details</Title>}
          open={editVisible}
          onCancel={() => setEditVisible(false)}
          onOk={() => editForm.submit()}
          confirmLoading={submitLoading}
          width={500}
          okText="Save Changes"
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={onEditPlan}
          >
            <Form.Item
              name="name"
              label="Plan Name"
              rules={[
                { required: true, message: 'Please enter plan name' },
                { min: 2, message: 'Plan name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g. 6 Months Premium" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="durationInDays"
                label="Duration (Days)"
                rules={[{ required: true, message: 'Please enter duration' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="30" />
              </Form.Item>

              <Form.Item
                name="price"
                label="Plan Price (₹)"
                rules={[{ required: true, message: 'Please enter plan price' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="5000" />
              </Form.Item>
            </div>

            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea placeholder="Details..." rows={3} />
            </Form.Item>

            <div style={{ display: 'flex', gap: '40px', marginTop: '16px' }}>
              <Form.Item name="isActive" label="Make Active?" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>

              <Form.Item name="isTrial" label="Free Trial Plan?" valuePropName="checked">
                <Switch checkedChildren="Trial" unCheckedChildren="Standard" />
              </Form.Item>
            </div>
          </Form>
        </CustomModal>
      )}
    </div>
  );
}
