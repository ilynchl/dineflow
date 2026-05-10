const mysql = require('mysql2/promise');
const mysqlFormat = require('mysql2').format;

const DB_CONFIG = {
  host: 'rm-bp150ynr96h472763go.mysql.rds.aliyuncs.com',
  user: 'readonly',
  password: 'readonly_123',
  database: 'tcyx-prod',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
};

let pool = null;

// MySQL2 不允许 undefined 作为绑定参数，统一转 null
const sanitize = (params) => params.map(p => p === undefined ? null : p);

class Statement {
  constructor(sql) {
    this.sql = sql;
  }

  async run(...params) {
    const [result] = await pool.execute(this.sql, sanitize(params));
    return { lastInsertRowid: result.insertId };
  }

  async get(...params) {
    const [rows] = await pool.execute(this.sql, sanitize(params));
    return rows[0];
  }

  async all(...params) {
    const [rows] = await pool.execute(this.sql, sanitize(params));
    return rows;
  }
}

module.exports = {
  init: async () => {
    pool = mysql.createPool(DB_CONFIG);
    console.log('📦 MySQL connected');
  },

  getDb: () => ({
    prepare: (sql) => new Statement(sql),

    exec: async (sql) => {
      const [rows] = await pool.query(sql);
      return rows;
    },

    transaction: (fn) => {
      return async () => {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const result = await fn();
          await conn.commit();
          return result;
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
      };
    },
  }),

  close: async () => {
    if (pool) { await pool.end(); pool = null; }
  },
};
