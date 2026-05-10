const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/summary', async (req, res) => {
  const db = getDb();

  const today = await db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
           COUNT(*) as total_orders,
           COALESCE(SUM(CASE WHEN status IN ('pending','preparing') THEN 1 ELSE 0 END), 0) as active_orders
    FROM df_orders WHERE DATE(created_at) = CURDATE()
  `).get();

  const todayPaid = await db.prepare(`
    SELECT COUNT(*) as paid_orders, COALESCE(SUM(total_amount), 0) as paid_revenue
    FROM df_orders WHERE DATE(created_at) = CURDATE() AND payment_status = 'paid'
  `).get();

  const topItems = await db.prepare(`
    SELECT oi.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_amount
    FROM df_order_items oi JOIN df_orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) = CURDATE()
    GROUP BY oi.menu_item_id, oi.name ORDER BY total_qty DESC LIMIT 10
  `).all();

  const recentOrders = await db.prepare(`
    SELECT o.id, o.order_no, t.table_no, o.total_amount, o.status, o.created_at
    FROM df_orders o LEFT JOIN df_tables t ON o.table_id = t.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();

  res.json({ today: { ...today, ...todayPaid }, top_items: topItems, recent_orders: recentOrders });
});

router.get('/revenue', async (req, res) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  let sql = `SELECT DATE(created_at) as date, COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as revenue
    FROM df_orders WHERE payment_status = 'paid'`;
  const params = [];
  if (start_date) { sql += ' AND DATE(created_at) >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND DATE(created_at) <= ?'; params.push(end_date); }
  sql += ' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30';
  const data = await db.prepare(sql).all(...params);
  res.json(data);
});

module.exports = router;
