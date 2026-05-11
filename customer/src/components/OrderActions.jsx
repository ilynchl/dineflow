export default function OrderActions({ status, onAddItems, onPay }) {
  if (status === 'paid' || status === 'cancelled') {
    return (
      <div className="order-actions disabled">
        <span className="oa-status-text">
          {status === 'paid' ? '✅ 已结账' : '已取消'}
        </span>
      </div>
    );
  }

  return (
    <div className="order-actions">
      <button className="oa-btn oa-add" onClick={onAddItems}>加菜</button>
      <button className="oa-btn oa-pay" onClick={onPay}>支付</button>
    </div>
  );
}
