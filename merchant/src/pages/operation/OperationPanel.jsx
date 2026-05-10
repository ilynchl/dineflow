import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Row, Col, Button, Badge, Modal, List, Tag, message, InputNumber, Select, Input, Tabs, Statistic, Space, Typography } from 'antd';
import { PlusOutlined, CheckCircleOutlined, DollarOutlined, BellOutlined, SoundOutlined, SplitCellsOutlined, AudioOutlined } from '@ant-design/icons';
import { orderApi, menuApi, tableApi, paymentApi, statsApi, splitApi, wordApi } from '../../api';

const { Text, Title } = Typography;

// Mock notification sound
function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1200;
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.15);
    }, 200);
  } catch (e) { /* silent fail */ }
}

export default function OperationPanel() {
  const [orders, setOrders] = useState([]);
  const [kitchenItems, setKitchenItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState({});
  const [orderModal, setOrderModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [quickModal, setQuickModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [splitModal, setSplitModal] = useState(false);
  const [splitSplits, setSplitSplits] = useState([]);
  const [splitSourceTable, setSplitSourceTable] = useState(null);
  const [splitItemName, setSplitItemName] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const soundEnabled = useRef(true);
  const prevOrderCount = useRef(0);

  const loadData = useCallback(async () => {
    try {
      const [o, k, m, t, s] = await Promise.all([
        orderApi.getAll({ status: 'pending,preparing,served' }).catch(() => []),
        orderApi.kitchenPending().catch(() => []),
        menuApi.getItems({ status: 'active' }).catch(() => []),
        tableApi.getAll().catch(() => []),
        statsApi.summary().catch(() => ({})),
      ]);
      setOrders(o);
      setKitchenItems(k);
      setMenuItems(m);
      setTables(t);
      setStats(s);

      // Play sound for new orders
      if (prevOrderCount.current > 0 && k.length > prevOrderCount.current && soundEnabled.current) {
        playNewOrderSound();
      }
      prevOrderCount.current = k.length;
    } catch (e) {
      console.error('load error', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Quick order (报串)
  const handleQuickOrder = async () => {
    if (!selectedTable || cart.length === 0) {
      message.warning('请选择桌台和菜品');
      return;
    }
    try {
      await orderApi.create({
        table_id: selectedTable,
        items: cart.map(c => ({ menu_item_id: c.id, quantity: c.qty, flavor: c.flavor })),
      });
      message.success('下单成功！');
      setCart([]);
      setQuickModal(false);
      loadData();
    } catch (e) {
      message.error(e.message);
    }
  };

  // Mark item done
  const markDone = async (itemId) => {
    try {
      await orderApi.updateItemStatus(itemId, 'done');
      loadData();
    } catch (e) { message.error(e.message); }
  };

  // Payment
  const handlePay = async (method) => {
    if (!currentOrderId) return;
    try {
      const order = orders.find(o => o.id === currentOrderId);
      await paymentApi.pay({ order_id: currentOrderId, method, amount: order.total_amount });
      message.success('结账成功！');
      setPayModal(false);
      loadData();
    } catch (e) {
      message.error(e.message);
    }
  };

  // Voice recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { message.warning('当前浏览器不支持语音识别'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      try {
        const result = await wordApi.resolve(text);
        if (result.matched) {
          message.success(`识别到: ${result.item_name}`);
          // Auto add the matched item to cart
          const found = menuItems.find(i => i.name === result.item_name);
          if (found) {
            setCart(prev => {
              const existing = prev.find(c => c.id === found.id);
              if (existing) return prev.map(c => c.id === found.id ? { ...c, qty: c.qty + 1 } : c);
              return [...prev, { id: found.id, name: found.name, qty: 1, price: found.price }];
            });
          }
        } else {
          message.info(`未匹配到菜品: "${text}"，可在词库中添加`);
        }
      } catch (e) { message.error('语音识别请求失败'); }
      setListening(false);
    };
    recognition.onerror = () => { message.warning('语音识别失败，请重试'); setListening(false); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // Split handlers
  const handleSplit = async () => {
    if (!splitSourceTable || splitSplits.length === 0) {
      message.warning('请填写分串信息');
      return;
    }
    try {
      await splitApi.create({ source_table_id: splitSourceTable, splits: splitSplits });
      message.success('分串成功！');
      setSplitModal(false); setSplitSplits([]); setSplitSourceTable(null); setSplitItemName('');
      loadData();
    } catch (e) { message.error(e.message); }
  };

  // Group kitchen items by table
  const kitchenByTable = {};
  kitchenItems.forEach(item => {
    const key = item.table_no || '外卖';
    if (!kitchenByTable[key]) kitchenByTable[key] = [];
    kitchenByTable[key].push(item);
  });

  return (
    <div>
      <Row gutter={[12, 12]}>
        {/* Stats bar */}
        <Col span={24}>
          <Card size="small" style={{ background: '#fff7e6' }}>
            <Row gutter={16} justify="space-around">
              <Col><Statistic title="待制作" value={kitchenItems.length} valueStyle={{ color: '#fa541c' }} /></Col>
              <Col><Statistic title="进行中" value={orders.filter(o => o.status === 'preparing' || o.status === 'served').length} /></Col>
              <Col><Statistic title="今日营收" value={stats.today?.paid_revenue || 0} prefix="¥" /></Col>
              <Col><Statistic title="今日订单" value={stats.today?.orders || 0} /></Col>
            </Row>
          </Card>
        </Col>

        {/* Quick actions */}
        <Col xs={24} lg={8}>
          <Card title="快捷操作" size="small" extra={
            <Button type="link" icon={<SoundOutlined />}
              onClick={() => soundEnabled.current = !soundEnabled.current}>
              {soundEnabled.current ? '声音开' : '声音关'}
            </Button>
          }>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" size="large" block icon={<PlusOutlined />}
                style={{ height: 60, fontSize: 20 }} onClick={() => setQuickModal(true)}>
                报串
              </Button>
              <Button size="large" block icon={<SplitCellsOutlined />} style={{ height: 48 }}
                onClick={() => setSplitModal(true)}>
                分串
              </Button>
              <Button size="large" block icon={<BellOutlined />} style={{ height: 48 }}
                onClick={() => {
                  orderApi.kitchenPending()
                    .then(items => {
                      if (items.length === 0) { message.info('没有待制作的订单'); return; }
                      Modal.info({
                        title: '待制作清单',
                        content: <List dataSource={items} renderItem={item => (
                          <List.Item actions={[<Button size="small" type="primary" onClick={() => { markDone(item.id); Modal.destroyAll(); }}>完成</Button>]}>
                            <Text strong>{item.table_no || '外卖'}</Text> - {item.name} x{item.quantity}
                          </List.Item>
                        )} size="small" />,
                        width: 500,
                      });
                    })
                    .catch(() => message.error('加载待制作清单失败'));
                }}>
                待制作 ({kitchenItems.length})
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Kitchen Board - 制作看板 */}
        <Col xs={24} lg={16}>
          <Card title={`🔥 制作看板 (${kitchenItems.length})`} size="small" extra={
            <Button size="small" onClick={loadData}>刷新</Button>
          }>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {Object.entries(kitchenByTable).map(([tableNo, items]) => (
                <Card key={tableNo} type="inner" size="small" title={`${tableNo} 号桌`}
                  style={{ marginBottom: 8 }}
                  extra={<Button size="small" type="primary" onClick={() => {
                    items.forEach(i => markDone(i.id));
                    message.success(`${tableNo} 全部完成`);
                  }}>全部完成</Button>}
                >
                  <Row gutter={[8, 8]}>
                    {items.map(item => (
                      <Col key={item.id}>
                        <Badge count={item.quantity} offset={[-5, 5]}>
                          <Button
                            style={{ width: 80, height: 60, fontSize: 13, whiteSpace: 'normal', wordBreak: 'keep-all' }}
                            type={item.status === 'preparing' ? 'primary' : 'default'}
                            onClick={() => markDone(item.id)}
                          >
                            {item.name}
                          </Button>
                        </Badge>
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}
              {Object.keys(kitchenByTable).length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无待制作的订单</div>
              )}
            </div>
          </Card>
        </Col>

        {/* Active Orders */}
        <Col span={24}>
          <Card title="进行中的订单" size="small">
            <Row gutter={[12, 12]}>
              {orders.filter(o => o.status !== 'paid').map(order => (
                <Col xs={24} sm={12} md={8} lg={6} key={order.id}>
                  <Card size="small" hoverable
                    style={{ borderLeft: `4px solid ${
                      order.status === 'pending' ? '#fa541c' :
                      order.status === 'preparing' ? '#1890ff' : '#52c41a'
                    }` }}
                    actions={[
                      order.status !== 'paid' && (
                        <Button type="link" icon={<DollarOutlined />}
                          onClick={() => { setCurrentOrderId(order.id); setPayModal(true); }}>
                          结账
                        </Button>
                      ),
                    ].filter(Boolean)}
                  >
                    <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {order.table_no || '外卖'} 号桌
                    </div>
                    <Tag color={
                      order.status === 'pending' ? 'red' :
                      order.status === 'preparing' ? 'blue' : 'green'
                    }>
                      {order.status === 'pending' ? '待制作' :
                       order.status === 'preparing' ? '制作中' : '已上菜'}
                    </Tag>
                    <div style={{ marginTop: 4 }}>
                      {order.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>{item.name} x{item.quantity}</span>
                          <span>¥{item.unit_price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 'bold', textAlign: 'right' }}>
                      合计: ¥{order.total_amount}
                    </div>
                  </Card>
                </Col>
              ))}
              {orders.filter(o => o.status !== 'paid').length === 0 && (
                <Col span={24} style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无进行中的订单</Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 报串 Modal */}
      <Modal title="报串 - 快速下单" open={quickModal} onCancel={() => setQuickModal(false)}
        width={600} footer={null}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>选择桌台：</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择桌台"
              value={selectedTable}
              onChange={setSelectedTable}
              options={tables.filter(t => t.status !== 'paid').map(t => ({
                label: `${t.table_no} (${t.zone_name || '未分区'})`,
                value: t.id,
              }))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>选择菜品：</Text>
              <Button icon={<AudioOutlined />} size="small"
                type={listening ? 'primary' : 'default'}
                loading={listening}
                onClick={startListening}>
                {listening ? '聆听中...' : '语音录入'}
              </Button>
            </div>
            <div style={{ maxHeight: 300, overflow: 'auto', marginTop: 4 }}>
              <Row gutter={[6, 6]}>
                {menuItems.map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <Col key={item.id}>
                      <Button
                        type={inCart ? 'primary' : 'default'}
                        style={{ width: 90, height: 50, whiteSpace: 'normal' }}
                        onClick={() => {
                          if (inCart) {
                            setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
                          } else {
                            setCart([...cart, { id: item.id, name: item.name, qty: 1, price: item.price }]);
                          }
                        }}
                      >
                        {item.name}
                        <br /><small>¥{item.price}</small>
                      </Button>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </div>
          {cart.length > 0 && (
            <Card size="small" title="已选清单">
              {cart.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text>{c.name}</Text>
                  <Space>
                    <InputNumber size="small" min={1} value={c.qty}
                      onChange={val => setCart(cart.map(cc => cc.id === c.id ? { ...cc, qty: val } : cc))} />
                    <Text>¥{c.price * c.qty}</Text>
                    <Button size="small" danger onClick={() => setCart(cart.filter(cc => cc.id !== c.id))}>✕</Button>
                  </Space>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: 8 }}>
                合计: ¥{cart.reduce((s, c) => s + c.price * c.qty, 0)}
              </div>
            </Card>
          )}
          <Button type="primary" block size="large" disabled={cart.length === 0 || !selectedTable}
            onClick={handleQuickOrder} style={{ height: 50, fontSize: 18 }}>
            确认下单
          </Button>
        </Space>
      </Modal>

      {/* 结账 Modal */}
      <Modal title="结账" open={payModal} onCancel={() => setPayModal(false)} footer={null}>
        {currentOrderId && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 'bold', margin: '20px 0' }}>
              ¥{orders.find(o => o.id === currentOrderId)?.total_amount || 0}
            </div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button size="large" block onClick={() => handlePay('wechat')}
                style={{ height: 48, background: '#07c160', color: '#fff', fontSize: 16 }}>
                微信支付
              </Button>
              <Button size="large" block onClick={() => handlePay('alipay')}
                style={{ height: 48, background: '#1677ff', color: '#fff', fontSize: 16 }}>
                支付宝
              </Button>
              <Button size="large" block onClick={() => handlePay('cash')}
                style={{ height: 48, fontSize: 16 }}>
                现金结账
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      {/* 分串 Modal */}
      <Modal title="分串" open={splitModal} onCancel={() => setSplitModal(false)}
        width={600} footer={null}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>来源桌台：</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="选择来源桌台"
              value={splitSourceTable} onChange={setSplitSourceTable}
              options={tables.map(t => ({ label: `${t.table_no} (${t.zone_name || ''})`, value: t.id }))} />
          </div>
          <div>
            <Text strong>菜品名称：</Text>
            <Select style={{ width: '100%', marginTop: 4 }} placeholder="输入或选择菜品"
              value={splitItemName} onChange={setSplitItemName} showSearch
              options={menuItems.map(i => ({ label: i.name, value: i.name }))} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>分配到桌台：</Text>
              <Button size="small" onClick={() => setSplitSplits([...splitSplits, { target_table_id: null, menu_item_name: splitItemName || '', quantity: 1, wait_minutes: 0 }])}
                disabled={!splitItemName}>
                + 添加分配
              </Button>
            </div>
            {splitSplits.map((s, i) => (
              <Card key={i} size="small" style={{ marginBottom: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select placeholder="目标桌台"
                    value={s.target_table_id} onChange={v => {
                      const n = [...splitSplits]; n[i] = { ...n[i], target_table_id: v }; setSplitSplits(n);
                    }}
                    options={tables.map(t => ({ label: t.table_no, value: t.id }))} />
                  <Space>
                    <Text>数量：</Text>
                    <InputNumber min={1} value={s.quantity} onChange={v => {
                      const n = [...splitSplits]; n[i] = { ...n[i], quantity: v }; setSplitSplits(n);
                    }} />
                    <Text>等待(分)：</Text>
                    <InputNumber min={0} value={s.wait_minutes} onChange={v => {
                      const n = [...splitSplits]; n[i] = { ...n[i], wait_minutes: v }; setSplitSplits(n);
                    }} />
                    <Button size="small" danger onClick={() => setSplitSplits(splitSplits.filter((_, j) => j !== i))}>删除</Button>
                  </Space>
                </Space>
              </Card>
            ))}
          </div>
          <Button type="primary" block size="large" onClick={handleSplit}
            disabled={splitSplits.length === 0 || !splitSourceTable}
            style={{ height: 48, fontSize: 16 }}>
            确认分串 ({splitSplits.length} 项)
          </Button>
        </Space>
      </Modal>
    </div>
  );
}
