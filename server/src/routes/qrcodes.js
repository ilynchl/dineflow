const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// GET 共享（顾客端可能查看）
router.get('/', tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  const { tenantId } = req;
  const codes = await db.prepare(`
    SELECT q.*, t.table_no FROM df_tns_qr_codes q
    LEFT JOIN df_tns_tables t ON q.table_id = t.id
    WHERE q.tenant_id = ?
    ORDER BY q.created_at DESC
  `).all(tenantId);
  res.json(codes);
});

// 写操作为商家端，需认证
router.put('/:id', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { target_url } = req.body;
  const { tenantId } = req;
  const db = getDb();
  await db.prepare('UPDATE df_tns_qr_codes SET target_url = ? WHERE id = ? AND tenant_id = ?').run(target_url, req.params.id, tenantId);
  res.json({ success: true });
});

router.post('/generate', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const { count } = req.body;
  const num = parseInt(count) || 1;
  const { tenantId } = req;
  const db = getDb();
  const txn = db.transaction(async () => {
    const row = await db.prepare('SELECT COALESCE(MAX(id), 0) as mx FROM df_tns_qr_codes').get();
    const maxId = row?.mx ?? 0;
    for (let i = 1; i <= num; i++) {
      const code = `G${maxId + i}`;
      try {
        await db.prepare('INSERT INTO df_tns_qr_codes (code, tenant_id) VALUES (?, ?)').run(code, tenantId);
      } catch (e) { /* ignore dup */ }
    }
  });
  await txn();
  res.json({ success: true, generated: num });
});

module.exports = router;
