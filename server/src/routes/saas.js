const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// All SaaS routes require super_admin role
router.use(authMiddleware, requireRole('super_admin'));

// List tenants
router.get('/tenants', async (req, res) => {
  const db = getDb();
  const { status, keyword } = req.query;

  let sql = 'SELECT * FROM df_sys_tenants';
  const params = [];
  const conds = [];

  if (status) {
    conds.push('status = ?');
    params.push(status);
  }
  if (keyword) {
    conds.push('(name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  const tenants = await db.prepare(sql).all(...params);
  res.json(tenants);
});

// Get single tenant
router.get('/tenants/:id', async (req, res) => {
  const db = getDb();
  const tenant = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: '商户不存在' });
  res.json(tenant);
});

// Create tenant (account activation)
router.post('/tenants', async (req, res) => {
  const { name, contact_name, contact_phone, expire_at, remark, password } = req.body;
  if (!name) return res.status(400).json({ error: '商户名称不能为空' });
  if (password && password.length < 4) return res.status(400).json({ error: '密码至少4位' });

  // 未指定过期时间且设了密码 → 按默认试用期自动计算
  let finalExpire = expire_at || null;
  if (!finalExpire && password) {
    const db = getDb();
    const param = await db.prepare("SELECT param_value FROM df_sys_params WHERE param_key = 'default_trial_days'").get();
    if (param) {
      const days = parseInt(param.param_value);
      if (days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        finalExpire = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
    }
  }

  const hash = password ? await bcrypt.hash(password, 10) : null;
  const db = getDb();
  const result = await db.prepare(
    'INSERT INTO df_sys_tenants (name, contact_name, contact_phone, expire_at, remark, password_hash) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, contact_name || null, contact_phone || null, finalExpire, remark || null, hash);

  res.json({ id: result.lastInsertRowid, name });
});

// Update tenant
router.put('/tenants/:id', async (req, res) => {
  const { name, contact_name, contact_phone, expire_at, remark } = req.body;
  const db = getDb();

  const existing = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '商户不存在' });

  await db.prepare(`
    UPDATE df_sys_tenants SET
      name = COALESCE(?, name),
      contact_name = COALESCE(?, contact_name),
      contact_phone = COALESCE(?, contact_phone),
      expire_at = COALESCE(?, expire_at),
      remark = COALESCE(?, remark)
    WHERE id = ?
  `).run(name, contact_name, contact_phone, expire_at, remark, req.params.id);

  res.json({ success: true });
});

// Change tenant status (activate / suspend / resume)
router.patch('/tenants/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['trial', 'active', 'suspended', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }

  const db = getDb();
  const existing = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '商户不存在' });

  await db.prepare('UPDATE df_sys_tenants SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// Renew tenant (extend expiration)
router.put('/tenants/:id/renew', async (req, res) => {
  const { expire_at } = req.body;
  if (!expire_at) return res.status(400).json({ error: '请设置新的过期时间' });

  const db = getDb();
  const existing = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '商户不存在' });

  await db.prepare('UPDATE df_sys_tenants SET expire_at = ?, status = ? WHERE id = ?').run(expire_at, 'active', req.params.id);
  res.json({ success: true });
});

// Delete tenant
router.delete('/tenants/:id', async (req, res) => {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '商户不存在' });

  await db.prepare('DELETE FROM df_sys_tenants WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Set/reset tenant admin password
router.post('/tenants/:id/set-password', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: '密码至少4位' });

  const db = getDb();
  const tenant = await db.prepare('SELECT * FROM df_sys_tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: '商户不存在' });

  const hash = await bcrypt.hash(password, 10);
  await db.prepare('UPDATE df_sys_tenants SET password_hash = ? WHERE id = ?').run(hash, tenant.id);

  res.json({ success: true });
});

// ---- Admin Users ----

// List admin users
router.get('/users', async (req, res) => {
  const db = getDb();
  const users = await db.prepare(
    "SELECT id, username, role, status, created_at FROM df_sys_users ORDER BY created_at DESC"
  ).all();
  res.json(users);
});

// Create admin user
router.post('/users', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  const db = getDb();
  const existing = await db.prepare("SELECT id FROM df_sys_users WHERE username = ?").get(username);
  if (existing) return res.status(400).json({ error: '用户名已存在' });

  const hash = await bcrypt.hash(password, 10);
  const result = await db.prepare(
    'INSERT INTO df_sys_users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username, hash, role || 'admin');

  res.json({ id: result.lastInsertRowid, username });
});

// Update admin user (password or role)
router.put('/users/:id', async (req, res) => {
  const { password, role } = req.body;
  const db = getDb();

  const existing = await db.prepare("SELECT * FROM df_sys_users WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: '用户不存在' });

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.prepare('UPDATE df_sys_users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
  }
  if (role) {
    await db.prepare('UPDATE df_sys_users SET role = ? WHERE id = ?').run(role, req.params.id);
  }

  res.json({ success: true });
});

// Delete admin user
router.delete('/users/:id', async (req, res) => {
  const db = getDb();
  const existing = await db.prepare("SELECT * FROM df_sys_users WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: '用户不存在' });

  await db.prepare('DELETE FROM df_sys_users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
