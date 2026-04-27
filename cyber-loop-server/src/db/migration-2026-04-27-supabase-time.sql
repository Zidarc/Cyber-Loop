-- =============================================================================
-- MIGRATION: Supabase server time alignment
-- Run in Supabase SQL Editor after your existing migration.
-- Safe to re-run (uses CREATE OR REPLACE).
-- =============================================================================

-- RPC for obtaining DB server time from application code.
CREATE OR REPLACE FUNCTION server_now()
RETURNS TIMESTAMPTZ AS $$
  SELECT NOW();
$$ LANGUAGE sql STABLE;


-- =============================================================================
-- RPC: finalize_correct_answer
-- Uses DB time (NOW()) for all write timestamps, ignoring host clock drift.
-- =============================================================================
CREATE OR REPLACE FUNCTION finalize_correct_answer(
  p_participant_id         INTEGER,
  p_node_id                INTEGER,
  p_question_id            INTEGER,
  p_node_type              TEXT,
  p_ts                     TIMESTAMPTZ,
  p_total_correct          INTEGER,
  p_total_mistakes         INTEGER,
  p_last_checkpoint_id     INTEGER,
  p_penalty_counter        INTEGER,
  p_penalty_nodes_unlocked INTEGER,
  p_is_finished            INTEGER,
  p_finished_at            TIMESTAMPTZ,
  p_unlock_node_id         INTEGER,
  p_leaderboard_team_name  TEXT,
  p_last_question_id       INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_score          INTEGER;
  v_puzzles_solved INTEGER;
  v_now            TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO question_attempts
    (participant_id, question_id, node_id, is_correct, attempted_at)
  VALUES
    (p_participant_id, p_question_id, p_node_id, 1, v_now);

  INSERT INTO participant_node_progress
    (participant_id, node_id, status, unlocked_at, solved_at)
  VALUES
    (p_participant_id, p_node_id, 'solved', v_now, v_now)
  ON CONFLICT (participant_id, node_id) DO UPDATE
    SET status    = 'solved',
        solved_at = v_now;

  SELECT GREATEST(0,
    COALESCE(SUM(
      CASE n.node_type
        WHEN 'normal'     THEN 25
        WHEN 'start'      THEN 30
        WHEN 'checkpoint' THEN 30
        WHEN 'final'      THEN 50
        ELSE 0
      END
    ), 0) - (p_penalty_counter * 3)
  ) INTO v_score
  FROM participant_node_progress pnp
  JOIN nodes n ON n.id = pnp.node_id
  WHERE pnp.participant_id = p_participant_id
    AND pnp.status = 'solved';

  IF p_unlock_node_id IS NOT NULL THEN
    INSERT INTO participant_node_progress
      (participant_id, node_id, status, unlocked_at)
    VALUES
      (p_participant_id, p_unlock_node_id, 'unlocked', v_now)
    ON CONFLICT (participant_id, node_id) DO UPDATE
      SET status      = 'unlocked',
          unlocked_at = v_now;
  END IF;

  DELETE FROM participant_question_assignment
   WHERE participant_id = p_participant_id
     AND node_id        = p_node_id;

  INSERT INTO participant_game_state (
    participant_id, total_correct, total_mistakes, score,
    last_checkpoint_id, current_node_id, current_question_id, last_question_id,
    penalty_nodes_unlocked, is_finished, finished_at, updated_at, penalty_counter
  ) VALUES (
    p_participant_id, p_total_correct, p_total_mistakes, v_score,
    p_last_checkpoint_id, p_node_id, p_question_id, p_last_question_id,
    p_penalty_nodes_unlocked, p_is_finished,
    CASE WHEN p_is_finished = 1 THEN v_now ELSE NULL END,
    v_now,
    p_penalty_counter
  )
  ON CONFLICT (participant_id) DO UPDATE SET
    total_correct          = EXCLUDED.total_correct,
    total_mistakes         = EXCLUDED.total_mistakes,
    score                  = EXCLUDED.score,
    last_checkpoint_id     = EXCLUDED.last_checkpoint_id,
    current_node_id        = EXCLUDED.current_node_id,
    current_question_id    = EXCLUDED.current_question_id,
    last_question_id       = EXCLUDED.last_question_id,
    penalty_nodes_unlocked = EXCLUDED.penalty_nodes_unlocked,
    is_finished            = EXCLUDED.is_finished,
    finished_at            = EXCLUDED.finished_at,
    updated_at             = EXCLUDED.updated_at,
    penalty_counter        = EXCLUDED.penalty_counter;

  IF p_is_finished = 1 AND p_leaderboard_team_name IS NOT NULL THEN
    SELECT COUNT(*) INTO v_puzzles_solved
    FROM participant_node_progress
    WHERE participant_id = p_participant_id
      AND status = 'solved';

    INSERT INTO leaderboard (
      participant_id, team_name, score, total_correct, total_mistakes,
      penalty_counter, puzzles_solved, finished_at
    ) VALUES (
      p_participant_id, p_leaderboard_team_name, v_score,
      p_total_correct, p_total_mistakes, p_penalty_counter,
      v_puzzles_solved, v_now
    )
    ON CONFLICT (participant_id) DO UPDATE SET
      team_name       = EXCLUDED.team_name,
      score           = EXCLUDED.score,
      total_correct   = EXCLUDED.total_correct,
      total_mistakes  = EXCLUDED.total_mistakes,
      penalty_counter = EXCLUDED.penalty_counter,
      puzzles_solved  = EXCLUDED.puzzles_solved,
      finished_at     = EXCLUDED.finished_at;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- RPC: finalize_wrong_answer
-- Uses DB time (NOW()) for all write timestamps, ignoring host clock drift.
-- =============================================================================
CREATE OR REPLACE FUNCTION finalize_wrong_answer(
  p_participant_id         INTEGER,
  p_node_id                INTEGER,
  p_question_id            INTEGER,
  p_ts                     TIMESTAMPTZ,
  p_penalty_node_to_unlock INTEGER,
  p_reset_target_id        INTEGER,
  p_nodes_to_lock          INTEGER[],
  p_total_correct          INTEGER,
  p_total_mistakes         INTEGER,
  p_last_checkpoint_id     INTEGER,
  p_penalty_counter        INTEGER,
  p_penalty_nodes_unlocked INTEGER,
  p_current_node_id        INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER;
  v_now   TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO question_attempts
    (participant_id, question_id, node_id, is_correct, attempted_at)
  VALUES
    (p_participant_id, p_question_id, p_node_id, 0, v_now);

  IF p_penalty_node_to_unlock IS NOT NULL THEN
    INSERT INTO participant_node_progress
      (participant_id, node_id, status, unlocked_at)
    VALUES
      (p_participant_id, p_penalty_node_to_unlock, 'unlocked', v_now)
    ON CONFLICT (participant_id, node_id) DO UPDATE
      SET status      = 'unlocked',
          unlocked_at = v_now;
  END IF;

  IF p_nodes_to_lock IS NOT NULL AND cardinality(p_nodes_to_lock) > 0 THEN
    UPDATE participant_node_progress
       SET status    = 'locked',
           solved_at = NULL
     WHERE participant_id = p_participant_id
       AND node_id        = ANY(p_nodes_to_lock);
  END IF;

  INSERT INTO participant_node_progress
    (participant_id, node_id, status, unlocked_at, solved_at)
  VALUES
    (p_participant_id, p_reset_target_id, 'unlocked', v_now, NULL)
  ON CONFLICT (participant_id, node_id) DO UPDATE
    SET status      = 'unlocked',
        solved_at   = NULL,
        unlocked_at = v_now;

  DELETE FROM participant_question_assignment
   WHERE participant_id = p_participant_id
     AND node_id        = ANY(ARRAY[p_node_id, p_reset_target_id]::INTEGER[]);

  SELECT GREATEST(0,
    COALESCE(SUM(
      CASE n.node_type
        WHEN 'normal'     THEN 25
        WHEN 'start'      THEN 30
        WHEN 'checkpoint' THEN 30
        WHEN 'final'      THEN 50
        ELSE 0
      END
    ), 0) - (p_penalty_counter * 3)
  ) INTO v_score
  FROM participant_node_progress pnp
  JOIN nodes n ON n.id = pnp.node_id
  WHERE pnp.participant_id = p_participant_id
    AND pnp.status = 'solved';

  INSERT INTO participant_game_state (
    participant_id, total_correct, total_mistakes, score,
    last_checkpoint_id, current_node_id, current_question_id, last_question_id,
    penalty_nodes_unlocked, is_finished, updated_at, penalty_counter
  ) VALUES (
    p_participant_id, p_total_correct, p_total_mistakes, v_score,
    p_last_checkpoint_id, p_current_node_id, p_question_id, p_question_id,
    p_penalty_nodes_unlocked, 0, v_now, p_penalty_counter
  )
  ON CONFLICT (participant_id) DO UPDATE SET
    total_correct          = EXCLUDED.total_correct,
    total_mistakes         = EXCLUDED.total_mistakes,
    score                  = EXCLUDED.score,
    last_checkpoint_id     = EXCLUDED.last_checkpoint_id,
    current_node_id        = EXCLUDED.current_node_id,
    current_question_id    = EXCLUDED.current_question_id,
    last_question_id       = EXCLUDED.last_question_id,
    penalty_nodes_unlocked = EXCLUDED.penalty_nodes_unlocked,
    updated_at             = EXCLUDED.updated_at,
    penalty_counter        = EXCLUDED.penalty_counter;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;
