const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', async (req, res) => {
  const db = getDb();
  let sql = `
    SELECT o.*, t.table_no
    FROM df_orders o
    LEFT JOIN df_tables t ON o.table_id = t.id
  `;
  const params = [];
  const conditions = [];

  if (req.query.status) {
    const statuses = req.query.status.split(',');
    conditions.push(`o.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (req.query.table_id) {
    conditions.push('o.table_id = ?');
    params.push(req.query.table_id);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY o.created_at DESC';
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }

  const orders = await db.prepare(sql).all(...params);
  const getItems = db.prepare(`
    SELECT oi.*, m.zone FROM df_order_items oi
    LEFT JOIN df_menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = ? ORDER BY oi.id
  `);
  for (const order of orders) {
    order.items = await getItems.all(order.id);
  }
  res.json(orders);
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const order = await db.prepare(`
    SELECT o.*, t.table_no FROM df_orders o
    LEFT JOIN df_tables t ON o.table_id = t.id WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  order.items = await db.prepare(`
    SELECT oi.*, m.zone FROM df_order_items oi
    LEFT JOIN df_menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).all(order.id);
  order.payments = await db.prepare('SELECT * FROM df_payment_records WHERE order_id = ?').all(order.id);
  res.json(order);
});

router.post('/', async (req, res) => {
  const { table_id, items, customer_name, remark } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '请至少选择一道菜品' });

  const db = getDb();
  const orderNo = 'DF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  const txn = db.transaction(async () => {
    let total = 0;
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_menu_items WHERE id = ?').get(item.menu_item_id);
      if (!menuItem) throw new Error(`菜品 ID ${item.menu_item_id} 不存在`);
      total += menuItem.price * item.quantity;
    }
    const orderResult = await db.prepare(
      'INSERT INTO df_orders (order_no, table_id, customer_name, total_amount, remark) VALUES (?, ?, ?, ?, ?)'
    ).run(orderNo, table_id || null, customer_name || null, total, remark || null);
    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO df_order_items (order_id, menu_item_id, name, quantity, unit_price, flavor) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_menu_items WHERE id = ?').get(item.menu_item_id);
      await insertItem.run(orderId, item.menu_item_id, menuItem.name, item.quantity, menuItem.price, item.flavor || null);
    }
    if (table_id) {
      await db.prepare("UPDATE df_tables SET status = 'occupied' WHERE id = ?").run(table_id);
    }
    return { orderId, orderNo, total };
  });

  try {
    const result = await txn();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/items', async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '请至少选择一道菜品' });
  const db = getDb();
  const txn = db.transaction(async () => {
    const order = await db.prepare("SELECT * FROM df_orders WHERE id = ? AND status != 'paid'").get(req.params.id);
    if (!order) throw new Error('订单不存在或已结账');
    let additionalTotal = 0;
    const insertItem = db.prepare(
      'INSERT INTO df_order_items (order_id, menu_item_id, name, quantity, unit_price, flavor) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_menu_items WHERE id = ?').get(item.menu_item_id);
      if (!menuItem) throw new Error(`菜品 ID ${item.menu_item_id} 不存在`);
      await insertItem.run(req.params.id, item.menu_item_id, menuItem.name, item.quantity, menuItem.price, item.flavor || null);
      additionalTotal += menuItem.price * item.quantity;
    }
    await db.prepare('UPDATE df_orders SET total_amount = total_amount + ? WHERE id = ?').run(additionalTotal, req.params.id);
  });
  try { await txn(); res.json({ success: true }); } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'served', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的状态值' });

  const db = getDb();
  const txn = db.transaction(async () => {
    const order = await db.prepare('SELECT * FROM df_orders WHERE id = ?').get(req.params.id);
    if (!order) throw new Error('订单不存在');
    await db.prepare('UPDATE df_orders SET status = ? WHERE id = ?').run(status, req.params.id);

    if (status === 'preparing') {
      await db.prepare("UPDATE df_order_items SET status = 'preparing' WHERE order_id = ? AND status = 'pending'").run(req.params.id);
    }
    if (status === 'served') {
      await db.prepare("UPDATE df_order_items SET status = 'served' WHERE order_id = ? AND status IN ('pending','preparing','done')").run(req.params.id);
    }
    if (status === 'paid') {
      await db.prepare("UPDATE df_order_items SET status = 'served' WHERE order_id = ? AND status != 'cancelled'").run(req.params.id);
      if (order.table_id) {
        await db.prepare("UPDATE df_tables SET status = 'idle' WHERE id = ?").run(order.table_id);
      }
    }
  });
  try { await txn(); res.json({ success: true }); } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/items/:itemId/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'done', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的状态值' });

  const db = getDb();
  await db.prepare('UPDATE df_order_items SET status = ? WHERE id = ?').run(status, req.params.itemId);

  if (status === 'done' || status === 'served') {
    const item = await db.prepare('SELECT order_id FROM df_order_items WHERE id = ?').get(req.params.itemId);
    if (item) {
      const pendingCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM df_order_items WHERE order_id = ? AND status IN ('pending', 'preparing')"
      ).get(item.order_id);
      if (pendingCount.cnt === 0) {
        await db.prepare("UPDATE df_orders SET status = 'served' WHERE id = ?").run(item.order_id);
      }
    }
  }
  res.json({ success: true });
});

router.get('/kitchen/pending', async (req, res) => {
  const db = getDb();
  const items = await db.prepare(`
    SELECT oi.*, o.order_no, t.table_no, o.created_at as order_time
    FROM df_order_items oi
    JOIN df_orders o ON oi.order_id = o.id
    LEFT JOIN df_tables t ON o.table_id = t.id
    WHERE oi.status IN ('pending', 'preparing')
    ORDER BY CASE WHEN oi.status = 'preparing' THEN 0 ELSE 1 END, o.created_at ASC
  `).all();
  res.json(items);
});

module.exports = router;
