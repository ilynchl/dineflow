import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SmileOutlined } from '@ant-design/icons';
import { preferenceApi, menuApi } from '../../api';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        preferenceApi.getAll(),
        menuApi.getCategories().catch(() => []),
      ]);
      setPrefs(p);
      setCategories(c);
    } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    const options = (values.options || '').split(/[，,、\n]/).map(s => s.trim()).filter(Boolean);
    if (options.length === 0) {
      message.warning('请至少输入一个选项');
      return;
    }
    try {
      const payload = { ...values, options };
      if (editing) {
        await preferenceApi.update(editing.id, payload);
        message.success('已更新');
      } else {
        await preferenceApi.create(payload);
        message.success('已添加');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      load();
    } catch (e) { message.error(e.message); }
  };

  const handleDelete = async (id) => {
    try {
      await preferenceApi.delete(id);
      message.success('已删除');
      load();
    } catch (e) { message.error(e.message); }
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      options: (record.options || []).join('、'),
      category_id: record.category_id || null,
    });
    setModalOpen(true);
  };

  const columns = [
    { title: '排序', dataIndex: 'sort_order', width: 60 },
    { title: '偏好名称', dataIndex: 'name', width: 120 },
    { title: '类型', dataIndex: 'type', width: 80, render: v => v === 'radio' ? '单选' : '多选' },
    {
      title: '适用分类', dataIndex: 'category_id', width: 100,
      render: (v) => {
        if (!v) return <Tag>全部</Tag>;
        const cat = categories.find(c => c.id === v);
        return <Tag color="blue">{cat?.name || `分类#${v}`}</Tag>;
      },
    },
    {
      title: '选项', dataIndex: 'options', render: opts => (
        <Space size={4} wrap>
          {(opts || []).map(o => <Tag key={o}>{o}</Tag>)}
        </Space>
      ),
    },
    {
      title: '操作', width: 120, render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="偏好配置" extra={
      <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
        新增偏好
      </Button>
    }>
      <Table dataSource={prefs} columns={columns} rowKey="id" loading={loading}
        pagination={false} size="small" />

      <Modal title={editing ? '编辑偏好' : '新增偏好'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={handleSave} okText="保存" cancelText="取消" destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="偏好名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：辣度、葱、香菜" />
          </Form.Item>
          <Form.Item name="type" label="选择类型" initialValue="radio">
            <Select
              options={[
                { label: '单选', value: 'radio' },
                { label: '多选', value: 'checkbox' },
              ]}
            />
          </Form.Item>
          <Form.Item name="options" label="选项（用顿号、逗号或换行分隔）"
            rules={[{ required: true, message: '请输入选项' }]}>
            <Input.TextArea rows={3} placeholder="微辣、中辣、重辣" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序号" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="category_id" label="适用分类">
            <Select allowClear placeholder="全部（适用于所有菜品）">
              {categories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
