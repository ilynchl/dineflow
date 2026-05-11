import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Select, message, Space, Modal, Card, InputNumber } from 'antd';
import { orderApi, paymentApi } from '../../api';

const statusMap = {
  pending: { text: '待制作', color: 'red' },
  preparing: { text: '制作中', color: 'blue' },
  served: { text: '已上菜', color: 'orange' },
  paid: { text: '已结账', color: 'green' },
  cancelled: { text: '已取消', color: 'gray' },
};

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [serveItem, setServeItem] = useState(null);
  const [serveQty, setServeQty] = useState(1);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const data = await orderApi.getAll(params);
      setOrders(data);
    } catch (e) {
      message.error('加载订单失败');
    }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [filterStatus]);

  const handleStatusChange = async (orderId, status) => {
    try {
      await orderApi.updateStatus(orderId, status);
      message.success('状态已更新');
      loadOrders();
    } catch (e) { message.error(e.message); }
  };

  const handleServeItem = (item) => {
    setServeItem(item);
    setServeQty(item.quantity - (item.served_quantity || 0));
  };

  const confirmServe = async () => {
    if (!serveItem || serveQty <= 0) return;
    try {
      await orderApi.serveItem(serveItem.id, serveQty);
      message.success('上菜成功');
      setServeItem(null);
      loadOrders();
    } catch (e) { message.error(e.message); }
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 140 },
    { title: '桌号', dataIndex: 'table_no', key: 'table_no', width: 80, render: v => v || '外卖' },
    {
      title: '菜品', key: 'items', render: (_, r) => r.items?.map(i =>
        <div key={i.id}>{i.name} x{i.quantity}</div>
      ),
    },
    { title: '金额', dataIndex: 'total_amount', key: 'total', width: 80, render: v => `¥${v}` },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 220,
      render: (_, r) => (
        <Space>
          {r.status === 'pending' && <Button size="small" type="primary" onClick={() => handleStatusChange(r.id, 'preparing')}>开始制作</Button>}
          {r.status === 'preparing' && <Button size="small" onClick={() => handleStatusChange(r.id, 'served')}>全部上菜</Button>}
          {r.status !== 'paid' && <Button size="small" type="primary" ghost onClick={() => handleStatusChange(r.id, 'paid')}>结账</Button>}
        </Space>
      ),
    },
    { title: '时间', dataIndex: 'created_at', key: 'time', width: 160 },
  ];

  return (
    <Card title="订单列表" extra={
      <Select style={{ width: 150 }} placeholder="筛选状态" allowClear value={filterStatus || undefined}
        onChange={v => setFilterStatus(v || '')}
        options={[
          { label: '全部', value: '' },
          ...Object.entries(statusMap).map(([k, v]) => ({ label: v.text, value: k })),
        ]}
      />
    }>
      <Table dataSource={orders} columns={columns} rowKey="id" loading={loading}
        pagination={{ pageSize: 20 }} size="small" scroll={{ x: 800 }}
        expandable={{
          expandedRowRender: (r) => (
            <div>
              {r.items?.map(i => {
                const served = i.served_quantity || 0;
                return (
                  <div key={i.id} style={{ display: 'flex', gap: 16, padding: '2px 0', alignItems: 'center' }}>
                    <span style={{ minWidth: 100 }}>{i.name}</span>
                    <span>x{i.quantity}</span>
                    <span>¥{i.unit_price * i.quantity}</span>
                    <Tag>{statusMap[i.status]?.text || i.status}</Tag>
                    {served > 0 && <span style={{ color: '#52c41a', fontSize: 12 }}>已上 {served}/{i.quantity}</span>}
                    {r.status === 'preparing' && served < i.quantity && (
                      <Button size="small" onClick={() => handleServeItem(i)}>上菜</Button>
                    )}
                  </div>
                );
              })}
              {r.remark && <div style={{ color: '#999' }}>备注: {r.remark}</div>}
            </div>
          ),
        }}
      />
      <Modal title="上菜" open={!!serveItem} onCancel={() => setServeItem(null)}
        onOk={confirmServe} okText="确认上菜" cancelText="取消" destroyOnClose>
        {serveItem && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: 16, marginBottom: 16 }}>
              {serveItem.name}（已上 {serveItem.served_quantity || 0}/{serveItem.quantity}）
            </p>
            <p>本次上菜数量：</p>
            <InputNumber min={1} max={serveItem.quantity - (serveItem.served_quantity || 0)}
              value={serveQty} onChange={setServeQty} size="large" style={{ width: 120 }} />
          </div>
        )}
      </Modal>
    </Card>
  );
}
