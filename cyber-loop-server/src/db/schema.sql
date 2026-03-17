-- =============================================================================
-- SCHEMA REFERENCE  —  matches live Supabase PostgreSQL database
-- WARNING: for reference only. Do NOT run this file directly.
--          Supabase manages migrations separately.
-- =============================================================================

-- ── competition_config ────────────────────────────────────────────────────────
-- Single-row table (id = 1 enforced by CHECK constraint).
-- Managed exclusively by the admin server.
CREATE TABLE public.competition_config (
  id          INTEGER      NOT NULL DEFAULT 1,
  is_active   BOOLEAN      NOT NULL DEFAULT false,
  started_at  TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  started_by  TEXT,
  CONSTRAINT  competition_config_pkey     PRIMARY KEY (id),
  CONSTRAINT  competition_config_only_one CHECK (id = 1)
);

-- ── participants ──────────────────────────────────────────────────────────────
CREATE TABLE public.participants (
  id                INTEGER      NOT NULL DEFAULT nextval('participants_id_seq'),
  username          TEXT         NOT NULL UNIQUE,
  password_hash     TEXT         NOT NULL,
  team_name         TEXT         NOT NULL,
  is_active         INTEGER      NOT NULL DEFAULT 1,   -- 0 | 1
  active_token_hash TEXT,                              -- SHA-256 of current JWT; NULL = logged out
  created_at        TIMESTAMPTZ           DEFAULT now(),
  CONSTRAINT participants_pkey PRIMARY KEY (id)
);

-- ── nodes ─────────────────────────────────────────────────────────────────────
-- node_type values:
--   start      — entry point; acts as a checkpoint (sets last_checkpoint_id)
--   normal     — standard puzzle node
--   checkpoint — clears checkpoint pointer on solve
--   penalty    — unlocked by wrong answers; hidden (is_visible=0) until unlocked
--                for a specific participant
--   final      — unlocks only when every other unlocked node is solved
CREATE TABLE public.nodes (
  id          INTEGER      NOT NULL DEFAULT nextval('nodes_id_seq'),
  label       TEXT         NOT NULL,
  node_type   TEXT         NOT NULL,
  position_x  INTEGER,
  position_y  INTEGER,
  is_visible  INTEGER      NOT NULL DEFAULT 1,         -- 0 | 1  (penalty nodes default 0)
  created_at  TIMESTAMPTZ           DEFAULT now(),
  CONSTRAINT nodes_pkey      PRIMARY KEY (id),
  CONSTRAINT nodes_type_check CHECK (
    node_type IN ('start', 'normal', 'checkpoint', 'penalty', 'final')
  )
);

-- ── node_edges ────────────────────────────────────────────────────────────────
-- Directed edges that define the main path.
-- Penalty nodes are NOT connected via edges; they are unlocked by game logic.
CREATE TABLE public.node_edges (
  id        INTEGER NOT NULL DEFAULT nextval('node_edges_id_seq'),
  from_node INTEGER NOT NULL,
  to_node   INTEGER NOT NULL,
  CONSTRAINT node_edges_pkey           PRIMARY KEY (id),
  CONSTRAINT node_edges_from_node_fkey FOREIGN KEY (from_node) REFERENCES public.nodes (id),
  CONSTRAINT node_edges_to_node_fkey   FOREIGN KEY (to_node)   REFERENCES public.nodes (id)
);

-- ── questions ─────────────────────────────────────────────────────────────────
-- node_id is an organisational FK only — the engine selects questions by
-- pool_type across the ENTIRE pool, not filtered by node_id.
--
-- pool_type:
--   main    — drawn for all non-penalty nodes
--   penalty — drawn exclusively for penalty nodes
--
-- question_type:
--   text    — plain text question_text field
--   image   — file_path points to an image in Supabase Storage
--   pdf     — file_path points to a PDF in Supabase Storage
CREATE TABLE public.questions (
  id            INTEGER      NOT NULL DEFAULT nextval('questions_id_seq'),
  node_id       INTEGER      NOT NULL,                 -- organisational reference only
  pool_type     TEXT         NOT NULL DEFAULT 'main',
  question_type TEXT         NOT NULL DEFAULT 'text',
  question_text TEXT,
  file_path     TEXT,                                  -- path inside Supabase Storage bucket
  answer        TEXT         NOT NULL,                 -- stored and compared in lowercase trim
  difficulty    INTEGER      NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ           DEFAULT now(),
  CONSTRAINT questions_pkey          PRIMARY KEY (id),
  CONSTRAINT questions_node_id_fkey  FOREIGN KEY (node_id)  REFERENCES public.nodes (id),
  CONSTRAINT questions_pool_check    CHECK (pool_type     IN ('main', 'penalty')),
  CONSTRAINT questions_type_check    CHECK (question_type IN ('text', 'image', 'pdf'))
);

-- ── participant_question_assignment ───────────────────────────────────────────
-- Tracks which question is currently assigned to each participant per node.
-- Deleted when: a node is solved (correct answer) or a wrong answer occurs
-- (forces a fresh draw on next visit). This is what makes wrong-answer
-- questions re-enter the eligible pool.
CREATE TABLE public.participant_question_assignment (
  participant_id INTEGER      NOT NULL,
  node_id        INTEGER      NOT NULL,
  question_id    INTEGER      NOT NULL,
  created_at     TIMESTAMPTZ           DEFAULT now(),
  CONSTRAINT participant_question_assignment_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES public.participants (id),
  CONSTRAINT participant_question_assignment_node_id_fkey
    FOREIGN KEY (node_id)        REFERENCES public.nodes (id),
  CONSTRAINT participant_question_assignment_question_id_fkey
    FOREIGN KEY (question_id)    REFERENCES public.questions (id)
);

-- ── participant_node_progress ─────────────────────────────────────────────────
-- One row per (participant, node) pair.
-- status lifecycle:  (absent) → unlocked → solved
--                    solved   → locked   (on wrong answer, nodes behind checkpoint locked)
--                    locked   → unlocked (reset target reopened after wrong answer)
CREATE TABLE public.participant_node_progress (
  id             INTEGER      NOT NULL DEFAULT nextval('participant_node_progress_id_seq'),
  participant_id INTEGER      NOT NULL,
  node_id        INTEGER      NOT NULL,
  status         TEXT         NOT NULL DEFAULT 'locked',  -- 'locked' | 'unlocked' | 'solved'
  unlocked_at    TIMESTAMPTZ,
  solved_at      TIMESTAMPTZ,
  CONSTRAINT participant_node_progress_pkey           PRIMARY KEY (id),
  CONSTRAINT participant_node_progress_participant_fk FOREIGN KEY (participant_id)
    REFERENCES public.participants (id),
  CONSTRAINT participant_node_progress_node_fk        FOREIGN KEY (node_id)
    REFERENCES public.nodes (id)
);

-- ── question_attempts ─────────────────────────────────────────────────────────
-- Append-only log of every answer submission for auditing.
CREATE TABLE public.question_attempts (
  id             INTEGER      NOT NULL DEFAULT nextval('question_attempts_id_seq'),
  participant_id INTEGER      NOT NULL,
  question_id    INTEGER      NOT NULL,
  node_id        INTEGER      NOT NULL,
  is_correct     INTEGER      NOT NULL,                   -- 0 | 1
  attempted_at   TIMESTAMPTZ           DEFAULT now(),
  CONSTRAINT question_attempts_pkey                  PRIMARY KEY (id),
  CONSTRAINT question_attempts_participant_id_fkey   FOREIGN KEY (participant_id)
    REFERENCES public.participants (id),
  CONSTRAINT question_attempts_question_id_fkey      FOREIGN KEY (question_id)
    REFERENCES public.questions (id),
  CONSTRAINT question_attempts_node_id_fkey          FOREIGN KEY (node_id)
    REFERENCES public.nodes (id)
);

-- ── participant_game_state ────────────────────────────────────────────────────
-- One row per participant. Created on first getState call, updated after
-- every answer submission.
--
-- penalty_counter — increments on every wrong answer (on any node type),
--                   decrements by 1 when a penalty node is solved.
--                   Used in score formula: score -= penalty_counter * 3
--
-- penalty_nodes_unlocked — total count of penalty nodes ever unlocked (monotonic).
--
-- last_checkpoint_id — ID of the most recently solved start/checkpoint node.
--                      Reset target falls back to this on a wrong answer.
--
-- last_question_id — ID of the last CORRECTLY answered question.
--                    Only updated on correct answers so wrong-answer questions
--                    immediately re-enter the eligible pool.
CREATE TABLE public.participant_game_state (
  participant_id         INTEGER      NOT NULL,
  total_correct          INTEGER      NOT NULL DEFAULT 0,
  total_mistakes         INTEGER      NOT NULL DEFAULT 0,
  score                  INTEGER      NOT NULL DEFAULT 0,
  last_checkpoint_id     INTEGER,
  current_node_id        INTEGER,
  current_question_id    INTEGER,
  last_question_id       INTEGER,
  penalty_nodes_unlocked INTEGER      NOT NULL DEFAULT 0,
  is_finished            INTEGER      NOT NULL DEFAULT 0,  -- 0 | 1
  started_at             TIMESTAMPTZ           DEFAULT now(),
  finished_at            TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ           DEFAULT now(),
  penalty_counter        INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT participant_game_state_pkey                    PRIMARY KEY (participant_id),
  CONSTRAINT participant_game_state_participant_id_fkey     FOREIGN KEY (participant_id)
    REFERENCES public.participants (id),
  CONSTRAINT participant_game_state_last_checkpoint_id_fkey FOREIGN KEY (last_checkpoint_id)
    REFERENCES public.nodes (id),
  CONSTRAINT participant_game_state_current_node_id_fkey    FOREIGN KEY (current_node_id)
    REFERENCES public.nodes (id),
  CONSTRAINT participant_game_state_current_question_id_fkey FOREIGN KEY (current_question_id)
    REFERENCES public.questions (id),
  CONSTRAINT participant_game_state_last_question_id_fkey   FOREIGN KEY (last_question_id)
    REFERENCES public.questions (id)
);

-- ── leaderboard ───────────────────────────────────────────────────────────────
-- The live leaderboard route reads participant_game_state + participant_node_progress
-- directly for real-time rankings. This table is the final snapshot only.
--
-- penalty_counter — value at finish time (for historical record).
-- puzzles_solved  — count of solved nodes at finish time.
CREATE TABLE public.leaderboard (
  id             INTEGER      NOT NULL DEFAULT nextval('leaderboard_id_seq'),
  participant_id INTEGER      NOT NULL UNIQUE,
  team_name      TEXT         NOT NULL,
  score          INTEGER      NOT NULL,
  total_correct  INTEGER      NOT NULL,
  total_mistakes INTEGER      NOT NULL,
  finished_at    TIMESTAMPTZ  NOT NULL,
  penalty_counter INTEGER     NOT NULL DEFAULT 0,
  puzzles_solved  INTEGER     NOT NULL DEFAULT 0,
  CONSTRAINT leaderboard_pkey               PRIMARY KEY (id),
  CONSTRAINT leaderboard_participant_id_fkey FOREIGN KEY (participant_id)
    REFERENCES public.participants (id)
);

-- =============================================================================
-- SCORE FORMULA (reference)
-- =============================================================================
--
--   start node solved     → +30 pts
--   checkpoint node solved → +30 pts
--   normal node solved     → +25 pts
--   final node solved      → +50 pts
--   penalty node solved    → +0 pts  (just reduces penalty_counter by 1)
--
--   penalty_counter        → -3 pts each  (floor 0, never negative)
--
--   total = (start/checkpoint points) + (normal points) + (final points)
--           - (penalty_counter * 3)
--   clamped to max(0, total)
--
-- Max possible score with this seed:
--   start(30) + 2×checkpoint(60) + 5×normal(125) + final(50) = 265 pts
--   (assuming zero wrong answers, so penalty_counter = 0)
--
-- =============================================================================
-- NODE GRAPH (this seed)
-- =============================================================================
--
--  [1:start] → [2:normal] → [3:checkpoint] → [4:normal]
--           → [5:checkpoint] → [6:normal] → [7:normal] → [8:final]
--
--  [9:penalty]   unlocked by 1st wrong answer on any main node
--  [10:penalty]  unlocked by 2nd wrong answer on any main node
--  [11:penalty]  unlocked by 3rd wrong answer on any main node
--
--  Penalty nodes are not in node_edges. Game logic handles their unlock.
--  Final node (8) only unlocks when nodes 1-7 AND all triggered penalty
--  nodes are solved.