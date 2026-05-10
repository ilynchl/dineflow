import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined,
  DeleteOutlined, FieldTimeOutlined, LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { saasApi } from '../api';

const STATUS_MAP = {
  trial: { text: '试用', color: 'blue' },
  active: { text: '正常', color: 'green' },
  suspended: { text: '已暂停', color: 'orange' },
  expired: { text: '已过期', color: 'red' },
};

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([value, { text }]) => ({ value, label: text }));

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdTenant, setPwdTenant] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [renewTenant, setRenewTenant] = useState(null);
  const [filters, setFilters] = useState({ status: '', keyword: '' });
  const [form] = Form.useForm();
  const [renewForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      const data = await saasApi.getTenants(params);
      setTenants(data);
    } catch (err) {
      message.error(err.message);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const openCreate = () => {
    setEditingTenant(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (tenant) => {
    setEditingTenant(tenant);
    form.setFieldsValue({
      ...tenant,
      expire_at: tenant.expire_at ? dayjs(tenant.expire_at) : null,
    });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      const data = {
        ...values,
        expire_at: values.expire_at ? values.expire_at.format('YYYY-MM-DD') : null,
      };
      if (editingTenant) {
        delete data.password;
        await saasApi.updateTenant(editingTenant.id, data);
        message.success('商户信息已更新');
      } else {
        await saasApi.createTenant(data);
        message.success('商户创建成功');
      }
      setModalOpen(false);
      loadTenants();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await saasApi.changeStatus(id, status);
      message.success('状态已更新');
      loadTenants();
    } catch (err) {
      message.error(err.message);
    }
  };

  const openRenew = (tenant) => {
    setRenewTenant(tenant);
    renewForm.setFieldsValue({
      expire_at: tenant.expire_at ? dayjs(tenant.expire_at) : dayjs().add(1, 'year'),
    });
    setRenewModalOpen(true);
  };

  const handleRenew = async (values) => {
    try {
      await saasApi.renewTenant(renewTenant.id, values.expire_at.format('YYYY-MM-DD'));
      message.success('续费成功');
      setRenewModalOpen(false);
      loadTenants();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await saasApi.deleteTenant(id);
      message.success('商户已删除');
      loadTenants();
    } catch (err) {
      message.error(err.message);
    }
  };

  const openSetPwd = (tenant) => {
    setPwdTenant(tenant);
    pwdForm.resetFields();
    setPwdModalOpen(true);
  };

  const handleSetPwd = async (values) => {
    try {
      await saasApi.setTenantPassword(pwdTenant.id, values.password);
      message.success('商户密码已设置');
      setPwdModalOpen(false);
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '商户名称', dataIndex: 'name', ellipsis: true },
    { title: '联系人', dataIndex: 'contact_name', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone', width: 130 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (status) => {
        const s = STATUS_MAP[status] || { text: status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '过期时间', dataIndex: 'expire_at', width: 110,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '创建时间', dataIndex: 'created_at', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'action', width: 360, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button size="small" icon={<LockOutlined />} onClick={() => openSetPwd(record)}>密码</Button>
          <Button size="small" icon={<FieldTimeOutlined />} onClick={() => openRenew(record)}>续费</Button>
          {record.status === 'suspended' ? (
            <Button size="small" icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(record.id, 'active')}>恢复</Button>
          ) : record.status !== 'expired' ? (
            <Button size="small" icon={<StopOutlined />}
              onClick={() => handleStatusChange(record.id, 'suspended')}>暂停</Button>
          ) : null}
          <Popconfirm title="确定删除此商户？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="商户管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>开通商户</Button>}
      >
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 140 }}
            value={filters.status || undefined}
            onChange={(v) => setFilters(p => ({ ...p, status: v || '' }))}
            options={STATUS_OPTIONS}
          />
          <Input.Search
            placeholder="搜索名称/联系人/电话"
            style={{ width: 260 }}
            value={filters.keyword}
            onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
            onSearch={() => loadTenants()}
            allowClear
          />
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={tenants}
          loading={loading}
          size="small"
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingTenant ? '编辑商户' : '开通商户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="商户名称" rules={[{ required: true, message: '请输入商户名称' }]}>
            <Input placeholder="如：老王烧烤" />
          </Form.Item>
          <Form.Item name="contact_name" label="联系人">
            <Input placeholder="联系人姓名" />
          </Form.Item>
          <Form.Item name="contact_phone" label="联系电话">
            <Input placeholder="手机号（将作为登录账号）" />
          </Form.Item>
          <Form.Item name="expire_at" label="过期时间">
            <DatePicker style={{ width: '100%' }} placeholder="选择过期日期" />
          </Form.Item>
          {!editingTenant && (
            <Form.Item name="password" label="登录密码" rules={[
              { min: 4, message: '密码至少4位' },
            ]}>
              <Input.Password placeholder="留空则不设置密码" />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Renew Modal */}
      <Modal
        title={`续费 - ${renewTenant?.name || ''}`}
        open={renewModalOpen}
        onCancel={() => setRenewModalOpen(false)}
        onOk={() => renewForm.submit()}
      >
        <Form form={renewForm} layout="vertical" onFinish={handleRenew}>
          <Form.Item name="expire_at" label="新的过期时间" rules={[{ required: true, message: '请选择过期时间' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Password Modal */}
      <Modal
        title={`设置密码 - ${pwdTenant?.name || ''}`}
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        onOk={() => pwdForm.submit()}
        width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleSetPwd}>
          <Form.Item name="password" label="登录密码" rules={[
            { required: true, message: '请输入密码' },
            { min: 4, message: '密码至少4位' },
          ]}>
            <Input.Password placeholder="设置商户登录密码" />
          </Form.Item>
          <div style={{ color: '#888', fontSize: 12 }}>
            商户可使用手机号 + 此密码登录商家端
          </div>
        </Form>
      </Modal>
    </>
  );
}
