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
  settings: [
    { key: 'shop_name', value: '我的烧烤摊' },
    { key: 'shop_phone', value: '' },
    { key: 'print_receipt', value: 'true' },
    { key: 'print_kitchen', value: 'false' },
  ],
};

async function seed() {
  await db.init();
  const dbh = db.getDb();
  console.log('Seeding MySQL...');

  // Check if already seeded
  const count = await dbh.prepare('SELECT COUNT(*) as cnt FROM df_categories').get();
  if (count && count.cnt > 0) {
    console.log('  Database already has data, skipping seed.');
    await db.close();
    return;
  }

  const txn = dbh.transaction(async () => {
    for (const cat of seedData.categories) {
      await dbh.prepare('INSERT INTO df_categories (name, sort_order) VALUES (?, ?)').run(cat.name, cat.sort_order);
    }
    console.log('  ✓ Categories');

    for (const zone of seedData.zones) {
      await dbh.prepare('INSERT INTO df_zones (name, sort_order) VALUES (?, ?)').run(zone.name, zone.sort_order);
    }
    console.log('  ✓ Zones');

    for (const table of seedData.tables) {
      await dbh.prepare('INSERT INTO df_tables (table_no, zone_id) VALUES (?, ?)').run(table.table_no, table.zone_id);
    }
    console.log('  ✓ Tables');

    for (const item of seedData.menu_items) {
      await dbh.prepare('INSERT INTO df_menu_items (name, unit, price, category_id, zone) VALUES (?, ?, ?, ?, ?)')
        .run(item.name, item.unit, item.price, item.category_id, item.zone);
    }
    console.log('  ✓ Menu items');

    for (const s of seedData.settings) {
      await dbh.prepare('INSERT INTO df_settings (`key`, `value`) VALUES (?, ?)').run(s.key, s.value);
    }
    console.log('  ✓ Settings');
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
