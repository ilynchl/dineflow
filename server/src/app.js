const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/database');

const menuRoutes = require('./routes/menu');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
const splitRoutes = require('./routes/splits');
const paymentRoutes = require('./routes/payment');
const qrcodeRoutes = require('./routes/qrcodes');
const statsRoutes = require('./routes/stats');
const settingRoutes = require('./routes/settings');
const wordRoutes = require('./routes/words');
const authRoutes = require('./routes/auth');
const saasRoutes = require('./routes/saas');
const systemParamRoutes = require('./routes/systemParams');
const merchantRoutes = require('./routes/merchant');
const preferenceRoutes = require('./routes/preferences');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', splitRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/qrcodes', qrcodeRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/system-params', systemParamRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/preferences', preferenceRoutes);

// QR code redirect (活码)
app.get('/q/:code', async (req, res) => {
  try {
    const dbh = db.getDb();
    const qr = await dbh.prepare('SELECT q.*, t.tenant_id as table_tenant_id, t.table_no FROM df_tns_qr_codes q LEFT JOIN df_tns_tables t ON q.table_id = t.id WHERE q.code = ?').get(req.params.code);
    if (qr) {
      await dbh.prepare('UPDATE df_tns_qr_codes SET scan_count = scan_count + 1, last_scan_at = NOW() WHERE id = ?').run(qr.id);
      if (qr.target_url) return res.redirect(qr.target_url);
    }
    const tenantId = qr?.tenant_id || qr?.table_tenant_id || '';
    const tableNo = qr?.table_no || '';
    const tableId = qr?.table_id || '';
    const baseUrl = process.env.CUSTOMER_URL || 'http://localhost:5173';
    res.redirect(`${baseUrl}/?__tenant=${tenantId}&table_no=${tableNo}&table=${tableId}`);
  } catch (e) {
    res.redirect(process.env.CUSTOMER_URL || 'http://localhost:5173');
  }
});

// Prevent crash on unhandled promise rejections (e.g. RDS timeout)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

db.init().then(async () => {
  const { migrate } = require('./db/migrate');
  await migrate();

  // Bootstrap: create default admin user if not exists
  try {
    const dbh = db.getDb();
    const count = await dbh.prepare("SELECT COUNT(*) as cnt FROM df_sys_users WHERE role = 'super_admin'").get();
    if (count.cnt === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await dbh.prepare('INSERT INTO df_sys_users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'super_admin');
      console.log('👤 Default super_admin created (admin / admin123)');
    }
  } catch (err) {
    console.error('⚠️  Admin bootstrap skipped:', err.message);
  }

  // Bootstrap: default system params
  try {
    const dbh = db.getDb();
    const pCount = await dbh.prepare("SELECT COUNT(*) as cnt FROM df_sys_params WHERE param_key = 'default_trial_days'").get();
    if (pCount.cnt === 0) {
      await dbh.prepare('INSERT INTO df_sys_params (param_key, param_value, description) VALUES (?, ?, ?)')
        .run('default_trial_days', '30', '新建商户默认试用期（天）');
      console.log('⚙️  Default system params created (trial_days=30)');
    }
  } catch (err) {
    console.error('⚠️  System params bootstrap skipped:', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍢 dineflow server running on http://0.0.0.0:${PORT}`);

    // 商户过期自动检测（启动时执行一次，之后每小时检查）
    async function checkExpired() {
      try {
        const dbh = db.getDb();
        await dbh.exec(
          "UPDATE df_sys_tenants SET status = 'expired' WHERE expire_at IS NOT NULL AND expire_at <= CURDATE() AND status NOT IN ('expired', 'suspended')"
        );
      } catch {}
    }
    checkExpired();
    setInterval(checkExpired, 3600000);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
