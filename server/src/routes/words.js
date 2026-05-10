const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// GET 共享（顾客端用于语音识别）
router.get('/', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const { tenantId } = req;
  const words = await db.prepare('SELECT * FROM df_tns_word_library WHERE tenant_id = ? ORDER BY menu_item_name').all(tenantId);
  res.json(words);
});

// 写操作为商家端
router.post('/', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { alias, menu_item_name } = req.body;
  const { tenantId } = req;
  if (!alias || !menu_item_name) return res.status(400).json({ error: '别名和菜品名不能为空' });
  const db = getDb();
  const result = await db.prepare('INSERT INTO df_tns_word_library (alias, menu_item_name, tenant_id) VALUES (?, ?, ?)').run(alias, menu_item_name, tenantId);
  res.json({ id: result.lastInsertRowid, alias, menu_item_name });
});

router.delete('/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const { tenantId } = req;
  await db.prepare('DELETE FROM df_tns_word_library WHERE id = ? AND tenant_id = ?').run(req.params.id, tenantId);
  res.json({ success: true });
});

router.post('/resolve', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { text } = req.body;
  const { tenantId } = req;
  if (!text) return res.status(400).json({ error: '语音文本不能为空' });
  const db = getDb();

  // Exact match in word library
  const aliasMatch = await db.prepare('SELECT * FROM df_tns_word_library WHERE alias = ? AND tenant_id = ?').get(text, tenantId);
  if (aliasMatch) return res.json({ matched: true, item_name: aliasMatch.menu_item_name, source: 'alias' });

  // Fuzzy match
  const fuzzyAlias = await db.prepare(
    "SELECT * FROM df_tns_word_library WHERE tenant_id = ? AND (? LIKE CONCAT('%', alias, '%') OR alias LIKE CONCAT('%', ?, '%'))"
  ).get(tenantId, text, text);
  if (fuzzyAlias) return res.json({ matched: true, item_name: fuzzyAlias.menu_item_name, source: 'alias_fuzzy' });

  // Direct match with menu items
  const menuItem = await db.prepare(
    "SELECT * FROM df_tns_menu_items WHERE tenant_id = ? AND name LIKE CONCAT('%', ?, '%') AND status = 'active'"
  ).all(tenantId, text);
  if (menuItem.length > 0) return res.json({ matched: true, item_name: menuItem[0].name, source: 'menu', items: menuItem });

  res.json({ matched: false, text });
});

module.exports = router;
