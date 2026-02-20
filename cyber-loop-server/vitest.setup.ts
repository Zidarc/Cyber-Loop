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
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

const db = new Database(TEST_DB);
db.pragma('foreign_keys = ON');

const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

const hash = bcrypt.hashSync('password123', BCRYPT_COST);
db.prepare(
  'INSERT INTO participants (username, password_hash, team_name, is_active) VALUES (?, ?, ?, ?)'
).run('testteam', hash, 'Test Team', 1);
db.prepare(
  'INSERT INTO participants (username, password_hash, team_name, is_active) VALUES (?, ?, ?, ?)'
).run('inactive', hash, 'Inactive Team', 0);

db.close();
