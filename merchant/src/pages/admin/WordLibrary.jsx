import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { wordApi, menuApi } from '../../api';

export default function WordLibrary() {
  const [words, setWords] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [w, m] = await Promise.all([
        wordApi.getAll().catch(() => []),
        menuApi.getItems({}).catch(() => []),
      ]);
      setWords(w);
      setMenuItems(m);
    } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (values) => {
    try {
      await wordApi.create(values);
      message.success('已添加');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (e) { message.error(e.message); }
  };

  const columns = [
    { title: '语音别名', dataIndex: 'alias', key: 'alias' },
    { title: '对应菜品', dataIndex: 'menu_item_name', key: 'item' },
    {
      title: '操作', key: 'action', width: 80,
      render: (_, r) => (
        <Popconfirm title="确定删除？" onConfirm={async () => { try { await wordApi.delete(r.id); load(); } catch (e) { message.error(e.message); } }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="词库管理（语音识别）" extra={
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
        添加词条
      </Button>
    }>
      <Table dataSource={words} columns={columns} rowKey="id" loading={loading}
        pagination={false} size="small" />

      <Modal title="添加词条" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="alias" label="语音别名" rules={[{ required: true }]}
            help="顾客/服务员说出的名称，如「羊肉」→「羊肉串」">
            <Input placeholder="例：羊肉、牛肉、鸡翅" />
          </Form.Item>
          <Form.Item name="menu_item_name" label="对应菜品" rules={[{ required: true }]}>
            <Select showSearch placeholder="选择菜品"
              options={menuItems.map(i => ({ label: i.name, value: i.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
