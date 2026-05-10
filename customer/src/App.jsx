import { useState, useEffect } from 'react';
import { menuApi, orderApi, tableApi, settingsApi } from './api';
import './App.css';

const STATUS_MAP = {
  pending: '待制作', preparing: '制作中', served: '已上菜',
  paid: '已结账', cancelled: '已取消',
};

export default function App() {
  const [view, setView] = useState('menu'); // menu | order | orders
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shopName, setShopName] = useState('');
  const [qrTableNo, setQrTableNo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');
    const tableNo = params.get('table_no');
    if (tableNo) setQrTableNo(tableNo);

    Promise.all([
      menuApi.getCategories().catch(() => []),
      menuApi.getItems({}).catch(() => []),
      tableApi.getAll().catch(() => []),
      settingsApi.getAll().catch(() => ({})),
    ]).then(([cats, its, tbls, settings]) => {
      setCategories(cats);
      setItems(its.filter(i => i.status === 'active'));
      setTables(tbls);
      if (cats.length > 0) setActiveCat(cats[0].id);
      if (settings.shop_name) setShopName(settings.shop_name);
      // 扫码后自动选中桌号
      if (tableId && tbls.find(t => t.id === Number(tableId))) {
        setSelectedTable(Number(tableId));
      }
    });
  }, []);

  // Auto refresh orders
  useEffect(() => {
    if (view === 'orders' || currentOrder) {
      const t = setInterval(() => {
        orderApi.getAll({ limit: 20 }).then(setOrders).catch(() => {});
      }, 5000);
      return () => clearInterval(t);
    }
  }, [view, currentOrder]);

  const currentTable = tables.find(t => t.id === selectedTable);
  const filteredItems = items.filter(i => i.category_id === activeCat);
  const cartItems = Object.entries(cart).filter(([_, q]) => q > 0).map(([id, qty]) => {
    const item = items.find(i => i.id === Number(id));
    return item ? { ...item, qty } : null;
  }).filter(Boolean);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const addItem = (item) => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }));
  const changeQty = (id, d) => {
    setCart(p => {
      const n = (p[id] || 0) + d;
      if (n <= 0) { const { [id]: _, ...r } = p; return r; }
      return { ...p, [id]: n };
    });
  };

  const submitOrder = async () => {
    if (!selectedTable) { return; }
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const result = await orderApi.create({
        table_id: selectedTable,
        items: cartItems.map(i => ({ menu_item_id: i.id, quantity: i.qty })),
      });
      setCart({}); setShowCart(false);
      // Fetch full order details
      const full = await orderApi.get(result.orderId);
      setCurrentOrder(full);
      setView('order');
      orderApi.getAll({ limit: 20 }).then(setOrders).catch(() => {});
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  };

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <span className="table-badge">
            {currentTable ? `📍 ${currentTable.zone_name ? currentTable.zone_name + ' ' : ''}${currentTable.table_no}` : qrTableNo ? `📍 ${qrTableNo}` : ''}
          </span>
        </div>
        <div className="header-right">
          <span className="shop-name">{shopName}</span>
        </div>
      </div>

      {/* Content */}
      {view === 'menu' && (
        <div className="menu-page">
          {/* Categories */}
          <div className="cat-bar">
            {categories.map(c => (
              <span key={c.id} className={`cat-tab ${activeCat === c.id ? 'active' : ''}`}
                onClick={() => setActiveCat(c.id)}>{c.name}</span>
            ))}
          </div>

          {/* Items */}
          <div className="item-list">
            {filteredItems.map(item => (
              <div key={item.id} className="menu-item">
                <div className="mi-info">
                  <div className="mi-name">{item.name}</div>
                  <div className="mi-price">¥{item.price}/{item.unit}</div>
                </div>
                <div className="mi-actions">
                  {(cart[item.id] || 0) > 0 ? (
                    <div className="qty-ctl">
                      <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>-</button>
                      <span className="qty-num">{cart[item.id]}</span>
                      <button className="qty-btn add" onClick={() => addItem(item)}>+</button>
                    </div>
                  ) : (
                    <button className="add-btn" onClick={() => addItem(item)}>+</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'order' && currentOrder && (
        <div className="order-detail-page">
          <div className="od-status" data-status={currentOrder.status}>
            {STATUS_MAP[currentOrder.status] || currentOrder.status}
          </div>
          <div className="od-no">订单号: {currentOrder.orderNo || currentOrder.id}</div>
          <div className="od-items">
            {currentOrder.items?.map(i => (
              <div key={i.id} className="od-item">
                <span>{i.name}</span><span>x{i.quantity}</span><span>¥{i.unit_price * i.quantity}</span>
              </div>
            ))}
          </div>
          <div className="od-total">合计: ¥{currentOrder.total || cartTotal}</div>
          <button className="back-menu-btn" onClick={() => setView('menu')}>继续加菜</button>
        </div>
      )}

      {view === 'orders' && (
        <div className="orders-page">
          {orders.length === 0 && <div className="empty-state">暂无订单</div>}
          {orders.map(o => (
            <div key={o.id} className="order-card" onClick={() => { setCurrentOrder(o); setView('order'); }}>
              <div className="oc-header">
                <span className="oc-no">{o.order_no}</span>
                <span className="oc-status" data-status={o.status}>{STATUS_MAP[o.status]}</span>
              </div>
              <div className="oc-items">{o.items?.map(i => i.name).join('、')}</div>
              <div className="oc-footer">
                <span className="oc-total">¥{o.total_amount}</span>
                <span className="oc-time">{o.created_at?.slice(11, 19)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart FAB */}
      {view === 'menu' && cartCount > 0 && (
        <div className="cart-fab" onClick={() => setShowCart(true)}>
          <span className="cart-icon">🛒</span>
          <span className="cart-badge">{cartCount}</span>
          <span className="cart-fab-total">¥{cartTotal}</span>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="overlay" onClick={() => setShowCart(false)}>
          <div className="cart-sheet" onClick={e => e.stopPropagation()}>
            <div className="cs-header">
              <span>已选菜品</span>
              <span className="cs-clear" onClick={() => setCart({})}>清空</span>
            </div>
            <div className="cs-items">
              {cartItems.map(i => (
                <div key={i.id} className="cs-item">
                  <span>{i.name}</span>
                  <span className="cs-item-price">¥{i.price}</span>
                  <div className="qty-ctl">
                    <button className="qty-btn" onClick={() => changeQty(i.id, -1)}>-</button>
                    <span className="qty-num">{i.qty}</span>
                    <button className="qty-btn add" onClick={() => addItem(i)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cs-footer">
              <span className="cs-total">合计: ¥{cartTotal}</span>
              <button className="cs-submit" disabled={!selectedTable || submitting}
                onClick={submitOrder}>
                {submitting ? '下单中...' : '确认下单'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <div className={`bn-item ${view === 'menu' ? 'active' : ''}`} onClick={() => setView('menu')}>
          <span className="bn-icon">🍽️</span>
          <span className="bn-label">点餐</span>
        </div>
        <div className={`bn-item ${view === 'orders' ? 'active' : ''}`}
          onClick={() => { setView('orders'); orderApi.getAll({ limit: 20 }).then(setOrders).catch(() => {}); }}>
          <span className="bn-icon">📋</span>
          <span className="bn-label">订单</span>
        </div>
      </div>
    </div>
  );
}
