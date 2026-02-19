PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS participants (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  username          TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  team_name         TEXT NOT NULL,
  is_active         INTEGER NOT NULL DEFAULT 1,
  active_token_hash TEXT,
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nodes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  label         TEXT NOT NULL,
  node_type     TEXT NOT NULL CHECK (node_type IN ('start','normal','checkpoint','penalty','final')),
  position_x    INTEGER,
  position_y    INTEGER,
  is_visible    INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS node_edges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  from_node   INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node     INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  UNIQUE(from_node, to_node)
);

CREATE TABLE IF NOT EXISTS questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id       INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('text','image','pdf')) DEFAULT 'text',
  question_text TEXT,
  file_path     TEXT,
  answer        TEXT NOT NULL,
  difficulty    INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participant_node_progress (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id      INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  node_id             INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'locked',
  unlocked_at         TEXT,
  solved_at           TEXT,
  UNIQUE(participant_id, node_id)
);

CREATE TABLE IF NOT EXISTS question_attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id  INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  node_id         INTEGER NOT NULL REFERENCES nodes(id),
  is_correct      INTEGER NOT NULL,
  attempted_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participant_game_state (
  participant_id         INTEGER PRIMARY KEY REFERENCES participants(id),
  total_correct          INTEGER NOT NULL DEFAULT 0,
  total_mistakes         INTEGER NOT NULL DEFAULT 0,
  score                  INTEGER NOT NULL DEFAULT 0,
  last_checkpoint_id     INTEGER REFERENCES nodes(id),
  last_question_id       INTEGER REFERENCES questions(id),
  penalty_nodes_unlocked INTEGER NOT NULL DEFAULT 0,
  is_finished            INTEGER NOT NULL DEFAULT 0,
  started_at             TEXT DEFAULT (datetime('now')),
  finished_at            TEXT,
  updated_at             TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  team_name      TEXT NOT NULL,
  score          INTEGER NOT NULL,
  total_correct  INTEGER NOT NULL,
  total_mistakes INTEGER NOT NULL,
  finished_at    TEXT NOT NULL
);
