import React, { useState, useEffect } from 'react';
import { Card, Switch, Table, Tag, Space, message, Input } from 'antd';
import { menuApi } from '../../api';

export default function SoldOutManage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await menuApi.getItems({})); } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'sold_out' : 'active';
      await menuApi.updateStatus(id, newStatus);
      setItems(items.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } catch (e) { message.error(e.message); }
  };

  const filtered = search ? items.filter(i => i.name.includes(search)) : items;
  const activeCount = items.filter(i => i.status === 'active').length;
  const soldOutCount = items.filter(i => i.status === 'sold_out').length;

  const columns = [
    { title: '菜品', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category_name', key: 'cat', width: 80 },
    { title: '价格', dataIndex: 'price', key: 'price', width: 80, render: v => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 120,
      render: (s, r) => (
        <Space>
          <Tag color={s === 'active' ? 'green' : 'red'} style={{ margin: 0 }}>
            {s === 'active' ? '在售' : '沽清'}
          </Tag>
          <Switch checked={s === 'active'} size="small"
            onChange={() => toggle(r.id, s)}
            checkedChildren="开" unCheckedChildren="关" />
        </Space>
      ),
    },
  ];

  return (
    <Card title="沽清管理" extra={
      <Space>
        <Input.Search placeholder="搜索菜品" allowClear onSearch={setSearch} style={{ width: 200 }} />
        <Tag color="green">在售 {activeCount}</Tag>
        <Tag color="red">沽清 {soldOutCount}</Tag>
      </Space>
    }>
      <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
        pagination={false} size="small" />
    </Card>
  );
}
