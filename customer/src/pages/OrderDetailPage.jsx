import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../api';
import OrderActions from '../components/OrderActions';
import PaymentSheet from '../components/PaymentSheet';

const STATUS_MAP = {
  pending: '待制作', preparing: '制作中', served: '已上菜',
  paid: '已结账', cancelled: '已取消',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const loadOrder = () => {
    orderApi.get(id)
      .then(setOrder)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
    const t = setInterval(loadOrder, 5000);
    return () => clearInterval(t);
  }, [id]);

  if (loading) return <div className="page-loading">加载中...</div>;
  if (error) return (
    <div className="page-error">
      <p>订单不存在</p>
      <button className="back-menu-btn" onClick={() => navigate('/orders' + window.location.search)}>返回订单列表</button>
    </div>
  );
  if (!order) return null;

  const preferences = order.preferences ? (typeof order.preferences === 'string' ? JSON.parse(order.preferences) : order.preferences) : null;

  return (
    <div className="order-detail-page">
      <div className="od-back" onClick={() => navigate('/orders' + window.location.search)}>← 返回</div>
      <div className="od-status" data-status={order.status}>
        {STATUS_MAP[order.status] || order.status}
      </div>
      <div className="od-no">订单号: {order.order_no || order.id}</div>

      {preferences && (
        <div className="od-preferences">
          {Object.entries(preferences).map(([k, v]) => (
            <span key={k} className="od-pref-tag">{k}: {v}</span>
          ))}
        </div>
      )}

      <div className="od-items">
        {order.items?.map(i => (
          <div key={i.id} className="od-item">
            <span>
              <span className="od-item-name">{i.name}</span>
              {i.preferences && <span className="od-item-prefs">{Object.values(i.preferences).join(' ')}</span>}
              {(i.served_quantity || 0) > 0 && (
                <span className="od-item-progress"> 已上 {i.served_quantity}/{i.quantity}</span>
              )}
            </span>
            <span>x{i.quantity}</span>
            <span>¥{i.unit_price * i.quantity}</span>
          </div>
        ))}
      </div>
      <div className="od-total">合计: ¥{order.total_amount}</div>

      {order.payment_method && (
        <div className="od-payment-info">
          支付方式: {order.payment_method} | 支付状态: {order.payment_status}
        </div>
      )}

      <OrderActions
        status={order.status}
        onAddItems={() => {
          if (order.status === 'paid' || order.status === 'cancelled') {
            navigate('/menu' + window.location.search);
          } else {
            const params = new URLSearchParams(window.location.search);
            params.set('addToOrder', order.id);
            navigate(`/menu?${params.toString()}`);
          }
        }}
        onPay={() => setShowPayment(true)}
      />

      <PaymentSheet
        visible={showPayment}
        orderTotal={order.total_amount}
        onClose={() => setShowPayment(false)}
        onConfirm={async (method) => {
          await orderApi.pay(order.id, { method });
          setShowPayment(false);
          loadOrder();
        }}
      />
    </div>
  );
}
