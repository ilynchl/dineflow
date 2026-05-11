import { useMemo } from 'react';

export default function CartSheet({
  cartItems, cartTotal, cartCount,
  addItem, changeQty, onClear, onClose, onSubmit,
  submitting, submitLabel = '确认下单', selectedTable,
  prefConfig, preferences, onPreferenceChange, remark, onRemarkChange,
}) {
  // 按分类分组
  const groups = useMemo(() => {
    const map = {};
    cartItems.forEach(item => {
      const catId = item.category_id || 0;
      if (!map[catId]) {
        map[catId] = { category_id: catId, name: item.category_name || '其他', items: [] };
      }
      map[catId].items.push(item);
    });
    return Object.values(map);
  }, [cartItems]);

  const canSubmit = cartItems.length > 0 && (selectedTable || submitLabel === '加入订单');

  const handleSubmit = () => {
    // 校验：每组偏好是否已选
    for (const group of groups) {
      const catPrefs = prefConfig.filter(p => !p.category_id || p.category_id === group.category_id);
      const selected = preferences[group.category_id] || {};
      const missing = catPrefs.filter(p => !selected[p.name]);
      if (missing.length > 0) {
        alert(`请为「${group.name}」选择: ${missing.map(p => p.name).join('、')}`);
        return;
      }
    }
    onSubmit();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="cart-sheet" onClick={e => e.stopPropagation()}>
        <div className="cs-header">
          <span>已选菜品 ({cartCount})</span>
          <span className="cs-clear" onClick={handleClear}>清空</span>
        </div>
        <div className="cs-items">
          {groups.map(group => {
            const catPrefs = prefConfig.filter(p => !p.category_id || p.category_id === group.category_id);
            const groupPrefs = preferences[group.category_id] || {};
            return (
              <div key={group.category_id} className="cs-group">
                <div className="cs-group-title">━ {group.name} ━</div>
                {group.items.map(i => (
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
                {catPrefs.length > 0 && (
                  <div className="cs-group-prefs">
                    {catPrefs.map(p => (
                      <div key={p.id} className="cs-pref-row">
                        <span className="cs-pref-label">{p.name}</span>
                        <div className="cs-pref-options">
                          {(p.options || []).map(opt => (
                            <button key={opt}
                              className={`cs-pref-btn ${groupPrefs[p.name] === opt ? 'active' : ''}`}
                              onClick={() => onPreferenceChange(group.category_id, p.name, opt)}
                            >{opt}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="cs-remark">
          <input className="cs-remark-input" placeholder="备注（选填）" value={remark || ''}
            onChange={e => onRemarkChange(e.target.value)} />
        </div>

        <div className="cs-footer">
          <span className="cs-total">合计: ¥{cartTotal}</span>
          <button className="cs-submit" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? '提交中...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
