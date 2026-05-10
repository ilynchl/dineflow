import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, message } from 'antd';
import { statsApi } from '../../api';

export default function StatsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setSummary(await statsApi.summary()); } catch (e) { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="今日应收" value={summary?.today?.revenue || 0} prefix="¥" /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="今日实收" value={summary?.today?.paid_revenue || 0} prefix="¥" valueStyle={{ color: '#3f8600' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="今日订单" value={summary?.today?.orders || 0} suffix="单" /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="进行中" value={summary?.today?.active_orders || 0} suffix="单" valueStyle={{ color: '#fa541c' }} /></Card>
        </Col>
      </Row>

      <Card title="热销菜品 TOP10" style={{ marginTop: 12 }}>
        <Table dataSource={summary?.top_items || []} rowKey="name" pagination={false} size="small"
          columns={[
            { title: '菜品', dataIndex: 'name', key: 'name' },
            { title: '销量', dataIndex: 'total_qty', key: 'qty' },
            { title: '销售额', dataIndex: 'total_amount', key: 'amt', render: v => `¥${v}` },
          ]}
        />
      </Card>

      <Card title="最近订单" style={{ marginTop: 12 }}>
        <Table dataSource={summary?.recent_orders || []} rowKey="id" pagination={false} size="small"
          columns={[
            { title: '订单号', dataIndex: 'order_no', key: 'no' },
            { title: '桌号', dataIndex: 'table_no', key: 'table', render: v => v || '外卖' },
            { title: '金额', dataIndex: 'total_amount', key: 'amt', render: v => `¥${v}` },
            { title: '状态', dataIndex: 'status', key: 'status' },
            { title: '时间', dataIndex: 'created_at', key: 'time' },
          ]}
        />
      </Card>
    </div>
  );
}
