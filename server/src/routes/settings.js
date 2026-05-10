const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', async (req, res) => {
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM df_settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.put('/', async (req, res) => {
  const db = getDb();
  const txn = db.transaction(async () => {
    for (const [key, value] of Object.entries(req.body)) {
      const existing = await db.prepare('SELECT id FROM df_settings WHERE `key` = ?').get(key);
      if (existing) {
        await db.prepare('UPDATE df_settings SET `value` = ? WHERE `key` = ?').run(String(value), key);
      } else {
        await db.prepare('INSERT INTO df_settings (`key`, `value`) VALUES (?, ?)').run(key, String(value));
      }
    }
  });
  await txn();
  res.json({ success: true });
});

module.exports = router;
