import { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Button, Image } from '@tarojs/components';
import { menuApi, orderApi, tableApi } from '../../api';
import './index.css';

export default function Index() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [tableModal, setTableModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([menuApi.getCategories(), menuApi.getItems({ status: 'active' }), tableApi.getAll()])
      .then(([cats, its, tbls]) => {
        setCategories(cats);
        setItems(its);
        setTables(tbls);
        if (cats.length > 0) setActiveCat(cats[0].id);
      });
  }, []);

  const filteredItems = items.filter(i => i.category_id === activeCat);
  const cartItems = useMemo(() =>
    Object.entries(cart).filter(([_, q]) => q > 0).map(([id, qty]) => {
      const item = items.find(i => i.id === Number(id));
      return item ? { ...item, qty } : null;
    }).filter(Boolean),
    [cart, items]
  );
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const addItem = (item: any) => setCart(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }));
  const changeQty = (id: number, d: number) => {
    setCart(p => {
      const n = (p[id] || 0) + d;
      if (n <= 0) { const { [id]: _, ...r } = p; return r; }
      return { ...p, [id]: n };
    });
  };

  const submitOrder = async () => {
    if (!selectedTable) { setTableModal(true); return; }
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const result = await orderApi.create({
        table_id: selectedTable,
        items: cartItems.map(i => ({ menu_item_id: i.id, quantity: i.qty })),
      });
      const full = await orderApi.get(result.orderId);
      setCart({}); setShowCart(false);
      Taro.navigateTo({ url: `/pages/order/index?id=${full.id}` });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '下单失败', icon: 'none' });
    }
    setSubmitting(false);
  };

  return (
    <View className='page'>
      {/* Header */}
      <View className='header'>
        <View className='header-left'>
          <Text className='shop-name'>🍢 烧烤摊</Text>
          <Text className='table-badge' onClick={() => setTableModal(true)}>
            {selectedTable ? `#${tables.find(t => t.id === selectedTable)?.table_no || selectedTable}` : '选桌号'}
          </Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView className='cat-bar' scrollX showsHorizontalScrollIndicator={false}>
        {categories.map(c => (
          <Text key={c.id} className={`cat-tab ${activeCat === c.id ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}>{c.name}</Text>
        ))}
      </ScrollView>

      {/* Menu items */}
      <ScrollView className='item-list' scrollY>
        {filteredItems.map(item => (
          <View key={item.id} className='menu-item'>
            <View className='mi-info'>
              <Text className='mi-name'>{item.name}</Text>
              <Text className='mi-price'>¥{item.price}/{item.unit}</Text>
            </View>
            <View className='mi-actions'>
              {(cart[item.id] || 0) > 0 ? (
                <View className='qty-ctl'>
                  <Text className='qty-btn' onClick={() => changeQty(item.id, -1)}>-</Text>
                  <Text className='qty-num'>{cart[item.id]}</Text>
                  <Text className='qty-btn add' onClick={() => addItem(item)}>+</Text>
                </View>
              ) : (
                <Text className='add-btn' onClick={() => addItem(item)}>+</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Cart bar */}
      {cartCount > 0 && (
        <View className='cart-bar' onClick={() => setShowCart(true)}>
          <View className='cart-icon-wrap'>
            <Text className='cart-icon'>🛒</Text>
            <Text className='cart-badge'>{cartCount}</Text>
          </View>
          <Text className='cart-total'>¥{cartTotal}</Text>
          <Text className='cart-checkout'>去下单</Text>
        </View>
      )}

      {/* Cart sheet */}
      {showCart && (
        <View className='overlay' onClick={() => setShowCart(false)}>
          <View className='cart-sheet' onClick={e => e.stopPropagation()}>
            <View className='cs-header'>
              <Text>已选菜品</Text>
              <Text className='cs-clear' onClick={() => setCart({})}>清空</Text>
            </View>
            <ScrollView className='cs-items' scrollY>
              {cartItems.map((i: any) => (
                <View key={i.id} className='cs-item'>
                  <Text>{i.name}</Text>
                  <Text className='cs-item-price'>¥{i.price}</Text>
                  <View className='qty-ctl'>
                    <Text className='qty-btn' onClick={() => changeQty(i.id, -1)}>-</Text>
                    <Text className='qty-num'>{i.qty}</Text>
                    <Text className='qty-btn add' onClick={() => addItem(i)}>+</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View className='cs-footer'>
              <Text className='cs-total'>合计: ¥{cartTotal}</Text>
              <Button className='cs-submit' loading={submitting}
                onClick={submitOrder}>确认下单</Button>
            </View>
          </View>
        </View>
      )}

      {/* Table selector */}
      {tableModal && (
        <View className='overlay' onClick={() => setTableModal(false)}>
          <View className='modal' onClick={e => e.stopPropagation()}>
            <Text className='modal-title'>选择桌号</Text>
            <View className='modal-grid'>
              {tables.map(t => (
                <Text key={t.id} className={`table-btn ${selectedTable === t.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedTable(t.id); setTableModal(false); }}>
                  {t.table_no}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
