import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_FILE_PATH || path.join(process.cwd(), 'data', 'cyber_loop.db');
const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');

function runSeed() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Run schema first (idempotent)
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }

  const nodeCount = db.prepare('SELECT COUNT(*) as c FROM nodes').get() as { c: number };
  if (nodeCount.c > 0) {
    console.log('Database already seeded (nodes exist). Skipping.');
    db.close();
    return;
  }

  const insertNode = db.prepare(`
    INSERT INTO nodes (id, label, node_type, position_x, position_y, is_visible)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertEdge = db.prepare(`
    INSERT INTO node_edges (from_node, to_node) VALUES (?, ?)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (node_id, question_type, question_text, answer, difficulty)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((nodes: Array<[number, string, string, number | null, number | null, number]>, edges: Array<[number, number]>, questions: Array<[number, string, string, string, number]>) => {
    for (const n of nodes) insertNode.run(...n);
    for (const e of edges) insertEdge.run(e[0], e[1]);
    for (const q of questions) insertQuestion.run(...q);
  });

  // Node IDs: 1=START, 2-18=1-17, 19-25=P1-P7, 26=FINAL
  const nodes: Array<[number, string, string, number | null, number | null, number]> = [
    [1, 'START', 'start', 0, 0, 1],
    [2, '1', 'normal', 100, 0, 1],
    [3, '2', 'normal', 200, 0, 1],
    [4, '3', 'normal', 300, 0, 1],
    [5, '4', 'normal', 400, 0, 1],
    [6, '5', 'checkpoint', 500, 0, 1],
    [7, '6', 'normal', 600, 0, 1],
    [8, '7', 'normal', 700, 0, 1],
    [9, '8', 'checkpoint', 800, 0, 1],
    [10, '9', 'normal', 900, 0, 1],
    [11, '10', 'normal', 1000, 0, 1],
    [12, '11', 'normal', 1100, 0, 1],
    [13, '12', 'checkpoint', 1200, 0, 1],
    [14, '13', 'normal', 1300, 0, 1],
    [15, '14', 'normal', 1400, 0, 1],
    [16, '15', 'normal', 1500, 0, 1],
    [17, '16', 'normal', 1600, 0, 1],
    [18, '17', 'normal', 1700, 0, 1],
    [19, 'P1', 'penalty', 500, 100, 0],
    [20, 'P2', 'penalty', 600, 100, 0],
    [21, 'P3', 'penalty', 700, 100, 0],
    [22, 'P4', 'penalty', 800, 100, 0],
    [23, 'P5', 'penalty', 900, 100, 0],
    [24, 'P6', 'penalty', 1000, 100, 0],
    [25, 'P7', 'penalty', 1100, 100, 0],
    [26, 'FINAL', 'final', 1800, 0, 1],
  ];

  // Main path: START → 1 → … → 17 → FINAL
  const edges: Array<[number, number]> = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 26],
  ];
  // Penalty chain: P1 → P2 → … → P7
  for (let i = 19; i <= 24; i++) edges.push([i, i + 1]);

  // Questions: ≥5 for normal/checkpoint/final, ≥7 for penalty (difficulty 2)
  const questions: Array<[number, string, string, string, number]> = [];

  const addQuestions = (nodeId: number, count: number, difficulty: number) => {
    for (let i = 1; i <= count; i++) {
      questions.push([
        nodeId,
        'text',
        `Placeholder question ${i} for node ${nodeId}. Replace with real content.`,
        `answer_${nodeId}_${i}`,
        difficulty,
      ]);
    }
  };

  addQuestions(1, 5, 1);   // START
  for (let id = 2; id <= 18; id++) addQuestions(id, 5, 1); // 1–17
  for (let id = 19; id <= 25; id++) addQuestions(id, 7, 2); // P1–P7 (hard)
  addQuestions(26, 5, 1);  // FINAL

  insertMany(nodes, edges, questions);

  console.log('Seed complete: nodes, edges, and questions inserted.');
  db.close();
}

runSeed();
