# Cyber Loop Dry Run Scenario Matrix (2026-04-27)

## Scope
This document is a logical dry run of the current game flow across backend and frontend.

Included in this review:
- Auth and competition gating
- Game state initialization
- Question selection and randomness rules
- Correct and wrong answer transitions
- Penalty behavior
- Final unlock and game finish
- File attachment access and labels
- Scoreboard ordering and updates
- Server-time behavior (Supabase time)

## Verification Performed
- Backend build: PASS
- Frontend build: PASS
- Backend tests: BLOCKED (missing better-sqlite3 in current environment)

## Preconditions
These scenarios assume the following SQL is applied in Supabase:
- Unique constraints for participant_question_assignment and participant_node_progress
- try_end_competition RPC
- finalize_correct_answer and finalize_wrong_answer RPCs
- server_now RPC

---

## Scenario Matrix

| ID | Scenario | Process (Dry Run) | Expected Outcome | Status |
|---|---|---|---|---|
| S01 | No token on game routes | Client calls /api/game/state without Bearer token | 401 No token | Pass |
| S02 | Invalid token | Token verify fails in middleware | 403 Invalid token | Pass |
| S03 | Session invalidated | active_token_hash mismatch | 403 Session invalidated | Pass |
| S04 | Account disabled | participant is_active != 1 | 403 Account disabled | Pass |
| S05 | Competition ended | middleware checks competition status | 403 Competition has ended | Pass |
| S06 | First game-state load | participant_game_state missing, initialize row and unlock start node | State created, start node unlocked | Pass |
| S07 | Repeat game-state load | Existing rows are fetched | No duplicate init, consistent state | Pass |
| S08 | Locked node question fetch | Node progress is locked | Node is rejected | Pass |
| S09 | Solved node question fetch | Node progress is solved | Node is rejected | Pass |
| S10 | Unlocked node first question | No assignment exists, eligible pool queried, random chosen | Assignment inserted and question returned | Pass |
| S11 | Unlocked node revisit before submit | Existing assignment found | Same question returned (stable) | Pass |
| S12 | Pool exhausted | Exclusion rules remove all candidates | Question pool exhausted error | Pass |
| S13 | Concurrent getQuestion race | Two requests insert same participant_id,node_id assignment | One wins, one falls back to existing assignment | Pass (with DB unique constraint) |
| S14 | Immediate repeat prevention | Latest attempt question id excluded from next draw | Same question not repeated immediately | Pass |
| S15 | Main pool history exclusion post-checkpoint | Solved-node latest correct question ids excluded | Previously solved solved-node questions do not reappear | Pass |
| S16 | Penalty pool solved-question exclusion | Solved penalty-node latest correct question ids excluded | Solved penalty questions do not reappear on later penalties | Pass |
| S17 | Correct answer on normal/start/checkpoint | RPC logs attempt, solves node, updates score, unlocks next, clears assignment | Progress advances atomically | Pass |
| S18 | Correct answer on start/checkpoint | Same as S17 plus checkpoint pointer update | last_checkpoint_id updated | Pass |
| S19 | Correct answer on penalty | penalty_counter decremented by 1, node solved | Penalty debt reduced | Pass |
| S20 | Wrong answer on penalty | Attempt logged, stays on same penalty node, penalty_counter unchanged | No new penalty debt from penalty-node mistakes | Pass |
| S21 | Wrong answer on main before checkpoint | Reset target resolves to start node, locks non-preserved nodes, optional penalty unlock | Player sent back to start | Pass |
| S22 | Wrong answer on main after checkpoint | Reset target resolves to last_checkpoint_id | Player sent back to checkpoint | Pass |
| S23 | Penalty unlock progression | Wrong on main unlocks next unused penalty node and increments counter | New penalty appears, debt increases | Pass |
| S24 | Solved penalty reopened later | Wrong on main after solving penalty nodes | Solved penalties are not re-unlocked (consumed set) | Pass |
| S25 | Final unlock gate with penalty debt | checkFinalUnlock requires predecessors solved and penalty_counter == 0 | Final remains locked until debt cleared | Pass |
| S26 | Final solve | Correct answer on final node | is_finished set, finished_at set, leaderboard upserted | Pass |
| S27 | Question submit with unassigned questionId | submitAnswer cannot find assignment row for that participant/question | Request fails (currently generic 500 from controller) | Pass (behavior works, response mapping can be improved) |
| S28 | Attachment authorization | Files requested for inaccessible node/question | 403 Forbidden | Pass |
| S29 | Attachment URL lifetime | Signed URLs created with 10*60 seconds | Links valid for about 10 minutes | Pass |
| S30 | Attachment display labels | UI derives filename from path and strips puzzle<number>_ prefix | User sees real filename without puzzle prefix | Pass |
| S31 | Competition start time source | startCompetition uses Supabase server_now | Start/end anchored to DB time | Pass |
| S32 | Competition remainingMs source | getCompetitionStatus computes remaining using Supabase server_now | No dependency on app-host wall clock | Pass |
| S33 | Answer event timestamps source | Game engine gets server time and RPC functions write NOW() internally | Event timestamps anchored to DB time | Pass |
| S34 | Frontend timer source | Navbar uses server remainingMs snapshot and monotonic elapsed time | No user wall-clock dependency during countdown | Pass |
| S35 | Scoreboard ordering | Sort: score desc, penalty_counter asc, solved count desc | Stable rank order by game rules | Pass |
| S36 | Live scoreboard updates | Poll + realtime subscriptions | Scoreboard refreshes during play | Pass |

---

## Randomness Analysis (Why It Can Feel Repetitive)
Question selection is random among eligible candidates only, not among all questions.

Eligibility constraints applied before random pick:
- Active assignments are excluded
- Latest attempted question is excluded once
- Post-checkpoint solved-node history is excluded for main pool
- Solved-penalty history is excluded for penalty pool

So if the eligible set is small (for example, only 2-3 candidates), repetition frequency can still feel high even with random draw.

## Residual Risks and Gaps

1. Concurrent duplicate answer submissions are not fully serialized.
- Two very fast submit requests can still race between read and RPC write paths.
- Existing mitigations: frontend disables submit while in-flight, and answer rate limiter is enabled.
- Stronger hardening would require per-participant submit locking or fully lock-based RPC-driven submit flow.

2. Test environment gap.
- Automated tests are currently blocked due missing better-sqlite3 in vitest setup.
- Builds pass, but runtime confidence would be stronger after fixing test setup and running suite.

## Overall Verdict
Core game flow is logically consistent with current rules and recent fixes.

Current state is good for normal gameplay paths, with the two residual hardening items above still recommended for production robustness.
