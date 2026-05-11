const db = require('./database');

const OLD_TO_NEW = {
  df_zones: 'df_tns_zones',
  df_categories: 'df_tns_categories',
  df_tables: 'df_tns_tables',
  df_menu_items: 'df_tns_menu_items',
  df_orders: 'df_tns_orders',
  df_order_items: 'df_tns_order_items',
  df_split_records: 'df_tns_split_records',
  df_payment_records: 'df_tns_payment_records',
  df_qr_codes: 'df_tns_qr_codes',
  df_word_library: 'df_tns_word_library',
  df_tenants: 'df_sys_tenants',
  df_users: 'df_sys_users',
  df_system_params: 'df_sys_params',
};

const NEW_TABLE_DDL = [
  `CREATE TABLE IF NOT EXISTS df_tns_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    tenant_id INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_zones_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    tenant_id INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categories_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_no VARCHAR(20) NOT NULL,
    zone_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    qr_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'idle',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_tables_tenant_no (tenant_id, table_no),
    FOREIGN KEY (zone_id) REFERENCES df_tns_zones(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(10) DEFAULT '串',
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    image VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    zone VARCHAR(20) DEFAULT 'kitchen',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_menu_items_tenant (tenant_id),
    FOREIGN KEY (category_id) REFERENCES df_tns_categories(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(50) NOT NULL,
    table_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    customer_name VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_orders_tenant_no (tenant_id, order_no),
    FOREIGN KEY (table_id) REFERENCES df_tns_tables(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    flavor VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_tenant (tenant_id),
    FOREIGN KEY (order_id) REFERENCES df_tns_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES df_tns_menu_items(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_split_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_table_id INT,
    target_table_id INT,
    order_item_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    menu_item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    wait_minutes INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_split_records_tenant (tenant_id),
    FOREIGN KEY (source_table_id) REFERENCES df_tns_tables(id) ON DELETE SET NULL,
    FOREIGN KEY (target_table_id) REFERENCES df_tns_tables(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_payment_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    method VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    trade_no VARCHAR(100),
    tenant_id INT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payment_records_tenant (tenant_id),
    FOREIGN KEY (order_id) REFERENCES df_tns_orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    table_id INT,
    tenant_id INT NOT NULL DEFAULT 0,
    target_url VARCHAR(500),
    scan_count INT DEFAULT 0,
    last_scan_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_qrcodes_tenant_code (tenant_id, code),
    FOREIGN KEY (table_id) REFERENCES df_tns_tables(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_word_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    menu_item_name VARCHAR(100) NOT NULL,
    tenant_id INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_word_library_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_sys_tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(50),
    contact_phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'trial',
    expire_at DATE,
    remark TEXT,
    avatar VARCHAR(500) DEFAULT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    print_receipt VARCHAR(10) DEFAULT 'true',
    print_kitchen VARCHAR(10) DEFAULT 'false',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_sys_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_uploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_hash VARCHAR(64) NOT NULL UNIQUE,
    file_url VARCHAR(500) NOT NULL,
    tenant_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_tns_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 0,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'radio',
    options JSON NOT NULL,
    sort_order INT DEFAULT 0,
    category_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prefs_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS df_sys_params (
    id INT AUTO_INCREMENT PRIMARY KEY,
    param_key VARCHAR(100) NOT NULL UNIQUE,
    param_value TEXT,
    description VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function migrate() {
  const dbh = db.getDb();
  console.log('Running MySQL migrations...');

  // Step 1: migrate old tables to new names (once, only if old table exists)
  for (const [oldName, newName] of Object.entries(OLD_TO_NEW)) {
    try {
      const check = await dbh.exec(
        `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = 'tcyx-prod' AND table_name = '${oldName}'`
      );
      if (!check || check.length === 0) continue;

      await dbh.exec(`DROP TABLE IF EXISTS ${newName}`);
      await dbh.exec(`RENAME TABLE ${oldName} TO ${newName}`);
      console.log(`  → ${oldName} → ${newName}`);
    } catch (err) {
      console.log(`  - ${oldName} rename skipped: ${err.message.slice(0, 60)}`);
    }
  }

  // Step 2: create new tables if not exist (for fresh installs)
  for (const sql of NEW_TABLE_DDL) {
    try {
      await dbh.exec(sql);
      const name = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1] || 'unknown';
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
    }
  }

  // Step 3: add tenant_id columns to existing tables (safe for already-setup DBs)
  const ADD_TENANT_SQL = [
    "ALTER TABLE df_tns_zones ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER sort_order",
    "ALTER TABLE df_tns_categories ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER sort_order",
    "ALTER TABLE df_tns_tables ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER zone_id",
    "ALTER TABLE df_tns_menu_items ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER category_id",
    "ALTER TABLE df_tns_orders ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER table_id",
    "ALTER TABLE df_tns_order_items ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER order_id",
    "ALTER TABLE df_tns_split_records ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER order_item_id",
    "ALTER TABLE df_tns_payment_records ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER method",
    "ALTER TABLE df_tns_qr_codes ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER table_id",
    "ALTER TABLE df_tns_word_library ADD COLUMN tenant_id INT NOT NULL DEFAULT 0 AFTER alias",
  ];
  for (const sql of ADD_TENANT_SQL) {
    try {
      await dbh.exec(sql);
      const col = sql.match(/ADD COLUMN (\S+)/)?.[1] || '';
      console.log(`  + tenant_id → ${sql.match(/TABLE (\S+)/)?.[1] || ''}`);
    } catch (err) {
      // Column already exists — ignore
      if (err.message?.includes('Duplicate column')) {
        // silently skip
      } else {
        console.error(`  ✗ ${err.message}`);
      }
    }
  }

  // Step 4: remove unused tenant_id from df_sys_users
  try {
    await dbh.exec("ALTER TABLE df_sys_users DROP COLUMN tenant_id");
    console.log('  - df_sys_users.tenant_id dropped');
  } catch (e) { /* column may not exist */ }

  // Step 5: update unique constraints to be per-tenant (composite unique)
  const UNIQUE_FIXES = [
    { table: 'df_tns_tables', oldIdx: 'table_no', newSql: 'ALTER TABLE df_tns_tables ADD UNIQUE INDEX uq_tables_tenant_no (tenant_id, table_no)' },
    { table: 'df_tns_qr_codes', oldIdx: 'code', newSql: 'ALTER TABLE df_tns_qr_codes ADD UNIQUE INDEX uq_qrcodes_tenant_code (tenant_id, code)' },
    { table: 'df_tns_orders', oldIdx: 'order_no', newSql: 'ALTER TABLE df_tns_orders ADD UNIQUE INDEX uq_orders_tenant_no (tenant_id, order_no)' },
  ];
  for (const fix of UNIQUE_FIXES) {
    try {
      await dbh.exec(`ALTER TABLE ${fix.table} DROP INDEX \`${fix.oldIdx}\``);
    } catch (e) { /* index may not exist */ }
    try {
      await dbh.exec(fix.newSql);
      console.log(`  ✓ ${fix.table}: (tenant_id, ${fix.oldIdx}) UNIQUE`);
    } catch (e) {
      console.error(`  ✗ ${fix.table}: ${e.message.slice(0, 60)}`);
    }
  }

  // Step 6: add preference & served_quantity columns
  const COLUMN_ADDITIONS = [
    "ALTER TABLE df_tns_orders ADD COLUMN preferences JSON DEFAULT NULL",
    "ALTER TABLE df_tns_order_items ADD COLUMN served_quantity INT DEFAULT 0",
  ];
  for (const sql of COLUMN_ADDITIONS) {
    try {
      await dbh.exec(sql);
      const col = sql.match(/ADD COLUMN (\S+)/)?.[1] || '';
      console.log(`  + ${col} → ${sql.match(/TABLE (\S+)/)?.[1] || ''}`);
    } catch (err) {
      if (err.message?.includes('Duplicate column')) {
        // silently skip
      } else {
        console.error(`  ✗ ${err.message.slice(0, 60)}`);
      }
    }
  }

  // Step 7: migrate df_tns_settings → df_sys_tenants, then drop old table
  try {
    // Check if old settings table exists
    const hasSettings = await dbh.exec("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = 'tcyx-prod' AND table_name = 'df_tns_settings'");
    if (hasSettings && hasSettings.length > 0) {
      // Add columns if not exist (for tenants created before this migration)
      for (const col of ['print_receipt', 'print_kitchen']) {
        try {
          await dbh.exec(`ALTER TABLE df_sys_tenants ADD COLUMN ${col} VARCHAR(10) DEFAULT NULL`);
        } catch (e) { /* already exists */ }
      }
      // Copy shop_name → df_sys_tenants.name (if df_sys_tenants.name is still the default)
      await dbh.exec(
        "UPDATE df_sys_tenants t JOIN df_tns_settings s ON t.id = s.tenant_id AND s.`key` = 'shop_name' AND s.`value` IS NOT NULL AND s.`value` != '' SET t.name = s.`value`"
      );
      // Copy print_receipt
      await dbh.exec(
        "UPDATE df_sys_tenants t JOIN df_tns_settings s ON t.id = s.tenant_id AND s.`key` = 'print_receipt' SET t.print_receipt = s.`value`"
      );
      // Copy print_kitchen
      await dbh.exec(
        "UPDATE df_sys_tenants t JOIN df_tns_settings s ON t.id = s.tenant_id AND s.`key` = 'print_kitchen' SET t.print_kitchen = s.`value`"
      );
      console.log('  ✓ Data migrated df_tns_settings → df_sys_tenants');
      await dbh.exec('DROP TABLE IF EXISTS df_tns_settings');
      console.log('  ✓ Dropped df_tns_settings');
    }
  } catch (err) {
    console.error(`  ✗ settings migration: ${err.message.slice(0, 80)}`);
  }

  // Step 8: add category_id to df_tns_preferences
  try {
    await dbh.exec("ALTER TABLE df_tns_preferences ADD COLUMN category_id INT DEFAULT NULL");
    console.log('  + category_id → df_tns_preferences');
  } catch (err) {
    if (err.message?.includes('Duplicate column')) {
      // already exists
    } else {
      console.error(`  ✗ ${err.message.slice(0, 60)}`);
    }
  }

  // Step 9: add preferences to df_tns_order_items
  try {
    await dbh.exec("ALTER TABLE df_tns_order_items ADD COLUMN preferences JSON DEFAULT NULL");
    console.log('  + preferences → df_tns_order_items');
  } catch (err) {
    if (err.message?.includes('Duplicate column')) {
      // already exists
    } else {
      console.error(`  ✗ ${err.message.slice(0, 60)}`);
    }
  }

  console.log('Migration completed.');
}

module.exports = { migrate };
