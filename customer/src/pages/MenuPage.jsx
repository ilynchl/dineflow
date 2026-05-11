import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { menuApi, orderApi, tableApi, settingsApi, preferenceApi } from '../api';
import CartSheet from '../components/CartSheet';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addToOrderId = searchParams.get('addToOrder');

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shopName, setShopName] = useState('');
  const [qrTableNo, setQrTableNo] = useState('');
  const [preferences, setPreferences] = useState({});
  const [remark, setRemark] = useState('');
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [prefConfig, setPrefConfig] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');
    const tableNo = params.get('table_no');
    const setTenant = params.get('set_tenant');
    if (setTenant) {
      localStorage.setItem('dev_tenant', setTenant);
      window.location.href = window.location.pathname + window.location.hash;
      return;
    }
    if (tableNo) setQrTableNo(tableNo);

    setLoading(true);
    Promise.all([
      menuApi.getCategories().catch(e => { setLoadError(e.message); return []; }),
      menuApi.getItems({}).catch(e => { setLoadError(e.message); return []; }),
      tableApi.getAll().catch(e => { setLoadError(e.message); return []; }),
      settingsApi.getAll().catch(e => { setLoadError(e.message); return {}; }),
      preferenceApi.getAll().catch(() => []),
    ]).then(([cats, its, tbls, settings, prefs]) => {
      setPrefConfig(prefs);
      setCategories(cats);
      setItems(its.filter(i => i.status === 'active'));
      setTables(tbls);
      if (cats.length > 0) setActiveCat(cats[0].id);
      if (settings.shop_name) setShopName(settings.shop_name);
      if (tableId && tbls.find(t => t.id === Number(tableId))) {
        setSelectedTable(Number(tableId));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (addToOrderId) {
      setExistingOrderId(Number(addToOrderId));
    } else if (selectedTable) {
      orderApi.getAll({ limit: 1, table_id: selectedTable, status: 'pending,preparing,served' })
        .then(orders => {
          if (orders.length > 0) setExistingOrderId(orders[0].id);
        })
        .catch(() => {});
    }
  }, [addToOrderId, selectedTable]);

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

  const onPreferenceChange = (categoryId, name, value) => {
    setPreferences(prev => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || {}), [name]: value },
    }));
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map(i => ({
          menu_item_id: i.id,
          quantity: i.qty,
          preferences: preferences[i.category_id] || undefined,
        })),
        remark: remark || undefined,
      };
      if (existingOrderId) {
        await orderApi.addItems(existingOrderId, payload);
        setCart({}); setRemark(''); setShowCart(false);
        navigate(`/orders/${existingOrderId}` + window.location.search);
      } else {
        if (!selectedTable) return;
        payload.table_id = selectedTable;
        const result = await orderApi.create(payload);
        setCart({}); setShowCart(false);
        navigate(`/orders/${result.orderId}` + window.location.search);
      }
    } catch (e) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  const tableBadge = currentTable
    ? `📍 ${currentTable.zone_name ? currentTable.zone_name + ' ' : ''}${currentTable.table_no}`
    : qrTableNo ? `📍 ${qrTableNo}` : '';

  if (loading) {
    return (
      <div className="menu-page">
        <div className="header">
          <div className="header-left"><span className="table-badge">{tableBadge}</span></div>
          <div className="header-right"><span className="shop-name">{shopName}</span></div>
        </div>
        <div className="page-loading">加载中...</div>
      </div>
    );
  }

  if (loadError && categories.length === 0) {
    return (
      <div className="menu-page">
        <div className="header">
          <div className="header-left"><span className="table-badge">{tableBadge}</span></div>
          <div className="header-right"><span className="shop-name">{shopName}</span></div>
        </div>
        <div className="page-error">
          <p>加载失败: {loadError}</p>
          <p style={{ fontSize: 13, color: '#999' }}>请确认 URL 包含 ?__tenant=租户ID 参数</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-page">
      {addToOrderId && (
        <div className="add-items-banner">
          正在加菜 · 完成后将加入订单
          <span className="aib-close" onClick={() => navigate(`/orders/${addToOrderId}${window.location.search}`)}>✕</span>
        </div>
      )}
      <div className="header">
        <div className="header-left">
          <span className="table-badge">{tableBadge}</span>
        </div>
        <div className="header-right">
          <span className="shop-name">{shopName}</span>
        </div>
      </div>

      <div className="cat-bar">
        {categories.map(c => (
          <span key={c.id} className={`cat-tab ${activeCat === c.id ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}>{c.name}</span>
        ))}
      </div>

      <div className="item-list">
        {filteredItems.length === 0 && !loading && (
          <div className="empty-state">
            {categories.length === 0 ? '暂无菜品分类' : '该分类暂无菜品'}
          </div>
        )}
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

      {cartCount > 0 && (
        <div className="cart-fab" onClick={() => setShowCart(true)}>
          <span className="cart-icon">🛒</span>
          <span className="cart-badge">{cartCount}</span>
          <span className="cart-fab-total">¥{cartTotal}</span>
        </div>
      )}

      {showCart && (
        <CartSheet
          cartItems={cartItems}
          cartTotal={cartTotal}
          cartCount={cartCount}
          addItem={addItem}
          changeQty={changeQty}
          onClear={() => setCart({})}
          onClose={() => setShowCart(false)}
          onSubmit={submitOrder}
          submitting={submitting}
          submitLabel={existingOrderId ? '加入订单' : '确认下单'}
          selectedTable={selectedTable}
          prefConfig={prefConfig}
          preferences={preferences}
          onPreferenceChange={onPreferenceChange}
          remark={remark}
          onRemarkChange={setRemark}
        />
      )}
    </div>
  );
}
