import { useState } from 'react';

export default function PaymentSheet({ visible, orderTotal, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  if (!visible) return null;

  const handleConfirm = async () => {
    setPaying(true);
    setError('');
    try {
      await onConfirm(method);
    } catch (e) {
      setError(e.message);
      setPaying(false);
    }
  };

  const methods = [
    { key: 'cash', label: '现金支付', color: '#666' },
    { key: 'wechat', label: '微信支付', color: '#07c160' },
    { key: 'alipay', label: '支付宝', color: '#1677ff' },
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="payment-sheet" onClick={e => e.stopPropagation()}>
        <div className="ps-header">
          <span>选择支付方式</span>
          <span className="ps-close" onClick={onClose}>✕</span>
        </div>
        <div className="ps-amount">¥{orderTotal}</div>
        <div className="ps-methods">
          {methods.map(m => (
            <button
              key={m.key}
              className={`ps-method ${method === m.key ? 'active' : ''}`}
              onClick={() => setMethod(m.key)}
            >
              <span className="ps-method-dot" style={{ borderColor: method === m.key ? m.color : '#ddd', background: method === m.key ? m.color : 'transparent' }} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        {error && <div className="ps-error">{error}</div>}
        <button className="ps-confirm" onClick={handleConfirm} disabled={paying} style={{ background: methods.find(m => m.key === method)?.color }}>
          {paying ? '支付中...' : `确认支付 ¥${orderTotal}`}
        </button>
      </div>
    </div>
  );
}
