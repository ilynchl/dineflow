const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', async (req, res) => {
  const db = getDb();
  const words = await db.prepare('SELECT * FROM df_word_library ORDER BY menu_item_name').all();
  res.json(words);
});

router.post('/', async (req, res) => {
  const { alias, menu_item_name } = req.body;
  if (!alias || !menu_item_name) return res.status(400).json({ error: '别名和菜品名不能为空' });
  const db = getDb();
  const result = await db.prepare('INSERT INTO df_word_library (alias, menu_item_name) VALUES (?, ?)').run(alias, menu_item_name);
  res.json({ id: result.lastInsertRowid, alias, menu_item_name });
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_word_library WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/resolve', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '语音文本不能为空' });
  const db = getDb();

  // Exact match in word library
  const aliasMatch = await db.prepare('SELECT * FROM df_word_library WHERE alias = ?').get(text);
  if (aliasMatch) return res.json({ matched: true, item_name: aliasMatch.menu_item_name, source: 'alias' });

  // Fuzzy match
  const fuzzyAlias = await db.prepare(
    "SELECT * FROM df_word_library WHERE ? LIKE CONCAT('%', alias, '%') OR alias LIKE CONCAT('%', ?, '%')"
  ).get(text, text);
  if (fuzzyAlias) return res.json({ matched: true, item_name: fuzzyAlias.menu_item_name, source: 'alias_fuzzy' });

  // Direct match with menu items
  const menuItem = await db.prepare(
    "SELECT * FROM df_menu_items WHERE name LIKE CONCAT('%', ?, '%') AND status = 'active'"
  ).all(text);
  if (menuItem.length > 0) return res.json({ matched: true, item_name: menuItem[0].name, source: 'menu', items: menuItem });

  res.json({ matched: false, text });
});

module.exports = router;
