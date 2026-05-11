import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = location.pathname.startsWith('/orders') ? 'orders' : 'menu';

  return (
    <div className="bottom-nav">
      <div className={`bn-item ${activeKey === 'menu' ? 'active' : ''}`} onClick={() => navigate('/menu' + window.location.search)}>
        <span className="bn-icon">🍽️</span>
        <span className="bn-label">菜单</span>
      </div>
      <div className={`bn-item ${activeKey === 'orders' ? 'active' : ''}`} onClick={() => navigate('/orders' + window.location.search)}>
        <span className="bn-icon">📋</span>
        <span className="bn-label">订单</span>
      </div>
    </div>
  );
}
