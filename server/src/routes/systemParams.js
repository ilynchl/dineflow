const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware, requireRole('super_admin'));

// Get all system params as array (with description)
router.get('/', async (req, res) => {
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM df_sys_params ORDER BY id').all();
  res.json(rows);
});

// Create a system param
router.post('/', async (req, res) => {
  const { param_key, param_value, description } = req.body;
  if (!param_key) return res.status(400).json({ error: '参数键不能为空' });

  const db = getDb();
  const existing = await db.prepare('SELECT id FROM df_sys_params WHERE param_key = ?').get(param_key);
  if (existing) return res.status(400).json({ error: '参数键已存在' });

  await db.prepare('INSERT INTO df_sys_params (param_key, param_value, description) VALUES (?, ?, ?)')
    .run(param_key, String(param_value || ''), description || '');
  res.json({ success: true });
});

// Update a system param
router.put('/:key', async (req, res) => {
  const { param_value, description } = req.body;
  const db = getDb();

  const existing = await db.prepare('SELECT id FROM df_sys_params WHERE param_key = ?').get(req.params.key);
  if (!existing) return res.status(404).json({ error: '参数不存在' });

  if (param_value !== undefined) {
    await db.prepare('UPDATE df_sys_params SET param_value = ? WHERE param_key = ?').run(String(param_value), req.params.key);
  }
  if (description !== undefined) {
    await db.prepare('UPDATE df_sys_params SET description = ? WHERE param_key = ?').run(description, req.params.key);
  }

  res.json({ success: true });
});

// Delete a system param
router.delete('/:key', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_sys_params WHERE param_key = ?').run(req.params.key);
  res.json({ success: true });
});

module.exports = router;
