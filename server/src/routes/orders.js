const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// ============================================================
// GET /kitchen/pending — 厨房待处理菜品（商家专用）
// 必须放在 GET /:id 之前，否则会被 :id 提前匹配
// ============================================================
router.get('/kitchen/pending', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const items = await db.prepare(`
    SELECT oi.*, o.order_no, t.table_no, o.created_at AS order_time
    FROM df_tns_order_items oi
    JOIN df_tns_orders o ON oi.order_id = o.id
    LEFT JOIN df_tns_tables t ON o.table_id = t.id
    WHERE oi.status IN ('pending', 'preparing') AND o.tenant_id = ?
    ORDER BY CASE WHEN oi.status = 'preparing' THEN 0 ELSE 1 END, o.created_at ASC
  `).all(req.tenantId);
  res.json(items);
});

// ============================================================
// GET /kitchen/grouped — 厨房聚合视图（商家专用）
// ============================================================
router.get('/kitchen/grouped', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const groupBy = req.query.group_by || 'table';
  const db = getDb();

  if (groupBy === 'item') {
    const rows = await db.prepare(`
      SELECT oi.name, oi.flavor, SUM(oi.quantity) as total_qty,
             SUM(oi.served_quantity) as served_qty,
             GROUP_CONCAT(DISTINCT t.table_no ORDER BY t.table_no SEPARATOR '、') as tables,
             oi.unit_price
      FROM df_tns_order_items oi
      JOIN df_tns_orders o ON oi.order_id = o.id
      LEFT JOIN df_tns_tables t ON o.table_id = t.id
      WHERE oi.status IN ('pending', 'preparing') AND o.tenant_id = ?
      GROUP BY oi.name, oi.flavor
      ORDER BY SUM(oi.quantity) DESC
    `).all(req.tenantId);
    return res.json(rows);
  }

  const items = await db.prepare(`
    SELECT oi.*, o.order_no, t.table_no, o.created_at AS order_time
    FROM df_tns_order_items oi
    JOIN df_tns_orders o ON oi.order_id = o.id
    LEFT JOIN df_tns_tables t ON o.table_id = t.id
    WHERE oi.status IN ('pending', 'preparing') AND o.tenant_id = ?
    ORDER BY CASE WHEN oi.status = 'preparing' THEN 0 ELSE 1 END, o.created_at ASC
  `).all(req.tenantId);
  res.json(items);
});

// ============================================================
// GET / — 订单列表（顾客 + 商家共用）
// ============================================================
router.get('/', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  let sql = `
    SELECT o.*, t.table_no
    FROM df_tns_orders o
    LEFT JOIN df_tns_tables t ON o.table_id = t.id
    WHERE o.tenant_id = ?
  `;
  const params = [req.tenantId];
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

  if (conditions.length > 0) sql += ' AND ' + conditions.join(' AND ');
  sql += ' ORDER BY o.created_at DESC';

  if (req.query.limit) {
    const n = parseInt(req.query.limit);
    if (n > 0) { sql += ` LIMIT ${n}`; }
  }

  const orders = await db.prepare(sql).all(...params);
  const getItems = db.prepare(`
    SELECT oi.*, m.zone FROM df_tns_order_items oi
    LEFT JOIN df_tns_menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = ? ORDER BY oi.id
  `);
  for (const order of orders) {
    order.items = await getItems.all(order.id);
  }
  res.json(orders);
});

// ============================================================
// GET /:id — 订单详情（顾客 + 商家共用）
// ============================================================
router.get('/:id', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const order = await db.prepare(`
    SELECT o.*, t.table_no FROM df_tns_orders o
    LEFT JOIN df_tns_tables t ON o.table_id = t.id
    WHERE o.id = ? AND o.tenant_id = ?
  `).get(req.params.id, req.tenantId);
  if (!order) return res.status(404).json({ error: '订单不存在' });

  order.items = await db.prepare(`
    SELECT oi.*, m.zone FROM df_tns_order_items oi
    LEFT JOIN df_tns_menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = ? ORDER BY oi.id
  `).all(order.id);
  order.payments = await db.prepare('SELECT * FROM df_tns_payment_records WHERE order_id = ?').all(order.id);
  res.json(order);
});

// ============================================================
// POST / — 创建订单（顾客扫码点餐 + 商家报串）
//
// tenant_id 获取方式：
//   1. 有 table_id → 查 df_tns_tables 获取 tenant_id（防篡改）
//   2. 无 table_id → 使用 req.tenantId（商家报串场景）
// ============================================================
router.post('/', tenantContext, requireTenant, async (req, res) => {
  const { table_id, items, customer_name, remark, preferences } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '请至少选择一道菜品' });

  const db = getDb();

  // 确定租户 ID
  let tenantId = req.tenantId;
  if (table_id) {
    const table = await db.prepare('SELECT tenant_id FROM df_tns_tables WHERE id = ?').get(table_id);
    if (!table) return res.status(400).json({ error: '桌台不存在' });
    tenantId = table.tenant_id;
  }

  const orderNo = 'DF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  const txn = db.transaction(async () => {
    let total = 0;
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_tns_menu_items WHERE id = ? AND tenant_id = ?').get(item.menu_item_id, tenantId);
      if (!menuItem) throw new Error(`菜品 ID ${item.menu_item_id} 不存在`);
      total += menuItem.price * item.quantity;
    }

    const orderResult = await db.prepare(
      'INSERT INTO df_tns_orders (order_no, table_id, customer_name, total_amount, remark, preferences, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(orderNo, table_id || null, customer_name || null, total, remark || null, preferences ? JSON.stringify(preferences) : null, tenantId);
    const orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO df_tns_order_items (order_id, menu_item_id, name, quantity, unit_price, flavor, preferences, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_tns_menu_items WHERE id = ? AND tenant_id = ?').get(item.menu_item_id, tenantId);
      const itemPrefs = item.preferences || undefined;
      await insertItem.run(orderId, item.menu_item_id, menuItem.name, item.quantity, menuItem.price, item.flavor || null, itemPrefs ? JSON.stringify(itemPrefs) : null, tenantId);
    }

    if (table_id) {
      await db.prepare("UPDATE df_tns_tables SET status = 'occupied' WHERE id = ?").run(table_id);
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

// ============================================================
// POST /:id/items — 加菜（商家专用）
// ============================================================
router.post('/:id/items', tenantContext, requireTenant, async (req, res) => {
  const { items, preferences } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: '请至少选择一道菜品' });

  const db = getDb();

  const txn = db.transaction(async () => {
    const order = await db.prepare("SELECT * FROM df_tns_orders WHERE id = ? AND tenant_id = ? AND status NOT IN ('paid', 'cancelled')")
      .get(req.params.id, req.tenantId);
    if (!order) throw new Error('订单不存在或已结账');

    let additionalTotal = 0;
    const insertItem = db.prepare(
      'INSERT INTO df_tns_order_items (order_id, menu_item_id, name, quantity, unit_price, flavor, preferences, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const menuItem = await db.prepare('SELECT * FROM df_tns_menu_items WHERE id = ? AND tenant_id = ?').get(item.menu_item_id, req.tenantId);
      if (!menuItem) throw new Error(`菜品 ID ${item.menu_item_id} 不存在`);
      const itemPrefs = item.preferences || undefined;
      await insertItem.run(req.params.id, item.menu_item_id, menuItem.name, item.quantity, menuItem.price, item.flavor || null, itemPrefs ? JSON.stringify(itemPrefs) : null, req.tenantId);
      additionalTotal += menuItem.price * item.quantity;
    }

    await db.prepare('UPDATE df_tns_orders SET total_amount = total_amount + ? WHERE id = ?').run(additionalTotal, req.params.id);
  });

  try {
    await txn();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// POST /:id/pay — 顾客自助支付（无需 JWT）
// ============================================================
router.post('/:id/pay', tenantContext, requireTenant, async (req, res) => {
  const { method = 'cash' } = req.body;
  const validMethods = ['cash', 'wechat', 'alipay'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: '无效的支付方式' });
  }

  const db = getDb();
  const txn = db.transaction(async () => {
    const order = await db.prepare(
      "SELECT * FROM df_tns_orders WHERE id = ? AND tenant_id = ? AND status NOT IN ('cancelled', 'paid')"
    ).get(req.params.id, req.tenantId);
    if (!order) throw new Error('订单不存在或已取消');

    await db.prepare(
      'INSERT INTO df_tns_payment_records (order_id, method, amount, status, tenant_id) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.id, method, order.total_amount, 'completed', req.tenantId);

    await db.prepare(
      'UPDATE df_tns_orders SET payment_method = ?, payment_status = ?, status = ? WHERE id = ? AND tenant_id = ?'
    ).run(method, 'paid', 'paid', req.params.id, req.tenantId);

    await db.prepare(
      "UPDATE df_tns_order_items SET status = 'served', served_quantity = quantity WHERE order_id = ? AND status != 'cancelled'"
    ).run(req.params.id);

    if (order.table_id) {
      await db.prepare("UPDATE df_tns_tables SET status = 'idle' WHERE id = ?").run(order.table_id);
    }
  });

  try {
    await txn();
    const updated = await db.prepare('SELECT * FROM df_tns_orders WHERE id = ?').get(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// PATCH /items/:itemId/serve — 部分上菜
// ============================================================
router.patch('/items/:itemId/serve', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: '上菜数量无效' });

  const db = getDb();
  const item = await db.prepare(`
    SELECT oi.*, o.tenant_id FROM df_tns_order_items oi
    JOIN df_tns_orders o ON oi.order_id = o.id
    WHERE oi.id = ? AND o.tenant_id = ?
  `).get(req.params.itemId, req.tenantId);
  if (!item) return res.status(404).json({ error: '菜品不存在' });
  if (item.status === 'cancelled') return res.status(400).json({ error: '菜品已取消' });

  const newServed = Math.min((item.served_quantity || 0) + quantity, item.quantity);
  const fullyServed = newServed >= item.quantity;
  const newStatus = fullyServed ? 'served' : (item.status === 'pending' ? 'preparing' : item.status);

  const txn = db.transaction(async () => {
    await db.prepare(
      'UPDATE df_tns_order_items SET served_quantity = ?, status = ? WHERE id = ?'
    ).run(newServed, newStatus, req.params.itemId);

    if (fullyServed) {
      const pendingCount = await db.prepare(
        "SELECT COUNT(*) as cnt FROM df_tns_order_items WHERE order_id = ? AND status IN ('pending', 'preparing') AND id != ?"
      ).get(item.order_id, req.params.itemId);
      if (pendingCount.cnt === 0) {
        await db.prepare("UPDATE df_tns_orders SET status = 'served' WHERE id = ?").run(item.order_id);
      }
    }
  });

  try {
    await txn();
    res.json({ success: true, served_quantity: newServed, status: newStatus });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// PATCH /:id/status — 更新订单状态（商家专用）
// ============================================================
router.patch('/:id/status', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'served', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的状态值' });

  const db = getDb();

  const txn = db.transaction(async () => {
    const order = await db.prepare('SELECT * FROM df_tns_orders WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!order) throw new Error('订单不存在');

    await db.prepare('UPDATE df_tns_orders SET status = ? WHERE id = ?').run(status, req.params.id);

    if (status === 'preparing') {
      await db.prepare("UPDATE df_tns_order_items SET status = 'preparing' WHERE order_id = ? AND status = 'pending'").run(req.params.id);
    }
    if (status === 'served') {
      await db.prepare("UPDATE df_tns_order_items SET status = 'served' WHERE order_id = ? AND status IN ('pending','preparing','done')").run(req.params.id);
    }
    if (status === 'paid') {
      await db.prepare("UPDATE df_tns_order_items SET status = 'served' WHERE order_id = ? AND status != 'cancelled'").run(req.params.id);
      if (order.table_id) {
        await db.prepare("UPDATE df_tns_tables SET status = 'idle' WHERE id = ?").run(order.table_id);
      }
    }
  });

  try {
    await txn();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// PATCH /items/:itemId/status — 单道菜品状态更新（商家专用）
// ============================================================
router.patch('/items/:itemId/status', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'done', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的状态值' });

  const db = getDb();

  // 验证菜品所属订单属于当前租户
  const itemWithOrder = await db.prepare(`
    SELECT oi.*, o.tenant_id FROM df_tns_order_items oi
    JOIN df_tns_orders o ON oi.order_id = o.id
    WHERE oi.id = ? AND o.tenant_id = ?
  `).get(req.params.itemId, req.tenantId);
  if (!itemWithOrder) return res.status(404).json({ error: '菜品不存在' });

  await db.prepare('UPDATE df_tns_order_items SET status = ? WHERE id = ?').run(status, req.params.itemId);

  if (status === 'done' || status === 'served') {
    const pendingCount = await db.prepare(
      "SELECT COUNT(*) as cnt FROM df_tns_order_items WHERE order_id = ? AND status IN ('pending', 'preparing')"
    ).get(itemWithOrder.order_id);
    if (pendingCount.cnt === 0) {
      await db.prepare("UPDATE df_tns_orders SET status = 'served' WHERE id = ?").run(itemWithOrder.order_id);
    }
  }

  res.json({ success: true });
});

module.exports = router;
