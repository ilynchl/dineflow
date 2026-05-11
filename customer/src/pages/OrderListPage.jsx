import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../api';

const STATUS_MAP = {
  pending: '待制作', preparing: '制作中', served: '已上菜',
  paid: '已结账', cancelled: '已取消',
};

export default function OrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    orderApi.getAll({ limit: 50 })
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="orders-page">
      {orders.length === 0 && !loading && <div className="empty-state">暂无订单</div>}
      {orders.map(o => (
        <div key={o.id} className="order-card" onClick={() => navigate(`/orders/${o.id}${window.location.search}`)}>
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
  );
}
