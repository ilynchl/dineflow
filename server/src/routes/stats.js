const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// 所有统计接口均为商家端操作
router.use(authMiddleware, tenantContext, requireTenant);

router.get('/summary', async (req, res) => {
  const db = getDb();
  const { tenantId } = req;

  const today = await db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
           COUNT(*) as total_orders,
           COALESCE(SUM(CASE WHEN status IN ('pending','preparing') THEN 1 ELSE 0 END), 0) as active_orders
    FROM df_tns_orders WHERE tenant_id = ? AND DATE(created_at) = CURDATE()
  `).get(tenantId);

  const todayPaid = await db.prepare(`
    SELECT COUNT(*) as paid_orders, COALESCE(SUM(total_amount), 0) as paid_revenue
    FROM df_tns_orders WHERE tenant_id = ? AND DATE(created_at) = CURDATE() AND payment_status = 'paid'
  `).get(tenantId);

  const topItems = await db.prepare(`
    SELECT oi.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_amount
    FROM df_tns_order_items oi JOIN df_tns_orders o ON oi.order_id = o.id
    WHERE o.tenant_id = ? AND DATE(o.created_at) = CURDATE()
    GROUP BY oi.menu_item_id, oi.name ORDER BY total_qty DESC LIMIT 10
  `).all(tenantId);

  const recentOrders = await db.prepare(`
    SELECT o.id, o.order_no, t.table_no, o.total_amount, o.status, o.created_at
    FROM df_tns_orders o LEFT JOIN df_tns_tables t ON o.table_id = t.id
    WHERE o.tenant_id = ?
    ORDER BY o.created_at DESC LIMIT 10
  `).all(tenantId);

  res.json({ today: { ...today, ...todayPaid }, top_items: topItems, recent_orders: recentOrders });
});

router.get('/revenue', async (req, res) => {
  const db = getDb();
  const { tenantId } = req;
  const { start_date, end_date } = req.query;
  let sql = `SELECT DATE(created_at) as date, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as revenue
    FROM df_tns_orders WHERE payment_status = 'paid' AND tenant_id = ?`;
  const params = [tenantId];
  if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
  sql += ' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30';
  const data = await db.prepare(sql).all(...params);
  res.json(data);
});

module.exports = router;
