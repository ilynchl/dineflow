const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', async (req, res) => {
  const db = getDb();
  const codes = await db.prepare(`
    SELECT q.*, t.table_no FROM df_qr_codes q
    LEFT JOIN df_tables t ON q.table_id = t.id ORDER BY q.created_at DESC
  `).all();
  res.json(codes);
});

router.put('/:id', async (req, res) => {
  const { target_url } = req.body;
  const db = getDb();
  await db.prepare('UPDATE df_qr_codes SET target_url = ? WHERE id = ?').run(target_url, req.params.id);
  res.json({ success: true });
});

router.post('/generate', async (req, res) => {
  const { count } = req.body;
  const num = parseInt(count) || 1;
  const db = getDb();
  const txn = db.transaction(async () => {
    const row = await db.prepare('SELECT COALESCE(MAX(id), 0) as mx FROM df_qr_codes').get();
    const maxId = row?.mx ?? 0;
    for (let i = 1; i <= num; i++) {
      const code = `G${maxId + i}`;
      try { await db.prepare('INSERT INTO df_qr_codes (code) VALUES (?)').run(code); } catch (e) { /* ignore dup */ }
    }
  });
  await txn();
  res.json({ success: true, generated: num });
});

module.exports = router;
