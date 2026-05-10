const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.post('/split', async (req, res) => {
  const { source_table_id, splits } = req.body;
  if (!splits || splits.length === 0) return res.status(400).json({ error: '请填写分串信息' });
  const db = getDb();
  try {
    const insert = db.prepare(
      'INSERT INTO df_split_records (source_table_id, target_table_id, menu_item_name, quantity, wait_minutes, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const s of splits) {
      await insert.run(source_table_id || null, s.target_table_id || null, s.menu_item_name, s.quantity, s.wait_minutes || 0, 'pending');
    }
    res.json({ success: true, count: splits.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/splits', async (req, res) => {
  const db = getDb();
  let sql = `
    SELECT s.*, src.table_no as source_table, tgt.table_no as target_table
    FROM df_split_records s
    LEFT JOIN df_tables src ON s.source_table_id = src.id
    LEFT JOIN df_tables tgt ON s.target_table_id = tgt.id
  `;
  const params = [];
  if (req.query.status) { sql += ' WHERE s.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY s.created_at DESC';
  const splits = await db.prepare(sql).all(...params);
  res.json(splits);
});

router.patch('/splits/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'done', 'served'].includes(status)) return res.status(400).json({ error: '无效的状态' });
  const db = getDb();
  await db.prepare('UPDATE df_split_records SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
