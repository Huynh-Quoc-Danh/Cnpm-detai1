// Data access bootstrap: MySQL / MariaDB connection pool (mysql2) + schema creation.
// Connection settings come from environment variables (see .env.example at the project root).
import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_DIR = __dirname;
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(__dirname, 'data');
export const UPLOAD_DIR = path.join(__dirname, 'uploads');
export const SEED_DIR = path.join(__dirname, 'seed');

// Load .env from the project root if present (Node >= 20.12 has process.loadEnvFile).
const ENV_FILE = path.join(ROOT_DIR, '.env');
if (fs.existsSync(ENV_FILE)) {
  try { process.loadEnvFile(ENV_FILE); } catch (err) { console.warn(`[db] Không đọc được .env: ${err.message}`); }
}

export const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'halong'
};
/** Human-readable DB location for logs. */
export const DB_LABEL = `mysql://${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;

// Identifier-like text columns use utf8mb4_bin so comparisons stay case-sensitive (as in SQLite).
const BIN = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
const TABLE_OPTS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS sites (
    id INT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL,
    name_vi VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    data LONGTEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS exhibits (
    id VARCHAR(64) ${BIN} PRIMARY KEY,
    site_id INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    data LONGTEXT NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    INDEX idx_exhibits_site (site_id, sort_order)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) ${BIN} NOT NULL UNIQUE,
    name_vi VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    desc_vi TEXT NOT NULL,
    desc_en TEXT NOT NULL,
    price INT NOT NULL,
    scope VARCHAR(8) NOT NULL CHECK (scope IN ('site','all')),
    duration_hours INT NOT NULL,
    max_people INT NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    badge_vi VARCHAR(255),
    badge_en VARCHAR(255),
    sort_order INT NOT NULL DEFAULT 0
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(32) ${BIN} PRIMARY KEY,
    package_id INT,
    package_name VARCHAR(255) NOT NULL,
    site_id INT,
    amount INT NOT NULL,
    method VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    visitor_id VARCHAR(64) ${BIN},
    lang VARCHAR(8),
    customer_name VARCHAR(120),
    customer_phone VARCHAR(32),
    created_at VARCHAR(32) NOT NULL,
    created_ms BIGINT NOT NULL,
    paid_at VARCHAR(32),
    paid_ms BIGINT,
    expires_at VARCHAR(32) NOT NULL,
    transfer_note VARCHAR(64) NOT NULL,
    demo TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_orders_created (created_ms),
    INDEX idx_orders_paid (status, paid_ms)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS tickets (
    token VARCHAR(64) ${BIN} PRIMARY KEY,
    order_id VARCHAR(32) ${BIN},
    code VARCHAR(64) ${BIN},
    scope VARCHAR(8) NOT NULL,
    site_ids VARCHAR(2000) NOT NULL DEFAULT '[]',
    issued_at VARCHAR(32) NOT NULL,
    expires_at VARCHAR(32) NOT NULL,
    expires_ms BIGINT NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    visitor_id VARCHAR(64) ${BIN},
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_tickets_order (order_id)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS claim_codes (
    code VARCHAR(64) ${BIN} PRIMARY KEY,
    scope VARCHAR(8) NOT NULL CHECK (scope IN ('site','all')),
    site_ids VARCHAR(2000) NOT NULL DEFAULT '[]',
    duration_hours INT NOT NULL,
    max_uses INT NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    note TEXT,
    created_at VARCHAR(32) NOT NULL
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS visitors (
    visitor_id VARCHAR(64) ${BIN} PRIMARY KEY,
    site_id INT,
    lat DOUBLE,
    lng DOUBLE,
    accuracy DOUBLE,
    source VARCHAR(16),
    lang VARCHAR(8),
    device VARCHAR(16),
    user_agent VARCHAR(300),
    qr_site_id INT,
    qr_ms BIGINT,
    is_sim TINYINT(1) NOT NULL DEFAULT 0,
    first_seen VARCHAR(32) NOT NULL,
    last_seen VARCHAR(32) NOT NULL,
    last_seen_ms BIGINT NOT NULL,
    INDEX idx_visitors_seen (last_seen_ms)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS listens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    exhibit_id VARCHAR(64) ${BIN},
    lang VARCHAR(8),
    visitor_id VARCHAR(64) ${BIN},
    locked TINYINT(1) NOT NULL DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    created_ms BIGINT NOT NULL,
    demo TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_listens_created (created_ms)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'admin',
    password_hash VARCHAR(256) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    last_login_at VARCHAR(32)
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token VARCHAR(128) ${BIN} PRIMARY KEY,
    admin_id INT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    expires_ms BIGINT NOT NULL
  ) ${TABLE_OPTS}`,
  `CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(64) ${BIN} PRIMARY KEY,
    value LONGTEXT NOT NULL
  ) ${TABLE_OPTS}`
];

export const TABLES = ['sites', 'exhibits', 'packages', 'orders', 'tickets', 'claim_codes', 'visitors', 'listens',
  'admins', 'admin_sessions', 'settings'];

let pool = null;
let initPromise = null;
let createdFresh = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...DB_CONFIG,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
      decimalNumbers: true, // SUM()/AVG() come back as JS numbers, not strings
      supportBigNumbers: true,
      bigNumberStrings: false
    });
  }
  return pool;
}

/**
 * Create the database (if missing) and all tables. Must be awaited once at startup.
 * Sets isFreshDb() when the tables did not exist before.
 */
export function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const { database, ...serverCfg } = DB_CONFIG;
      let admin;
      try {
        admin = await mysql.createConnection({ ...serverCfg, charset: 'utf8mb4' });
      } catch (err) {
        console.error(`[db] Không kết nối được MySQL tại ${DB_CONFIG.host}:${DB_CONFIG.port} (${err.code || err.message}).`);
        console.error('[db] Hãy bật MySQL (XAMPP Control Panel -> MySQL -> Start) và kiểm tra file .env.');
        throw err;
      }
      try {
        await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      } finally {
        await admin.end();
      }
      const p = getPool();
      const [rows] = await p.query("SHOW TABLES LIKE 'settings'");
      createdFresh = rows.length === 0;
      for (const sql of SCHEMA) await p.query(sql);
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    })();
  }
  return initPromise;
}

/** True if the tables did not exist before initDb() created them. */
export function isFreshDb() {
  return createdFresh;
}

export async function closeDb() {
  if (pool) {
    const p = pool;
    pool = null;
    initPromise = null;
    try { await p.end(); } catch { /* ignore */ }
  }
}

/** Convert JS values into types the driver should bind (no undefined; objects/arrays as JSON text). */
export function sqlValue(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object' && !(v instanceof Uint8Array) && !(v instanceof Date)) return JSON.stringify(v);
  return v;
}

// The connection of the current transaction (if any) follows the async call chain.
const txStore = new AsyncLocalStorage();
const executor = () => txStore.getStore() || getPool();

async function query(sql, params) {
  const [result] = await executor().query(sql, params.map(sqlValue));
  return result;
}

/** INSERT / UPDATE / DELETE. Returns { changes, lastInsertRowid } (same shape as the old SQLite helper). */
export async function run(sql, ...params) {
  const r = await query(sql, params);
  return { changes: r.affectedRows ?? 0, lastInsertRowid: r.insertId ?? 0 };
}
/** First row or undefined. */
export async function get(sql, ...params) {
  const rows = await query(sql, params);
  return rows[0];
}
/** All rows. */
export async function all(sql, ...params) {
  return query(sql, params);
}

/**
 * Multi-row insert: insertMany('INSERT INTO t (a, b) VALUES ?', [[1, 2], [3, 4]]).
 * Rows are sent in chunks to stay below max_allowed_packet.
 */
export async function insertMany(sql, rows, chunkSize = 500) {
  let n = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => r.map(sqlValue));
    const [res] = await executor().query(sql, [chunk]);
    n += res.affectedRows || 0;
  }
  return n;
}

/** Run async fn inside a transaction (nested calls reuse the outer transaction). */
export async function transaction(fn) {
  if (txStore.getStore()) return fn();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await txStore.run(conn, fn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }
}

export function parseJson(text, fallback) {
  if (text == null || text === '') return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}
