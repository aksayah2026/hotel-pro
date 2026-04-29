import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Typography, 
  message, 
  Divider,
  Row,
  Col,
  Tag,
  Space
} from 'antd';

import { UserAddOutlined, SaveOutlined } from '@ant-design/icons';
import { API_URL } from '../config';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface Plan {
  id: string;
  name: string;
  price: number;
  durationInDays: number;
  isTrial: boolean;
}


export default function CreateTenant() {

  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);


  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/tenants/plans');
        setPlans(res.data.data);
      } catch (err) {
        message.error('Failed to load subscription plans');
      }
    };
    fetchPlans();
  }, []);


  const onFinish = async (values) => {
    setLoading(true);
    try {
      await api.post('/tenants', values);
      message.success('New tenant created successfully!');
      navigate('/tenants');
    } catch (err: any) {

      message.error(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card bordered={false}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}><UserAddOutlined /> Register New Hotel</Title>
          <Paragraph type="secondary">Onboard a new hotel onto the HotelPro platform.</Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ planId: plans[0]?.id }}
        >
          <Divider orientation={"left" as any}>Business Information</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="businessName" 
                label="Hotel/Business Name" 
                rules={[{ required: true, message: 'Please enter hotel name' }]}
              >
                <Input placeholder="e.g. Grand Residency" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="ownerName" 
                label="Owner/Manager Name" 
                rules={[{ required: true, message: 'Please enter owner name' }]}
              >
                <Input placeholder="e.g. John Doe" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            name="address" 
            label="Business Address" 
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <Input.TextArea rows={3} placeholder="Full physical address..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="phoneNumber" 
                label="Contact Phone Number" 
                rules={[{ required: true, message: 'Please enter phone number' }]}
              >
                <Input placeholder="Official contact number" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation={"left" as any}>Login Credentials</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="mobile" 
                label="Login Mobile Number" 
                rules={[
                  { required: true, message: 'Please enter mobile' },
                  { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit number' }
                ]}
              >
                <Input 
                  placeholder="10-digit mobile number" 
                  size="large" 
                  maxLength={10}
                  onInput={(e: any) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="password" 
                label="Initial Password" 
                rules={[
                  { required: true, message: 'Please enter password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password placeholder="Min 6 characters" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation={"left" as any}>Subscription Plan</Divider>
          <Form.Item 
            name="planId" 
            label="Initial Plan Selection" 
            rules={[{ required: true, message: 'Please select a plan' }]}
          >
            <Select 
              size="large" 
              placeholder="Select a plan" 
              onChange={(val) => {
                const plan = plans.find(p => p.id === val);
                if (plan) {
                  form.setFieldsValue({ 
                    planPrice: plan.price,
                    discount: 0,
                    finalAmount: plan.price,
                    paymentMethod: plan.price === 0 ? 'FREE' : undefined
                  });
                }
              }}
            >
              {plans.map(plan => (
                <Option key={plan.id} value={plan.id}>
                  <Space>
                    {plan.name} - {plan.durationInDays} Days (₹{plan.price})
                    {plan.isTrial && <Tag color="blue">Free Trial</Tag>}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            noStyle
            shouldUpdate={(prev, curr) => prev.planId !== curr.planId || prev.finalAmount !== curr.finalAmount}
          >
            {({ getFieldValue }) => {
              const planId = getFieldValue('planId');
              const plan = plans.find(p => p.id === planId);
              const isTrial = plan?.price === 0;

              if (isTrial) {
                return (
                  <div style={{ marginTop: '24px', padding: '16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '8px' }}>
                    <Space>
                      <Tag color="blue">Free Trial</Tag>
                      <Text strong>This plan is free. No payment details are required for onboarding.</Text>
                    </Space>
                  </div>
                );
              }

              return (
                <>
                  <Divider orientation="left">Payment Details</Divider>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item name="planPrice" label="Plan Price (₹)">
                        <Input disabled size="large" prefix="₹" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item 
                        name="discount" 
                        label="Discount (₹)"
                        initialValue={0}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const price = getFieldValue('planPrice') || 0;
                              if (!value || (value >= 0 && value <= price)) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Discount cannot exceed plan price'));
                            },
                          }),
                        ]}
                      >
                        <Input 
                          type="number" 
                          size="large" 
                          prefix="₹" 
                          onChange={(e) => {
                            const discount = parseFloat(e.target.value) || 0;
                            const price = getFieldValue('planPrice') || 0;
                            form.setFieldValue('finalAmount', Math.max(0, price - discount));
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name="finalAmount" label="Final Amount (₹)">
                        <Input disabled size="large" prefix="₹" style={{ color: '#52c41a', fontWeight: 'bold' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item 
                        name="paymentMethod" 
                        label="Payment Method"
                        rules={[{ 
                          required: true, 
                          message: 'Method required' 
                        }]}
                      >
                        <Select 
                          size="large" 
                          placeholder="Select Method"
                        >
                          <Option value="UPI">UPI / PhonePe / GPay</Option>
                          <Option value="CASH">Cash</Option>
                          <Option value="CARD">Debit/Credit Card</Option>
                          <Option value="BANK_TRANSFER">Bank Transfer</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              );
            }}
          </Form.Item>

          <div style={{ marginTop: '32px', textAlign: 'right' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              icon={<SaveOutlined />}
              loading={loading}
              style={{ minWidth: '200px' }}
            >
              Create Tenant Account
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
