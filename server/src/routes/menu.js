const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// 分类管理 - 读取（商家后台 & 顾客端共用）
router.get('/categories', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const categories = await db
    .prepare('SELECT * FROM df_tns_categories WHERE tenant_id = ? ORDER BY sort_order')
    .all(req.tenantId);
  res.json(categories);
});

// 分类管理 - 写入（仅商家后台）
router.post('/categories', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const db = getDb();
  const result = await db
    .prepare('INSERT INTO df_tns_categories (name, sort_order, tenant_id) VALUES (?, ?, ?)')
    .run(name, sort_order || 0, req.tenantId);
  res.json({ id: result.lastInsertRowid, name });
});

router.put('/categories/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, sort_order } = req.body;
  const db = getDb();
  await db
    .prepare('UPDATE df_tns_categories SET name = ?, sort_order = ? WHERE id = ? AND tenant_id = ?')
    .run(name, sort_order || 0, req.params.id, req.tenantId);
  res.json({ success: true });
});

router.delete('/categories/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  await db
    .prepare('DELETE FROM df_tns_categories WHERE id = ? AND tenant_id = ?')
    .run(req.params.id, req.tenantId);
  res.json({ success: true });
});

// 菜品列表 - 读取（商家后台 & 顾客端共用）
router.get('/items', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  let sql = `SELECT m.*, c.name as category_name FROM df_tns_menu_items m LEFT JOIN df_tns_categories c ON m.category_id = c.id`;
  const params = [];
  const conditions = [];

  // tenant_id 始终作为过滤条件
  conditions.push('m.tenant_id = ?');
  params.push(req.tenantId);

  if (req.query.category_id) {
    conditions.push('m.category_id = ?');
    params.push(req.query.category_id);
  }
  if (req.query.status) {
    conditions.push('m.status = ?');
    params.push(req.query.status);
  }
  if (req.query.zone) {
    conditions.push('m.zone = ?');
    params.push(req.query.zone);
  }

  sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY m.category_id, m.name';

  const items = await db.prepare(sql).all(...params);
  res.json(items);
});

// 菜品详情 - 读取（商家后台 & 顾客端共用）
router.get('/items/:id', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const item = await db
    .prepare(
      `SELECT m.*, c.name as category_name FROM df_tns_menu_items m LEFT JOIN df_tns_categories c ON m.category_id = c.id WHERE m.id = ? AND m.tenant_id = ?`
    )
    .get(req.params.id, req.tenantId);
  if (!item) return res.status(404).json({ error: '菜品不存在' });
  res.json(item);
});

// 菜品管理 - 写入（仅商家后台）
router.post('/items', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, unit, price, category_id, image, zone } = req.body;
  if (!name || !price) return res.status(400).json({ error: '菜名和价格不能为空' });
  const db = getDb();
  const result = await db
    .prepare('INSERT INTO df_tns_menu_items (name, unit, price, category_id, image, zone, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, unit || '串', price, category_id || null, image || null, zone || 'bbq', req.tenantId);
  res.json({ id: result.lastInsertRowid, name, price });
});

router.put('/items/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, unit, price, category_id, image, status, zone } = req.body;
  const db = getDb();
  await db
    .prepare(
      `UPDATE df_tns_menu_items SET name = COALESCE(?, name), unit = COALESCE(?, unit), price = COALESCE(?, price), category_id = COALESCE(?, category_id), image = COALESCE(?, image), status = COALESCE(?, status), zone = COALESCE(?, zone) WHERE id = ? AND tenant_id = ?`
    )
    .run(name, unit, price, category_id, image, status, zone, req.params.id, req.tenantId);
  res.json({ success: true });
});

router.delete('/items/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  await db
    .prepare('DELETE FROM df_tns_menu_items WHERE id = ? AND tenant_id = ?')
    .run(req.params.id, req.tenantId);
  res.json({ success: true });
});

router.patch('/items/:id/status', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'sold_out', 'paused'].includes(status)) return res.status(400).json({ error: '无效的状态值' });
  const db = getDb();
  await db
    .prepare('UPDATE df_tns_menu_items SET status = ? WHERE id = ? AND tenant_id = ?')
    .run(status, req.params.id, req.tenantId);
  res.json({ success: true });
});

module.exports = router;
