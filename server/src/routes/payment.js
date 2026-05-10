const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.post('/pay', async (req, res) => {
  const { order_id, method, amount, trade_no } = req.body;
  if (!order_id || !method || !amount) return res.status(400).json({ error: '缺少必要参数' });

  const db = getDb();
  const txn = db.transaction(async () => {
    const order = await db.prepare('SELECT * FROM df_orders WHERE id = ?').get(order_id);
    if (!order) throw new Error('订单不存在');
    await db.prepare(
      'INSERT INTO df_payment_records (order_id, method, amount, trade_no, status) VALUES (?, ?, ?, ?, ?)'
    ).run(order_id, method, amount, trade_no || null, 'completed');
    await db.prepare('UPDATE df_orders SET payment_method = ?, payment_status = ?, status = ? WHERE id = ?')
      .run(method, 'paid', 'paid', order_id);
    if (order.table_id) {
      await db.prepare("UPDATE df_tables SET status = 'idle' WHERE id = ?").run(order.table_id);
    }
  });
  try { await txn(); res.json({ success: true }); } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/records', async (req, res) => {
  const db = getDb();
  if (req.query.order_id) {
    const records = await db.prepare('SELECT * FROM df_payment_records WHERE order_id = ? ORDER BY paid_at DESC').all(req.query.order_id);
    return res.json(records);
  }
  const records = await db.prepare('SELECT * FROM df_payment_records ORDER BY paid_at DESC LIMIT 50').all();
  res.json(records);
});

module.exports = router;
