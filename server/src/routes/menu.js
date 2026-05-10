const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/categories', async (req, res) => {
  const db = getDb();
  const categories = await db.prepare('SELECT * FROM df_categories ORDER BY sort_order').all();
  res.json(categories);
});

router.post('/categories', async (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const db = getDb();
  const result = await db.prepare('INSERT INTO df_categories (name, sort_order) VALUES (?, ?)').run(name, sort_order || 0);
  res.json({ id: result.lastInsertRowid, name });
});

router.put('/categories/:id', async (req, res) => {
  const { name, sort_order } = req.body;
  const db = getDb();
  await db.prepare('UPDATE df_categories SET name = ?, sort_order = ? WHERE id = ?').run(name, sort_order || 0, req.params.id);
  res.json({ success: true });
});

router.delete('/categories/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/items', async (req, res) => {
  const db = getDb();
  let sql = `
    SELECT m.*, c.name as category_name
    FROM df_menu_items m
    LEFT JOIN df_categories c ON m.category_id = c.id
  `;
  const params = [];
  const conditions = [];

  if (req.query.category_id) {
    conditions.push('m.category_id = ?');
    params.push(req.query.category_id);
  }
  if (req.query.status) {
    conditions.push('m.status = ?');
    params.push(req.query.status);
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY m.category_id, m.name';

  const items = await db.prepare(sql).all(...params);
  res.json(items);
});

router.get('/items/:id', async (req, res) => {
  const db = getDb();
  const item = await db.prepare(`
    SELECT m.*, c.name as category_name
    FROM df_menu_items m
    LEFT JOIN df_categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!item) return res.status(404).json({ error: '菜品不存在' });
  res.json(item);
});

router.post('/items', async (req, res) => {
  const { name, unit, price, category_id, image, zone } = req.body;
  if (!name || !price) return res.status(400).json({ error: '菜名和价格不能为空' });
  const db = getDb();
  const result = await db.prepare(
    'INSERT INTO df_menu_items (name, unit, price, category_id, image, zone) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, unit || '串', price, category_id || null, image || null, zone || 'bbq');
  res.json({ id: result.lastInsertRowid, name, price });
});

router.put('/items/:id', async (req, res) => {
  const { name, unit, price, category_id, image, status, zone } = req.body;
  const db = getDb();
  await db.prepare(`
    UPDATE df_menu_items SET
      name = COALESCE(?, name),
      unit = COALESCE(?, unit),
      price = COALESCE(?, price),
      category_id = COALESCE(?, category_id),
      image = COALESCE(?, image),
      status = COALESCE(?, status),
      zone = COALESCE(?, zone)
    WHERE id = ?
  `).run(name, unit, price, category_id, image, status, zone, req.params.id);
  res.json({ success: true });
});

router.delete('/items/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_menu_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.patch('/items/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'sold_out', 'paused'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }
  const db = getDb();
  await db.prepare('UPDATE df_menu_items SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
