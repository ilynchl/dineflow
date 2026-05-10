const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { tenantContext, requireTenant } = require('../middleware/tenant');

// 共享中间件组合
const readMw = [tenantContext, requireTenant];
const writeMw = [authMiddleware, tenantContext, requireTenant];

// ---------------------------------------------------------------------------
// 区域管理（Zones）
// ---------------------------------------------------------------------------

// GET /zones —— 读取当前租户的区域列表（顾客端 / 商家端共用）
router.get('/zones', readMw, async (req, res) => {
  const db = getDb();
  const zones = await db.prepare(
    'SELECT * FROM df_tns_zones WHERE tenant_id = ? ORDER BY sort_order'
  ).all(req.tenantId);
  res.json(zones);
});

// POST /zones —— 创建区域（仅商家端）
router.post('/zones', writeMw, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '区域名称不能为空' });
  const db = getDb();
  const result = await db.prepare(
    'INSERT INTO df_tns_zones (name, tenant_id) VALUES (?, ?)'
  ).run(name, req.tenantId);
  res.json({ id: result.lastInsertRowid, name, tenant_id: req.tenantId });
});

// DELETE /zones/:id —— 删除区域（仅商家端）
router.delete('/zones/:id', writeMw, async (req, res) => {
  const db = getDb();
  // 先确认该区域属于当前租户
  const zone = await db.prepare(
    'SELECT id FROM df_tns_zones WHERE id = ? AND tenant_id = ?'
  ).get(req.params.id, req.tenantId);
  if (!zone) return res.status(404).json({ error: '区域不存在' });
  await db.prepare('DELETE FROM df_tns_zones WHERE id = ? AND tenant_id = ?')
    .run(req.params.id, req.tenantId);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 桌位管理（Tables）
// ---------------------------------------------------------------------------

// GET / —— 读取当前租户的桌位列表（顾客端 / 商家端共用）
router.get('/', readMw, async (req, res) => {
  const db = getDb();
  const tables = await db.prepare(`
    SELECT t.*, z.name as zone_name
    FROM df_tns_tables t
    LEFT JOIN df_tns_zones z ON t.zone_id = z.id
    WHERE t.tenant_id = ?
    ORDER BY t.table_no
  `).all(req.tenantId);
  res.json(tables);
});

// POST / —— 创建桌位并生成二维码（仅商家端）
router.post('/', writeMw, async (req, res) => {
  const { table_no, zone_id } = req.body;
  if (!table_no) return res.status(400).json({ error: '桌号不能为空' });
  const db = getDb();
  try {
    const result = await db.prepare(
      'INSERT INTO df_tns_tables (table_no, zone_id, tenant_id) VALUES (?, ?, ?)'
    ).run(table_no, zone_id || null, req.tenantId);

    const code = `T${result.lastInsertRowid}`;
    await db.prepare(
      'UPDATE df_tns_tables SET qr_code = ? WHERE id = ? AND tenant_id = ?'
    ).run(code, result.lastInsertRowid, req.tenantId);
    await db.prepare(
      'INSERT INTO df_tns_qr_codes (code, table_id, tenant_id) VALUES (?, ?, ?)'
    ).run(code, result.lastInsertRowid, req.tenantId);

    res.json({ id: result.lastInsertRowid, table_no, qr_code: code, tenant_id: req.tenantId });
  } catch (err) {
    // 每个租户内 table_no 唯一，由数据库唯一索引保障
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: '桌号已存在' });
    throw err;
  }
});

// PUT /:id —— 更新桌位（仅商家端）
router.put('/:id', writeMw, async (req, res) => {
  const { table_no, zone_id, status } = req.body;
  const db = getDb();
  await db.prepare(`
    UPDATE df_tns_tables SET
      table_no = COALESCE(?, table_no),
      zone_id = COALESCE(?, zone_id),
      status = COALESCE(?, status)
    WHERE id = ? AND tenant_id = ?
  `).run(table_no, zone_id, status, req.params.id, req.tenantId);
  res.json({ success: true });
});

// DELETE /:id —— 删除桌位及关联二维码（仅商家端）
router.delete('/:id', writeMw, async (req, res) => {
  const db = getDb();
  await db.prepare(
    'DELETE FROM df_tns_qr_codes WHERE table_id = ? AND tenant_id = ?'
  ).run(req.params.id, req.tenantId);
  await db.prepare(
    'DELETE FROM df_tns_tables WHERE id = ? AND tenant_id = ?'
  ).run(req.params.id, req.tenantId);
  res.json({ success: true });
});

module.exports = router;
