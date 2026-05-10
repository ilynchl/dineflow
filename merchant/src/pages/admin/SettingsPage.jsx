import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Switch, Button, message, Avatar, Upload, Space } from 'antd';
import { ShopOutlined, PhoneOutlined, PlusOutlined } from '@ant-design/icons';
import { settingsApi, merchantApi } from '../../api';

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    // Read phone from stored user as initial fallback
    const storedUser = (() => { try { return JSON.parse(localStorage.getItem('merchant_user') || '{}'); } catch { return {}; } })();
    let name = storedUser.tenant_name || '';
    let phone = storedUser.username || '';
    let avatar = storedUser.avatar || null;

    try {
      const p = await merchantApi.getProfile();
      if (p && p.id) {
        setProfile(p);
        name = p.name || '';
        phone = p.contact_phone || '';
        avatar = p.avatar || null;
      }
    } catch {}

    setProfile(p => ({ ...(p || {}), avatar: avatar || p?.avatar }));

    try {
      const s = await settingsApi.get();
      form.setFieldsValue({
        ...s,
        shop_name: name || s.shop_name || '',
        shop_phone: phone,
        print_receipt: s.print_receipt === 'true',
        print_kitchen: s.print_kitchen === 'true',
      });
    } catch {
      form.setFieldsValue({ shop_name: name, shop_phone: phone });
    }
  }, [form]);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // Update shop name via merchant profile
      if (values.shop_name) {
        await merchantApi.updateProfile({ name: values.shop_name });
      }
      // Update print settings via df_settings
      await settingsApi.update({
        print_receipt: String(values.print_receipt ?? false),
        print_kitchen: String(values.print_kitchen ?? false),
      });
      message.success('设置已保存');
    } catch (e) { message.error(e.message); }
    setLoading(false);
  };

  // Update stored user in localStorage so refresh shows latest avatar
  const updateStoredAvatar = (url) => {
    try {
      const raw = localStorage.getItem('merchant_user');
      if (raw) {
        const u = JSON.parse(raw);
        u.avatar = url;
        localStorage.setItem('merchant_user', JSON.stringify(u));
      }
    } catch {}
  };

  // Compute file hash using browser crypto
  const computeHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const hash = await computeHash(file);

      // Check if same file already uploaded
      const check = await merchantApi.checkHash(hash);
      if (check.exists) {
        await merchantApi.updateAvatar(check.url, hash);
        setProfile(p => ({ ...p, avatar: check.url }));
        updateStoredAvatar(check.url);
        message.success('更新成功');
        setUploading(false);
        return;
      }

      // Upload to OSS
      const ossConfig = await merchantApi.getOssConfig();
      const ext = file.name.split('.').pop();
      const fileKey = `${ossConfig.key}.${ext}`;

      const formData = new FormData();
      formData.append('key', fileKey);
      formData.append('success_action_status', '200');
      formData.append('OSSAccessKeyId', ossConfig.accessKeyId);
      formData.append('policy', ossConfig.policy);
      formData.append('signature', ossConfig.signature);
      formData.append('x-oss-object-acl', 'public-read');
      formData.append('file', file);

      const uploadUrl = `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com`;
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('上传失败');

      const url = `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${fileKey}`;
      await merchantApi.updateAvatar(url, hash);
      setProfile(p => ({ ...p, avatar: url }));
      updateStoredAvatar(url);
      message.success('更新成功');
    } catch (e) {
      message.error(e.message || '上传失败');
    }
    setUploading(false);
  };

  return (
    <Card title="系统设置">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Avatar */}
        <div>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>商家 logo</div>
          <Upload
            showUploadList={false}
            beforeUpload={(file) => { handleUpload(file); return false; }}
            disabled={uploading}
          >
            <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}>
              <Avatar size={96} src={profile?.avatar} icon={<ShopOutlined />} shape="square" style={{ borderRadius: 8 }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 11,
                textAlign: 'center', padding: '2px 0', borderRadius: '0 0 8px 8px',
              }}>
                <PlusOutlined /> 更换
              </div>
            </div>
          </Upload>
        </div>

        {/* Profile form */}
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 500 }}>
          <Form.Item name="shop_name" label="商家名称" rules={[{ required: true, message: '请输入商家名称' }]}>
            <Input prefix={<ShopOutlined />} placeholder="我的烧烤摊" />
          </Form.Item>
          <Form.Item name="shop_phone" label="商家账号">
            <Input prefix={<PhoneOutlined />} variant="borderless" readOnly />
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
      </Space>
    </Card>
  );
}
