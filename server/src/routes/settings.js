const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// GET —— 读取设置（全部从 df_sys_tenants 读取）
router.get('/', async (req, res) => {
  const db = getDb();

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
    const tenant = await db.prepare('SELECT name, print_receipt, print_kitchen FROM df_sys_tenants WHERE id = ?').get(tid);
    if (tenant) {
      return res.json({
        shop_name: tenant.name,
        print_receipt: tenant.print_receipt || 'false',
        print_kitchen: tenant.print_kitchen || 'false',
      });
    }
    return res.json({});
  }

  const first = await db.prepare('SELECT id, name, print_receipt, print_kitchen FROM df_sys_tenants ORDER BY id LIMIT 1').get();
  if (first) {
    return res.json({
      shop_name: first.name,
      print_receipt: first.print_receipt || 'false',
      print_kitchen: first.print_kitchen || 'false',
    });
  }

  res.json({});
});

// PUT —— 写入设置（写入 df_sys_tenants）
router.put('/', authMiddleware, tenantContext, requireTenant, async (req, res) => {
  const db = getDb();
  for (const [key, value] of Object.entries(req.body)) {
    if (key === 'shop_name') {
      await db.prepare('UPDATE df_sys_tenants SET name = ? WHERE id = ?').run(String(value), req.tenantId);
    } else if (key === 'print_receipt' || key === 'print_kitchen') {
      await db.prepare(`UPDATE df_sys_tenants SET ${key} = ? WHERE id = ?`).run(String(value), req.tenantId);
    }
  }
  res.json({ success: true });
});

module.exports = router;
