// npm run db:reset — drop all tables of the MySQL database and reseed from server/seed.
import { initDb, closeDb, all, run, TABLES, DB_LABEL } from './db.js';

try {
  await initDb();
  const existing = new Set((await all('SHOW TABLES')).map((r) => Object.values(r)[0]));
  for (const t of TABLES) if (existing.has(t)) await run(`DROP TABLE \`${t}\``);
  await closeDb(); // next initDb() recreates the schema as a fresh database

  const { seedAll } = await import('./seed.js');
  await seedAll();
  console.log(`[db:reset] Đã tạo lại cơ sở dữ liệu: ${DB_LABEL}`);
} catch (err) {
  console.error(`[db:reset] Lỗi: ${err.message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
