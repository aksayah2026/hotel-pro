import React, { useState } from 'react';
import axios from 'axios';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { LockOutlined, MobileOutlined, BankOutlined } from '@ant-design/icons';
import { API_URL } from '../config';

const { Title, Text } = Typography;


export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, values);
      const { token, user } = res.data.data;

      if (user.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. Only Super Admins can enter this panel.');
      }

      localStorage.setItem('token', token);
      onLogin(token);
      message.success('Welcome back, Super Admin!');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)' 
    }}>
      <Card style={{ width: '100%', maxWidth: '400px', padding: '12px' }} bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                background: '#f0f0f0', 
                borderRadius: '16px',
                marginBottom: '16px'
            }}>
                <BankOutlined style={{ fontSize: '40px', color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ marginBottom: '4px' }}>HotelPro</Title>
            <Text type="secondary">Super Admin Portal</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="mobile"
            rules={[
              { required: true, message: 'Please input your mobile number!' },
              { pattern: /^\d{10}$/, message: 'Must be a 10-digit number' }
            ]}
          >
            <Input 
              prefix={<MobileOutlined className="site-form-item-icon" />} 
              placeholder="Mobile Number" 
              maxLength={10}
              onInput={(e: any) => {
                e.target.value = e.target.value.replace(/\D/g, "");
              }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              style={{ width: '100%', height: '48px', fontSize: '16px' }}
            >
              Login to Dashboard
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            &copy; 2024 HotelPro Enterprise System
          </Text>
        </div>
      </Card>
    </div>
  );
}
