const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// GET —— 读取设置
// 有租户上下文（JWT 或 ?__tenant）时返回该租户的设置；
// 无租户上下文时返回全局设置（兼容运营中台）
router.get('/', async (req, res) => {
  const db = getDb();

  // 尝试获取 tenant_id（JWT → ?__tenant）
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const user = jwt.verify(header.slice(7), JWT_SECRET);
      if (user.tenant_id) req.tenantId = user.tenant_id;
    }
  } catch {}

  let tid = req.tenantId;
  if (!tid) {
    const p = parseInt(req.query.__tenant);
    if (p > 0) tid = p;
  }

  if (tid) {
    const rows = await db.prepare('SELECT * FROM df_tns_settings WHERE tenant_id = ?').all(tid);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    return res.json(settings);
  }

  // 无租户：返回第一个租户的设置
  const first = await db.prepare('SELECT tenant_id FROM df_tns_settings GROUP BY tenant_id ORDER BY tenant_id LIMIT 1').get();
  if (first) {
    const rows = await db.prepare('SELECT * FROM df_tns_settings WHERE tenant_id = ?').all(first.tenant_id);
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    return res.json(settings);
  }

  res.json({});
});

// PUT —— 写入设置（商家端）
router.put('/', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const txn = db.transaction(async () => {
    for (const [key, value] of Object.entries(req.body)) {
      const existing = await db.prepare('SELECT id FROM df_tns_settings WHERE `key` = ? AND tenant_id = ?').get(key, req.tenantId);
      if (existing) {
        await db.prepare('UPDATE df_tns_settings SET `value` = ? WHERE `key` = ? AND tenant_id = ?').run(String(value), key, req.tenantId);
      } else {
        await db.prepare('INSERT INTO df_tns_settings (`key`, `value`, tenant_id) VALUES (?, ?, ?)').run(key, String(value), req.tenantId);
      }
    }
  });
  await txn();
  res.json({ success: true });
});

module.exports = router;
