const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// GET / — 获取偏好配置列表
// 支持 ?category_id=X 过滤（NULL 表示通用偏好始终返回）
router.get('/', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  let sql = 'SELECT * FROM df_tns_preferences WHERE tenant_id = ?';
  const params = [req.tenantId];

  if (req.query.category_id) {
    // 返回匹配分类 + 通用偏好（category_id IS NULL）
    sql += ' AND (category_id = ? OR category_id IS NULL)';
    params.push(parseInt(req.query.category_id));
  }

  sql += ' ORDER BY sort_order';
  const prefs = await db.prepare(sql).all(...params);
  res.json(prefs);
});

// POST / — 新增偏好配置（仅商家后台）
router.post('/', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, type, options, sort_order, category_id } = req.body;
  if (!name || !options || !Array.isArray(options) || options.length === 0) {
    return res.status(400).json({ error: '偏好名称和选项不能为空' });
  }
  const db = getDb();
  const result = await db
    .prepare('INSERT INTO df_tns_preferences (name, type, options, sort_order, category_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, type || 'radio', JSON.stringify(options), sort_order || 0, category_id || null, req.tenantId);
  res.json({ id: result.lastInsertRowid, name });
});

// PUT /:id — 更新偏好配置
router.put('/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { name, type, options, sort_order, category_id } = req.body;
  const db = getDb();
  await db
    .prepare('UPDATE df_tns_preferences SET name = ?, type = ?, options = ?, sort_order = ?, category_id = ? WHERE id = ? AND tenant_id = ?')
    .run(name, type || 'radio', JSON.stringify(options), sort_order || 0, category_id || null, req.params.id, req.tenantId);
  res.json({ success: true });
});

// DELETE /:id — 删除偏好配置
router.delete('/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  await db
    .prepare('DELETE FROM df_tns_preferences WHERE id = ? AND tenant_id = ?')
    .run(req.params.id, req.tenantId);
  res.json({ success: true });
});

module.exports = router;
