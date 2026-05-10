import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { merchantAuthApi } from '../api';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await merchantAuthApi.login({ phone: values.phone, password: values.password });
      message.success('登录成功');
      onLogin(result.user, result.token);
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center',
      alignItems: 'center', background: '#f0f2f5',
    }}>
      <Card style={{ width: 400 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#e74c3c' }}>
          🍢 烧烤摊 - 商家端
        </h2>
        <Form layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input prefix={<PhoneOutlined />} placeholder="手机号" size="large" maxLength={11} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登 录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
