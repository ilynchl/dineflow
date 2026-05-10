const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

const router = express.Router();

// SaaS 运营中台登录（df_sys_users）
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const db = getDb();
  const user = await db.prepare('SELECT * FROM df_sys_users WHERE username = ? AND status = ?').get(username, 'active');
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  try {
    await db.prepare('UPDATE df_sys_users SET last_login_at = NOW() WHERE id = ?').run(user.id);
  } catch {}

  let tenantName = null;
  if (user.tenant_id) {
    const tenant = await db.prepare('SELECT name FROM df_sys_tenants WHERE id = ?').get(user.tenant_id);
    if (tenant) tenantName = tenant.name;
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant_name: tenantName,
    },
  });
});

// 商家端登录（df_sys_tenants）
router.post('/merchant-login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '手机号和密码不能为空' });
  }

  const db = getDb();
  const tenant = await db.prepare('SELECT * FROM df_sys_tenants WHERE contact_phone = ?').get(phone);
  if (!tenant || !tenant.password_hash) {
    return res.status(401).json({ error: '手机号或密码错误' });
  }

  // 过期检查：expire_at <= 当天 00:00:00 即视为过期
  if (tenant.status === 'suspended') {
    return res.status(403).json({ error: '账号已被暂停' });
  }
  if (tenant.expire_at && tenant.expire_at <= new Date().toISOString().split('T')[0]) {
    await db.prepare("UPDATE df_sys_tenants SET status = 'expired' WHERE id = ?").run(tenant.id);
    return res.status(403).json({ error: '账号已过期' });
  }

  const valid = await bcrypt.compare(password, tenant.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '手机号或密码错误' });
  }

  const token = jwt.sign(
    { id: tenant.id, username: tenant.contact_phone, role: 'merchant', tenant_id: tenant.id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: tenant.id,
      username: tenant.contact_phone,
      role: 'merchant',
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      avatar: tenant.avatar,
    },
  });
});

// Bootstrap: create initial super admin (only works if no users exist)
router.post('/bootstrap', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const db = getDb();
  const count = await db.prepare('SELECT COUNT(*) as cnt FROM df_sys_users').get();
  if (count.cnt > 0) {
    return res.status(400).json({ error: '系统已初始化，不能重复创建' });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.prepare('INSERT INTO df_sys_users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'super_admin');
  res.json({ message: '超管账号创建成功' });
});

module.exports = router;
