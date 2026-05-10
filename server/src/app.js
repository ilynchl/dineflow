const express = require('express');
const cors = require('cors');
const path = require('path');
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

// QR code redirect (活码)
app.get('/q/:code', async (req, res) => {
  try {
    const dbh = db.getDb();
    const qr = await dbh.prepare('SELECT * FROM df_qr_codes WHERE code = ?').get(req.params.code);
    if (qr) {
      await dbh.prepare('UPDATE df_qr_codes SET scan_count = scan_count + 1, last_scan_at = NOW() WHERE id = ?').run(qr.id);
      if (qr.target_url) return res.redirect(qr.target_url);
    }
    const baseUrl = process.env.CUSTOMER_URL || 'http://localhost:5173';
    res.redirect(`${baseUrl}/?table=${qr?.table_id || ''}`);
  } catch (e) {
    res.redirect(process.env.CUSTOMER_URL || 'http://localhost:5173');
  }
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

db.init().then(async () => {
  const { migrate } = require('./db/migrate');
  await migrate();
  app.listen(PORT, '0.0.0.0', () => console.log(`🍢 dineflow server running on http://0.0.0.0:${PORT}`));
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
