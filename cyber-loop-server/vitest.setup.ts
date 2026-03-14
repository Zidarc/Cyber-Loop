import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;
const TEST_DB = path.join(process.cwd(), 'data', 'test_cyber_loop.db');

process.env.DB_FILE_PATH = TEST_DB;
process.env.JWT_SECRET = 'test-jwt-secret';

const dir = path.dirname(TEST_DB);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(TEST_DB)) {
  try { fs.unlinkSync(TEST_DB); } catch {}
}

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');

const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

const hash = bcrypt.hashSync('password123', BCRYPT_COST);
db.prepare(
  'INSERT OR REPLACE INTO participants (id, username, password_hash, team_name, is_active) VALUES (1, ?, ?, ?, ?)'
).run('testteam', hash, 'Test Team', 1);
db.prepare(
  'INSERT OR REPLACE INTO participants (id, username, password_hash, team_name, is_active) VALUES (2, ?, ?, ?, ?)'
).run('inactive', hash, 'Inactive Team', 0);

db.close();
