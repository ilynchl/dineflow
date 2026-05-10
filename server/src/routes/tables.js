const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', async (req, res) => {
  const db = getDb();
  const tables = await db.prepare(`
    SELECT t.*, z.name as zone_name
    FROM df_tables t
    LEFT JOIN df_zones z ON t.zone_id = z.id
    ORDER BY t.table_no
  `).all();
  res.json(tables);
});

router.get('/zones', async (req, res) => {
  const db = getDb();
  const zones = await db.prepare('SELECT * FROM df_zones ORDER BY sort_order').all();
  res.json(zones);
});

router.post('/zones', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '区域名称不能为空' });
  const db = getDb();
  const result = await db.prepare('INSERT INTO df_zones (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

router.delete('/zones/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_zones WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/', async (req, res) => {
  const { table_no, zone_id } = req.body;
  if (!table_no) return res.status(400).json({ error: '桌号不能为空' });
  const db = getDb();
  try {
    const result = await db.prepare('INSERT INTO df_tables (table_no, zone_id) VALUES (?, ?)').run(table_no, zone_id || null);
    const code = `T${result.lastInsertRowid}`;
    await db.prepare('UPDATE df_tables SET qr_code = ? WHERE id = ?').run(code, result.lastInsertRowid);
    await db.prepare('INSERT INTO df_qr_codes (code, table_id) VALUES (?, ?)').run(code, result.lastInsertRowid);
    res.json({ id: result.lastInsertRowid, table_no, qr_code: code });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: '桌号已存在' });
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const { table_no, zone_id, status } = req.body;
  const db = getDb();
  await db.prepare(`
    UPDATE df_tables SET
      table_no = COALESCE(?, table_no),
      zone_id = COALESCE(?, zone_id),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(table_no, zone_id, status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM df_qr_codes WHERE table_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM df_tables WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
