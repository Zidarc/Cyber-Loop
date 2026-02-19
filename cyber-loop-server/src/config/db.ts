import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_FILE_PATH || './data/cyber_loop.db';
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: InstanceType<typeof Database> = new Database(dbPath);
db.pragma('foreign_keys = ON');

export default db;

export function runQuery<T = unknown>(sql: string, params: unknown[] = []): T {
  const stmt = db.prepare(sql);
  const firstWord = sql.trim().split(/\s+/)[0].toUpperCase();
  if (firstWord === 'SELECT') {
    return stmt.all(...params) as T;
  }
  stmt.run(...params);
  return undefined as T;
}

export function transaction<T>(fn: () => T): T {
  return db.transaction(fn)();
}
