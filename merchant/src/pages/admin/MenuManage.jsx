import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { menuApi } from '../../api';

export default function MenuManage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [d, cats] = await Promise.all([menuApi.getItems({}), menuApi.getCategories()]);
      setItems(d);
      setCategories(cats);
    } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (v) => {
    try {
      editingItem ? await menuApi.updateItem(editingItem.id, v) : await menuApi.createItem(v);
      message.success(editingItem ? '已更新' : '已添加');
      setModalOpen(false); setEditingItem(null); form.resetFields(); load();
    } catch (e) { message.error(e.message); }
  };

  const columns = [
    { title: '菜名', dataIndex: 'name', key: 'name' },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 50 },
    { title: '价格', dataIndex: 'price', key: 'price', width: 70, render: v => `¥${v}` },
    { title: '分类', dataIndex: 'category_name', key: 'cat', width: 70 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (s, r) => (
        <Tag color={s === 'active' ? 'green' : 'red'} style={{ cursor: 'pointer' }}
          onClick={async () => {
            await menuApi.updateStatus(r.id, s === 'active' ? 'sold_out' : 'active');
            load();
          }}>
          {s === 'active' ? '在售' : '沽清'}
        </Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditingItem(r); form.setFieldsValue(r); setModalOpen(true); }} />
          <Popconfirm title="确定删除？" onConfirm={async () => { await menuApi.deleteItem(r.id); load(); }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="菜品管理">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditingItem(null); form.resetFields(); setModalOpen(true); }}>
          添加菜品
        </Button>
        <Button onClick={() => setCatModalOpen(true)}>管理分类</Button>
      </Space>
      <Table dataSource={items} columns={columns} rowKey="id" loading={loading}
        pagination={false} size="small" />

      <Modal title={editingItem ? '编辑菜品' : '添加菜品'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingItem(null); }}
        onOk={() => form.submit()} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="菜名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="unit" label="单位">
            <Select options={[{ label: '串', value: '串' }, { label: '份', value: '份' }, { label: '瓶', value: '瓶' }]} />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true }]}>
            <InputNumber min={0} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select allowClear options={categories.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="zone" label="出品区域">
            <Select options={[{ label: '烧烤档', value: 'bbq' }, { label: '后厨档', value: 'kitchen' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="管理分类" open={catModalOpen} onCancel={() => setCatModalOpen(false)} footer={null}>
        <Space style={{ marginBottom: 16 }}>
          <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="分类名称" onPressEnter={async () => {
            if (!catName) return;
            await menuApi.createCategory({ name: catName });
            setCatName(''); load();
          }} />
          <Button type="primary" onClick={async () => {
            if (!catName) return;
            await menuApi.createCategory({ name: catName });
            setCatName(''); load();
          }}>添加</Button>
        </Space>
        {categories.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>{c.name}</span>
            <Popconfirm title="确定删除？" onConfirm={async () => { await menuApi.deleteCategory(c.id); load(); }}>
              <Button size="small" danger>删除</Button>
            </Popconfirm>
          </div>
        ))}
      </Modal>
    </Card>
  );
}
