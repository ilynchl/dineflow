import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Switch, Button, message } from 'antd';
import { settingsApi } from '../../api';

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await settingsApi.get();
      // Convert string booleans for Switch fields
      form.setFieldsValue({
        ...s,
        print_receipt: s.print_receipt === 'true',
        print_kitchen: s.print_kitchen === 'true',
      });
    } catch (e) { /* ignore */ }
  }, [form]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // Convert booleans back to strings for storage
      await settingsApi.update({
        ...values,
        print_receipt: String(values.print_receipt ?? false),
        print_kitchen: String(values.print_kitchen ?? false),
      });
      message.success('设置已保存');
    } catch (e) { message.error(e.message); }
    setLoading(false);
  };

  return (
    <Card title="系统设置">
      <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 500 }}>
        <Form.Item name="shop_name" label="店铺名称">
          <Input placeholder="我的烧烤摊" />
        </Form.Item>
        <Form.Item name="shop_phone" label="联系电话">
          <Input placeholder="手机号" />
        </Form.Item>
        <Form.Item name="print_receipt" label="打印结账小票" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="print_kitchen" label="打印后厨单" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>保存设置</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
