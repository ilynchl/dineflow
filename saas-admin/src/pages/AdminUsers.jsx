import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, LockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { saasApi } from '../api';

const ROLE_MAP = {
  super_admin: { text: '超级管理员', color: 'red' },
  admin: { text: '管理员', color: 'blue' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await saasApi.getUsers();
      setUsers(data);
    } catch (err) {
      message.error(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'admin' });
    setModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      await saasApi.createUser(values);
      message.success('管理员创建成功');
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      message.error(err.message);
    }
  };

  const openChangePwd = (user) => {
    setEditingUser(user);
    pwdForm.resetFields();
    setPwdModalOpen(true);
  };

  const handleChangePwd = async (values) => {
    try {
      await saasApi.updateUser(editingUser.id, values);
      message.success('密码已更新');
      setPwdModalOpen(false);
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await saasApi.deleteUser(id);
      message.success('管理员已删除');
      loadUsers();
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 150 },
    {
      title: '角色', dataIndex: 'role', width: 130,
      render: (role) => {
        const r = ROLE_MAP[role] || { text: role, color: 'default' };
        return <Tag color={r.color}>{r.text}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (status) => <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '正常' : status}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'created_at', width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<LockOutlined />} onClick={() => openChangePwd(record)}>改密</Button>
          <Popconfirm title="确定删除此管理员？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="管理员管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增管理员</Button>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          size="small"
          pagination={false}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="新增管理员"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="登录用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="设置密码" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[
              { value: 'admin', label: '管理员' },
              { value: 'super_admin', label: '超级管理员' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        title={`修改密码 - ${editingUser?.username || ''}`}
        open={pwdModalOpen}
        onCancel={() => setPwdModalOpen(false)}
        onOk={() => pwdForm.submit()}
        width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePwd}>
          <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
