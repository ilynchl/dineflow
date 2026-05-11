const db = require('./database');

const seedData = {
  categories: [
    { name: '荤菜类', sort_order: 1 },
    { name: '素菜类', sort_order: 2 },
    { name: '主食类', sort_order: 3 },
    { name: '饮料类', sort_order: 4 },
  ],
  zones: [
    { name: '大厅', sort_order: 1 },
    { name: '室外', sort_order: 2 },
  ],
  tables: [
    { table_no: 'A01', zone_id: 1 },
    { table_no: 'A02', zone_id: 1 },
    { table_no: 'A03', zone_id: 1 },
    { table_no: 'B01', zone_id: 2 },
    { table_no: 'B02', zone_id: 2 },
  ],
  menu_items: [
    { name: '羊肉串', unit: '串', price: 3, category_id: 1, zone: 'bbq' },
    { name: '牛肉串', unit: '串', price: 4, category_id: 1, zone: 'bbq' },
    { name: '鸡翅', unit: '份', price: 8, category_id: 1, zone: 'bbq' },
    { name: '烤茄子', unit: '份', price: 6, category_id: 2, zone: 'bbq' },
    { name: '烤韭菜', unit: '份', price: 5, category_id: 2, zone: 'bbq' },
    { name: '烤馒头', unit: '串', price: 2, category_id: 3, zone: 'kitchen' },
    { name: '炒饭', unit: '份', price: 12, category_id: 3, zone: 'kitchen' },
    { name: '可乐', unit: '瓶', price: 3, category_id: 4, zone: 'kitchen' },
    { name: '啤酒', unit: '瓶', price: 5, category_id: 4, zone: 'kitchen' },
  ],
  settings: [],
};

async function seed() {
  await db.init();
  const dbh = db.getDb();
  console.log('Seeding MySQL...');

  // Ensure a tenant exists
  let tenant = await dbh.prepare('SELECT id FROM df_sys_tenants ORDER BY id LIMIT 1').get();
  if (!tenant) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('123456', 10);
    const r = await dbh.prepare(
      "INSERT INTO df_sys_tenants (name, contact_name, contact_phone, password_hash, status) VALUES (?, ?, ?, ?, 'active')"
    ).run('默认商户', '管理员', '13800138000', hash);
    tenant = { id: r.lastInsertRowid };
    console.log('  ✓ Default tenant created (phone: 13800138000, password: 123456)');
  }
  const tenantId = tenant.id;

  // Check if already seeded
  const count = await dbh.prepare('SELECT COUNT(*) as cnt FROM df_tns_categories').get();
  if (count && count.cnt > 0) {
    // Data exists — update tenant_id from 0 to actual tenant for existing rows
    console.log('  Database has existing data, updating tenant_id...');
    const tables = ['df_tns_zones', 'df_tns_categories', 'df_tns_tables', 'df_tns_menu_items',
      'df_tns_orders', 'df_tns_order_items', 'df_tns_split_records', 'df_tns_payment_records',
      'df_tns_qr_codes', 'df_tns_word_library'];
    for (const t of tables) {
      try {
        await dbh.exec(`UPDATE ${t} SET tenant_id = ${tenantId} WHERE tenant_id = 0 OR tenant_id IS NULL`);
      } catch (e) { /* column might not exist in edge case */ }
    }
    console.log('  ✓ Existing data associated with tenant #' + tenantId);
    await db.close();
    return;
  }

  const txn = dbh.transaction(async () => {
    for (const cat of seedData.categories) {
      await dbh.prepare('INSERT INTO df_tns_categories (name, sort_order, tenant_id) VALUES (?, ?, ?)').run(cat.name, cat.sort_order, tenantId);
    }
    console.log('  ✓ Categories');

    for (const zone of seedData.zones) {
      await dbh.prepare('INSERT INTO df_tns_zones (name, sort_order, tenant_id) VALUES (?, ?, ?)').run(zone.name, zone.sort_order, tenantId);
    }
    console.log('  ✓ Zones');

    for (const table of seedData.tables) {
      const r = await dbh.prepare('INSERT INTO df_tns_tables (table_no, zone_id, tenant_id) VALUES (?, ?, ?)').run(table.table_no, table.zone_id, tenantId);
      const code = `T${r.lastInsertRowid}`;
      await dbh.prepare('UPDATE df_tns_tables SET qr_code = ? WHERE id = ?').run(code, r.lastInsertRowid);
      await dbh.prepare('INSERT INTO df_tns_qr_codes (code, table_id, tenant_id) VALUES (?, ?, ?)').run(code, r.lastInsertRowid, tenantId);
    }
    console.log('  ✓ Tables (with QR codes)');

    for (const item of seedData.menu_items) {
      await dbh.prepare('INSERT INTO df_tns_menu_items (name, unit, price, category_id, zone, tenant_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(item.name, item.unit, item.price, item.category_id, item.zone, tenantId);
    }
    console.log('  ✓ Menu items');

    // Settings now default via df_sys_tenants DDL (print_receipt='true', print_kitchen='false')
    console.log('  ✓ Settings (defaults in df_sys_tenants)');
  });

  try {
    await txn();
    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  }

  await db.close();
}

seed();
