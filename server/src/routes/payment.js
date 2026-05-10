const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// 所有支付接口均为商家端操作
router.use(authMiddleware, tenantContext, requireTenant);

router.post('/pay', async (req, res) => {
  const { order_id, method, amount, trade_no } = req.body;
  const { tenantId } = req;
  if (!order_id || !method || !amount) return res.status(400).json({ error: '缺少必要参数' });

  const db = getDb();
  const txn = db.transaction(async () => {
    const order = await db.prepare('SELECT * FROM df_tns_orders WHERE id = ? AND tenant_id = ?').get(order_id, tenantId);
    if (!order) throw new Error('订单不存在');
    await db.prepare(
      'INSERT INTO df_tns_payment_records (order_id, method, amount, trade_no, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(order_id, method, amount, trade_no || null, 'completed', tenantId);
    await db.prepare('UPDATE df_tns_orders SET payment_method = ?, payment_status = ?, status = ? WHERE id = ? AND tenant_id = ?')
      .run(method, 'paid', 'paid', order_id, tenantId);
    if (order.table_id) {
      await db.prepare("UPDATE df_tns_tables SET status = 'idle' WHERE id = ?").run(order.table_id);
    }
  });
  try { await txn(); res.json({ success: true }); } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/records', async (req, res) => {
  const db = getDb();
  const { tenantId } = req;
  if (req.query.order_id) {
    const records = await db.prepare('SELECT * FROM df_tns_payment_records WHERE order_id = ? AND tenant_id = ? ORDER BY paid_at DESC').all(req.query.order_id, tenantId);
    return res.json(records);
  }
  const records = await db.prepare('SELECT * FROM df_tns_payment_records WHERE tenant_id = ? ORDER BY paid_at DESC LIMIT 50').all(tenantId);
  res.json(records);
});

module.exports = router;
