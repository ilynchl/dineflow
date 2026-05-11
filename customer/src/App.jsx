import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import MenuPage from './pages/MenuPage';
import OrderListPage from './pages/OrderListPage';
import OrderDetailPage from './pages/OrderDetailPage';
import './App.css';

function RedirectToMenu() {
  const location = useLocation();
  return <Navigate to={`/menu${location.search}`} replace />;
}

function AppShell() {
  const location = useLocation();
  const isOrderDetail = /^\/orders\/\d+$/.test(location.pathname);

  return (
    <div className="app">
      <div className="content">
        <Routes>
          <Route path="/" element={<RedirectToMenu />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </div>
      {isOrderDetail ? null : <BottomNav />}
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
