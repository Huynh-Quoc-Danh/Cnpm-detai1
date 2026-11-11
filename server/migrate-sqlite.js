// npm run db:migrate — copy every row from the old SQLite file (server/data/halong.db) into MySQL.
// The MySQL tables are emptied first, so the MySQL database ends up an exact copy of the SQLite one.
// Usage: npm run db:migrate              (uses server/data/halong.db)
//        npm run db:migrate -- path\to\other.db
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initDb, closeDb, run, insertMany, transaction, TABLES, DATA_DIR, DB_LABEL } from './db.js';

const SQLITE_FILE = path.resolve(process.argv[2] || path.join(DATA_DIR, 'halong.db'));

if (!fs.existsSync(SQLITE_FILE)) {
  console.error(`[migrate] Không tìm thấy file SQLite: ${SQLITE_FILE}`);
  process.exit(1);
}

const sqlite = new DatabaseSync(SQLITE_FILE, { readOnly: true });
const sqliteTables = new Set(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));

try {
  await initDb();
  console.log(`[migrate] ${SQLITE_FILE}  ->  ${DB_LABEL}`);
  const t0 = Date.now();
  await transaction(async () => {
    // Children first is not required (no foreign keys), but keep a stable order.
    for (const t of TABLES) await run(`DELETE FROM \`${t}\``);
    for (const t of TABLES) {
      if (!sqliteTables.has(t)) {
        console.log(`  - ${t.padEnd(15)} (không có trong SQLite, bỏ qua)`);
        continue;
      }
      const rows = sqlite.prepare(`SELECT * FROM "${t}"`).all();
      if (!rows.length) {
        console.log(`  - ${t.padEnd(15)} 0 dòng`);
        continue;
      }
      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `\`${c}\``).join(', ');
      // node:sqlite may return BigInt for large integers -> convert to Number for mysql2.
      const values = rows.map((r) => cols.map((c) => (typeof r[c] === 'bigint' ? Number(r[c]) : r[c])));
      const n = await insertMany(`INSERT INTO \`${t}\` (${colList}) VALUES ?`, values);
      console.log(`  - ${t.padEnd(15)} ${n} dòng`);
    }
  });
  console.log(`[migrate] Xong trong ${Date.now() - t0} ms. Từ giờ server dùng MySQL; file SQLite cũ được giữ nguyên.`);
} catch (err) {
  console.error(`[migrate] Lỗi, đã huỷ toàn bộ thay đổi (rollback): ${err.message}`);
  process.exitCode = 1;
} finally {
  sqlite.close();
  await closeDb();
}
