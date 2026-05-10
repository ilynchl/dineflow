import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { orderApi, menuApi } from '../../api';
import './index.css';

const STATUS_MAP: Record<string, string> = {
  pending: '待制作', preparing: '制作中', served: '已上菜',
  paid: '已结账', cancelled: '已取消',
};

export default function Order() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    loadOrders(params?.id);
  }, []);

  const loadOrders = async (focusId?: string) => {
    try {
      const data = await orderApi.getAll({ limit: 20 });
      setOrders(data);
      if (focusId) {
        const found = data.find((o: any) => o.id === parseInt(focusId));
        if (found) setCurrentOrder(found);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      orderApi.getAll({ limit: 20 }).then(setOrders).catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (currentOrder) {
    return (
      <View className='order-detail-page'>
        <View className='od-status' data-status={currentOrder.status}>
          {STATUS_MAP[currentOrder.status] || currentOrder.status}
        </View>
        <Text className='od-no'>订单号: {currentOrder.order_no}</Text>
        <View className='od-items'>
          {currentOrder.items?.map((i: any) => (
            <View key={i.id} className='od-item'>
              <Text>{i.name}</Text>
              <Text>x{i.quantity}</Text>
              <Text>¥{i.unit_price * i.quantity}</Text>
            </View>
          ))}
        </View>
        <View className='od-total'>
          <Text>合计: ¥{currentOrder.total_amount}</Text>
        </View>
        <Button className='back-menu-btn' onClick={() => Taro.navigateBack()}>返回菜单</Button>
      </View>
    );
  }

  return (
    <View className='orders-page'>
      {orders.length === 0 && !loading && (
        <View className='empty-state'>
          <Text>暂无订单</Text>
          <Button className='goto-menu' onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>去点餐</Button>
        </View>
      )}
      {orders.map(o => (
        <View key={o.id} className='order-card' onClick={() => setCurrentOrder(o)}>
          <View className='oc-header'>
            <Text className='oc-no'>{o.order_no}</Text>
            <Text className={`oc-status`} data-status={o.status}>{STATUS_MAP[o.status]}</Text>
          </View>
          <Text className='oc-items'>{o.items?.map((i: any) => i.name).join('、')}</Text>
          <View className='oc-footer'>
            <Text className='oc-total'>¥{o.total_amount}</Text>
            <Text className='oc-time'>{o.created_at?.slice(11, 19)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
