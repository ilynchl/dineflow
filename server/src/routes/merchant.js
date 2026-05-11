const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

const router = express.Router();

router.use(authMiddleware);

// Get merchant profile
router.get('/profile', async (req, res) => {
  if (!req.user.tenant_id) return res.status(403).json({ error: '仅商户可访问' });

  const db = getDb();
  const tenant = await db.prepare('SELECT id, name, contact_phone, avatar, created_at FROM df_sys_tenants WHERE id = ?').get(req.user.tenant_id);
  if (!tenant) return res.status(404).json({ error: '商户不存在' });

  res.json(tenant);
});

// Update merchant profile
router.put('/profile', async (req, res) => {
  if (!req.user.tenant_id) return res.status(403).json({ error: '仅商户可访问' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '店铺名称不能为空' });

  const db = getDb();

  // Verify tenant exists before updating
  const tenant = await db.prepare('SELECT id FROM df_sys_tenants WHERE id = ?').get(req.user.tenant_id);
  if (!tenant) return res.status(404).json({ error: '商户账号不存在，请重新登录' });

  await db.prepare('UPDATE df_sys_tenants SET name = ? WHERE id = ?').run(name, req.user.tenant_id);
  res.json({ success: true });
});

// Check if a file hash already exists (dedup)
router.post('/check-hash', async (req, res) => {
  if (!req.user.tenant_id) return res.status(403).json({ error: '仅商户可访问' });
  const { hash } = req.body;
  if (!hash) return res.status(400).json({ error: 'hash 不能为空' });

  const db = getDb();
  const existing = await db.prepare('SELECT file_url FROM df_tns_uploaded_files WHERE file_hash = ? AND tenant_id = ?').get(hash, req.user.tenant_id);
  if (existing) {
    return res.json({ exists: true, url: existing.file_url });
  }
  res.json({ exists: false });
});

// Update avatar URL (call after successful upload)
router.put('/avatar', async (req, res) => {
  if (!req.user.tenant_id) return res.status(403).json({ error: '仅商户可访问' });
  const { url, hash } = req.body;
  if (!url) return res.status(400).json({ error: '图片地址不能为空' });

  const db = getDb();
  const tenant = await db.prepare('SELECT id FROM df_sys_tenants WHERE id = ?').get(req.user.tenant_id);
  if (!tenant) return res.status(404).json({ error: '商户账号不存在，请重新登录' });
  await db.prepare('UPDATE df_sys_tenants SET avatar = ? WHERE id = ?').run(url, req.user.tenant_id);

  // Save hash for dedup if provided
  if (hash) {
    await db.prepare('INSERT IGNORE INTO df_tns_uploaded_files (file_hash, file_url, tenant_id) VALUES (?, ?, ?)')
      .run(hash, url, req.user.tenant_id);
  }

  res.json({ success: true, avatar: url });
});

// Get OSS upload credentials
router.get('/oss-config', async (req, res) => {
  if (!req.user.tenant_id) return res.status(403).json({ error: '仅商户可访问' });

  let bucket = process.env.OSS_BUCKET;
  let accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  let accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  let region = process.env.OSS_REGION;

  {
    const db = getDb();
    const gp = async (k) => { const r = await db.prepare("SELECT param_value FROM df_sys_params WHERE param_key = ?").get(k); return r ? r.param_value : null; };
    if (!bucket) bucket = await gp('oss_bucket');
    if (!accessKeyId) accessKeyId = await gp('oss_access_key_id');
    if (!accessKeySecret) accessKeySecret = await gp('oss_access_key_secret');
    if (!region) region = await gp('oss_region');
  }
  if (!region) region = 'oss-cn-hangzhou';
  if (!bucket || !accessKeyId || !accessKeySecret) {
    return res.status(400).json({ error: 'OSS 未配置' });
  }

  const key = `logo/${req.user.tenant_id}_${Date.now()}`;
  const policy = Buffer.from(JSON.stringify({
    expiration: new Date(Date.now() + 3600000).toISOString(),
    conditions: [
      ['starts-with', '$key', 'logo/'],
      ['content-length-range', 0, 5242880],
      ['eq', '$x-oss-object-acl', 'public-read'],
    ],
  })).toString('base64');
  const signature = crypto.createHmac('sha1', accessKeySecret).update(policy).digest('base64');

  res.json({ region, bucket, accessKeyId, key, policy, signature });
});

module.exports = router;
