/**
 * Standalone script to seed participant (team) accounts.
 * Run after db/seed.ts (nodes, edges, questions).
 * Input: array of { username, password, team_name }
 * Idempotent: skips insert if username already exists.
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;
const START_NODE_ID = 1;

interface TeamInput {
  username: string;
  password: string;
  team_name: string;
}

const DEFAULT_TEAMS: TeamInput[] = [
  { username: 'team1', password: 'password123', team_name: 'Team Alpha' },
  { username: 'team2', password: 'password123', team_name: 'Team Beta' },
  { username: 'team3', password: 'password123', team_name: 'Team Gamma' },
];

const dbPath = process.env.DB_FILE_PATH || path.join(process.cwd(), 'data', 'cyber_loop.db');
const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');

function runSeedParticipants(teams: TeamInput[] = DEFAULT_TEAMS) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }

  const insertParticipant = db.prepare(`
    INSERT INTO participants (username, password_hash, team_name)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM participants WHERE username = ?)
  `);

  const getNodeIds = db.prepare('SELECT id FROM nodes ORDER BY id');
  const nodeIds = (getNodeIds.all() as { id: number }[]).map((r) => r.id);

  const insertProgress = db.prepare(`
    INSERT OR IGNORE INTO participant_node_progress (participant_id, node_id, status, unlocked_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertGameState = db.prepare(`
    INSERT OR IGNORE INTO participant_game_state (participant_id)
    VALUES (?)
  `);

  let inserted = 0;
  for (const team of teams) {
    const passwordHash = bcrypt.hashSync(team.password, BCRYPT_COST);
    const result = insertParticipant.run(
      team.username,
      passwordHash,
      team.team_name,
      team.username
    );
    const changed = (result as { changes: number }).changes;
    if (changed > 0) {
      inserted++;
      const row = db.prepare('SELECT id FROM participants WHERE username = ?').get(team.username) as { id: number };
      const participantId = row.id;

      for (const nodeId of nodeIds) {
        const isStart = nodeId === START_NODE_ID;
        insertProgress.run(
          participantId,
          nodeId,
          isStart ? 'unlocked' : 'locked',
          isStart ? new Date().toISOString() : null
        );
      }
      insertGameState.run(participantId);
    }
  }

  console.log(`Seed participants complete: ${inserted} new team(s) inserted.`);
  db.close();
}

runSeedParticipants();
