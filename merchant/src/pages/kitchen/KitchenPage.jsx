import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Button, Badge, Segmented, message, Statistic, Space } from 'antd';
import { FireOutlined, ReloadOutlined } from '@ant-design/icons';
import { orderApi } from '../../api';

export default function KitchenPage() {
  const [groupBy, setGroupBy] = useState('table');
  const [groupedItems, setGroupedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevCount = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.kitchenGrouped(groupBy);
      setGroupedItems(data);
      if (prevCount.current > 0 && data.length > prevCount.current) {
        message.info(`新订单到达 (${data.length - prevCount.current} 项)`);
      }
      prevCount.current = data.length;
    } catch (e) {
      message.error('加载失败');
    }
    setLoading(false);
  }, [groupBy]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const markDone = async (itemId) => {
    try {
      await orderApi.updateItemStatus(itemId, 'done');
      load();
    } catch (e) { message.error(e.message); }
  };

  const pendingCount = Array.isArray(groupedItems) ? groupedItems.length : 0;

  return (
    <div>
      <Card title={
        <Space>
          <FireOutlined style={{ color: '#fa541c' }} />
          <span>制作管理</span>
        </Space>
      } size="small" extra={
        <Space>
          <Statistic title="待制作" value={pendingCount} valueStyle={{ fontSize: 16, color: '#fa541c' }} suffix="项" />
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      }>
        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { label: '按商品+口味', value: 'item' },
              { label: '按桌号', value: 'table' },
            ]}
          />
        </div>

        <div style={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
          {groupBy === 'item' && renderItemView(groupedItems, markDone)}
          {groupBy === 'table' && renderTableView(groupedItems, markDone)}
        </div>
      </Card>
    </div>
  );
}

function renderItemView(items, markDone) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>暂无待制作的菜品</div>;
  }
  return (
    <Row gutter={[8, 8]}>
      {items.map((item, idx) => {
        const remaining = item.total_qty - (item.served_qty || 0);
        return (
          <Col key={idx} xs={12} sm={8} md={6} lg={4}>
            <Badge count={remaining} offset={[-5, 5]}>
              <Button
                style={{ width: '100%', height: 80, whiteSpace: 'normal', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => markDone(item.id)}
              >
                <strong>{item.name}</strong>
                {item.flavor && <span style={{ fontSize: 11, color: '#999' }}>({item.flavor})</span>}
                <small style={{ marginTop: 2 }}>
                  x{item.total_qty}
                  {(item.served_qty || 0) > 0 && <span style={{ color: '#52c41a' }}> 已上 {item.served_qty}</span>}
                </small>
                <small style={{ color: '#999', fontSize: 10 }}>{item.tables}</small>
              </Button>
            </Badge>
          </Col>
        );
      })}
    </Row>
  );
}

function renderTableView(items, markDone) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>暂无待制作的菜品</div>;
  }
  const byTable = {};
  items.forEach(item => {
    const key = item.table_no || '外卖';
    if (!byTable[key]) byTable[key] = [];
    byTable[key].push(item);
  });

  return (
    <Row gutter={[8, 8]}>
      {Object.entries(byTable).map(([tableNo, tableItems]) => (
        <Col key={tableNo} xs={24} sm={12} md={8} lg={6}>
          <Card type="inner" size="small" title={`${tableNo} 号桌`}
            extra={
              <Button size="small" type="primary" onClick={() => {
                tableItems.forEach(i => markDone(i.id));
                message.success(`${tableNo} 全部完成`);
              }}>全部完成</Button>
            }
          >
            <Row gutter={[6, 6]}>
              {tableItems.map(item => {
                const remaining = item.quantity - (item.served_quantity || 0);
                return (
                  <Col key={item.id}>
                    <Badge count={remaining} offset={[-5, 5]}>
                      <Button
                        style={{ width: 80, height: 60, fontSize: 13, whiteSpace: 'normal', wordBreak: 'keep-all' }}
                        type={item.status === 'preparing' ? 'primary' : 'default'}
                        onClick={() => markDone(item.id)}
                      >
                        {item.name}
                        {item.flavor && <span>({item.flavor})</span>}
                      </Button>
                    </Badge>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
