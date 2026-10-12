import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let dbInstance: SqlDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<SqlDatabase> | null = null;

const DB_PATH = path.join(process.cwd(), 'smartviva.db');

export async function getDb(): Promise<SqlDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist');
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(wasmPath, file),
    });

    let db: SqlDatabase;
    if (fs.existsSync(DB_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error('Error loading existing db, creating fresh:', err);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    dbInstance = db;
    await initSchemaAndSeed(db);
    saveDb();
    return db;
  })();

  return initPromise;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

// Helper query wrappers
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error(`Database query failed for SQL [${sql}]:`, err);
    throw err;
  }
}

export async function get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  try {
    db.run(sql, params);
    saveDb();
  } catch (err) {
    console.error(`Database run failed for SQL [${sql}]:`, err);
    throw err;
  }
}

async function initSchemaAndSeed(db: SqlDatabase) {
  // Create all tables specified in prompt
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'student',
      is_guest INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      last_active TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS years (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      year_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      description TEXT,
      FOREIGN KEY (year_id) REFERENCES years(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      unit_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL,
      title TEXT NOT NULL,
      concepts_summary TEXT,
      importance TEXT DEFAULT 'High',
      mastery_level INTEGER DEFAULT 0,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT,
      unit_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      options_json TEXT,
      ideal_answer TEXT NOT NULL,
      key_concepts_json TEXT,
      rubric_json TEXT,
      times_asked INTEGER DEFAULT 0,
      times_correct INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      scored_marks INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ongoing',
      adaptive_difficulty TEXT DEFAULT 'medium',
      duration_seconds INTEGER DEFAULT 0,
      readiness_impact REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      unit_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      presented_difficulty TEXT NOT NULL,
      student_answer TEXT,
      ai_evaluation_json TEXT,
      marks_obtained REAL DEFAULT 0,
      max_marks REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      asked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      evaluated_at TEXT,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      exam_question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      raw_answer_text TEXT,
      audio_transcript TEXT,
      answer_time_seconds INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      exam_question_id TEXT NOT NULL,
      concept_accuracy_pct REAL,
      completeness_pct REAL,
      technical_correctness_pct REAL,
      relevance_pct REAL,
      examples_used_score REAL,
      strengths TEXT,
      missing_concepts TEXT,
      mistakes TEXT,
      suggested_improvements TEXT,
      model_answer TEXT,
      learning_mode_json TEXT,
      FOREIGN KEY (exam_question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      student_answer TEXT,
      ideal_answer TEXT NOT NULL,
      feedback_summary TEXT,
      mistake_count INTEGER DEFAULT 1,
      consecutive_correct INTEGER DEFAULT 0,
      is_mastered INTEGER DEFAULT 0,
      last_reviewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS performance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      total_exams INTEGER DEFAULT 0,
      questions_attempted INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      total_marks_earned REAL DEFAULT 0,
      total_marks_possible REAL DEFAULT 0,
      accuracy_pct REAL DEFAULT 0,
      readiness_score REAL DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_study_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      plan_date TEXT NOT NULL,
      day_label TEXT NOT NULL,
      target_unit TEXT NOT NULL,
      target_topic TEXT NOT NULL,
      focus_areas TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Check if seed data exists
  const existingPatterns = db.exec('SELECT COUNT(*) as cnt FROM patterns');
  const count = existingPatterns[0]?.values[0]?.[0] as number;

  if (count === 0) {
    seedDatabase(db);
  }
}

function seedDatabase(db: SqlDatabase) {
  // 1. Seed Users (Demo Student & Admin)
  db.run(`
    INSERT INTO users (id, name, email, password_hash, role, is_guest, xp, level, streak, created_at) VALUES
    ('usr-admin-1', 'Dr. Evelyn Sterling (Admin)', 'admin@smartviva.edu', '$2a$10$vI8a7VyV/lB7c1qN.4vRre5qVzRz4Cg5FkQeY3gJ8vS1z3f5w8jGu', 'admin', 0, 5000, 15, 12, datetime('now')),
    ('usr-demo-1', 'Riddhi Sharma', 'student@smartviva.edu', '$2a$10$vI8a7VyV/lB7c1qN.4vRre5qVzRz4Cg5FkQeY3gJ8vS1z3f5w8jGu', 'student', 0, 750, 4, 5, datetime('now'));
  `);

  // 2. Seed Academic Patterns: SPPU, Autonomous, Diploma, Engineering, MCA, MBA, Custom
  const patterns = [
    { id: 'pat-sppu', name: 'SPPU 2024 Pattern (NEP-2020)', desc: 'Official Savitribai Phule Pune University curriculum with credit choice framework' },
    { id: 'pat-autonomous', name: 'Autonomous Colleges Pattern', desc: 'Autonomous engineering & technology institutions (COEP, VJTI, VIT, etc.)' },
    { id: 'pat-engineering', name: 'Degree Engineering (AICTE Model)', desc: 'National model curriculum for Bachelor of Technology / Engineering' },
    { id: 'pat-diploma', name: 'Polytechnic Diploma (MSBTE I-Scheme)', desc: 'State board technical education diploma in engineering & IT' },
    { id: 'pat-mca', name: 'MCA (Master of Computer Applications)', desc: 'Postgraduate professional software systems & data engineering curriculum' },
    { id: 'pat-mba', name: 'MBA (Master of Business Administration)', desc: 'Management studies, strategy, operations & business analytics' },
    { id: 'pat-custom', name: 'Custom Institutional Pattern', desc: 'Custom university or departmental syllabus created by academic administrator' },
  ];

  for (const p of patterns) {
    db.run(`INSERT INTO patterns (id, name, description, is_system) VALUES ('${p.id}', '${p.name}', '${p.desc}', 1);`);
  }

  // 3. Seed Branches for SPPU & Autonomous
  const branches = [
    { id: 'br-sppu-comp', pat: 'pat-sppu', name: 'Computer Engineering', code: 'COMP' },
    { id: 'br-sppu-aids', pat: 'pat-sppu', name: 'AI & Data Science', code: 'AIDS' },
    { id: 'br-sppu-it', pat: 'pat-sppu', name: 'Information Technology', code: 'IT' },
    { id: 'br-sppu-entc', pat: 'pat-sppu', name: 'Electronics & Telecommunication', code: 'ENTC' },
    { id: 'br-auto-cs', pat: 'pat-autonomous', name: 'Computer Science & Engineering', code: 'CSE' },
    { id: 'br-mca-core', pat: 'pat-mca', name: 'Master of Computer Applications', code: 'MCA' },
    { id: 'br-mba-tech', pat: 'pat-mba', name: 'MBA Information Systems & Analytics', code: 'MBA-IT' },
  ];

  for (const b of branches) {
    db.run(`INSERT INTO branches (id, pattern_id, name, code) VALUES ('${b.id}', '${b.pat}', '${b.name}', '${b.code}');`);
  }

  // 4. Seed Years
  const years = [
    { id: 'yr-sppu-se', branch: 'br-sppu-comp', name: 'Second Year (SE)' },
    { id: 'yr-sppu-te', branch: 'br-sppu-comp', name: 'Third Year (TE)' },
    { id: 'yr-sppu-be', branch: 'br-sppu-comp', name: 'Final Year (BE)' },
    { id: 'yr-auto-y2', branch: 'br-auto-cs', name: 'Year 2 (Sem 3 & 4)' },
    { id: 'yr-mca-y1', branch: 'br-mca-core', name: 'Year 1 (Semester I & II)' },
  ];

  for (const y of years) {
    db.run(`INSERT INTO years (id, branch_id, name) VALUES ('${y.id}', '${y.branch}', '${y.name}');`);
  }

  // 5. Seed Core Subjects
  const subjects = [
    {
      id: 'sub-dbms',
      year_id: 'yr-sppu-se',
      code: 'CS-204',
      name: 'Database Management Systems',
      credits: 4,
      desc: 'Relational algebra, SQL, normalization, concurrency control, ACID properties, and transaction indexing.',
    },
    {
      id: 'sub-ds',
      year_id: 'yr-sppu-se',
      code: 'CS-201',
      name: 'Data Structures & Algorithms',
      credits: 4,
      desc: 'Linear and non-linear data structures, trees, graphs, sorting, searching, and algorithmic asymptotic complexity.',
    },
    {
      id: 'sub-cn',
      year_id: 'yr-sppu-te',
      code: 'CS-301',
      name: 'Computer Networks',
      credits: 3,
      desc: 'OSI 7-layer model, TCP/IP protocol suite, subnetting, routing algorithms, transport layer protocols, and network security.',
    },
    {
      id: 'sub-os',
      year_id: 'yr-sppu-se',
      code: 'CS-203',
      name: 'Operating Systems',
      credits: 3,
      desc: 'Process scheduling, deadlocks, virtual memory management, paging, file systems, and concurrency primitives.',
    },
  ];

  for (const s of subjects) {
    db.run(`INSERT INTO subjects (id, year_id, code, name, credits, description) VALUES ('${s.id}', '${s.year_id}', '${s.code}', '${s.name}', ${s.credits}, '${s.desc}');`);
  }

  // 6. Seed Units for DBMS
  const dbmsUnits = [
    { id: 'unt-dbms-1', sub: 'sub-dbms', num: 1, title: 'Introduction to DBMS & ER Modeling', desc: 'File system vs DBMS, 3-tier architecture, data independence, ER diagrams and cardinalities' },
    { id: 'unt-dbms-2', sub: 'sub-dbms', num: 2, title: 'Relational Model & Relational Algebra', desc: 'Codd rules, relational schema, keys (primary, foreign, candidate), relational algebra operations' },
    { id: 'unt-dbms-3', sub: 'sub-dbms', num: 3, title: 'SQL & Database Normalization', desc: 'DDL, DML, DCL, joins, subqueries, functional dependencies, 1NF, 2NF, 3NF, BCNF, lossless join decomposition' },
    { id: 'unt-dbms-4', sub: 'sub-dbms', num: 4, title: 'Transaction Management & ACID', desc: 'Transaction states, ACID properties, serializability, conflict serializability, precedence graphs' },
    { id: 'unt-dbms-5', sub: 'sub-dbms', num: 5, title: 'Concurrency Control & Deadlocks', desc: 'Two-phase locking (2PL), timestamp ordering, deadlock detection, prevention and recovery' },
    { id: 'unt-dbms-6', sub: 'sub-dbms', num: 6, title: 'Indexing & NoSQL Overview', desc: 'B-Trees, B+ Trees, primary vs secondary indices, hashing, introduction to MongoDB and CAP theorem' },
  ];

  for (const u of dbmsUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 7. Seed Units for Data Structures
  const dsUnits = [
    { id: 'unt-ds-1', sub: 'sub-ds', num: 1, title: 'Algorithm Analysis & Complexity', desc: 'Time & Space complexity, Big O, Omega, Theta notations, recurrence relations' },
    { id: 'unt-ds-2', sub: 'sub-ds', num: 2, title: 'Linear Structures: Stacks & Queues', desc: 'Stack implementation, infix to postfix conversion, circular queues, priority queues' },
    { id: 'unt-ds-3', sub: 'sub-ds', num: 3, title: 'Linked Lists & Applications', desc: 'Singly, doubly, circular linked lists, polynomial addition, dynamic memory management' },
    { id: 'unt-ds-4', sub: 'sub-ds', num: 4, title: 'Trees & Binary Search Trees', desc: 'Tree traversals (Inorder, Preorder, Postorder), BST operations, AVL balance trees' },
    { id: 'unt-ds-5', sub: 'sub-ds', num: 5, title: 'Graphs & Shortest Paths', desc: 'Adjacency matrix, adjacency list, BFS, DFS, Dijkstra algorithm, Prim and Kruskal MST' },
    { id: 'unt-ds-6', sub: 'sub-ds', num: 6, title: 'Hashing & Sorting Algorithms', desc: 'Collision resolution (Chaining, Open addressing), Quicksort, Mergesort, Heapsort' },
  ];

  for (const u of dsUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 8. Seed Topics for DBMS Units
  const dbmsTopics = [
    { id: 'top-dbms-1-1', unit: 'unt-dbms-1', title: 'Three-Schema Architecture & Data Independence', summary: 'Physical, conceptual, and external schemas. Logical vs physical data independence.' },
    { id: 'top-dbms-1-2', unit: 'unt-dbms-1', title: 'Entity-Relationship (ER) Modeling', summary: 'Entities, strong vs weak entities, attributes, relationships, cardinalities (1:1, 1:N, M:N).' },
    { id: 'top-dbms-2-1', unit: 'unt-dbms-2', title: 'Relational Integrity Constraints & Keys', summary: 'Super key, candidate key, primary key, foreign key, entity integrity, referential integrity.' },
    { id: 'top-dbms-3-1', unit: 'unt-dbms-3', title: 'Normalization & Functional Dependencies', summary: '1NF (atomic values), 2NF (no partial dependency), 3NF (no transitive dependency), BCNF.' },
    { id: 'top-dbms-4-1', unit: 'unt-dbms-4', title: 'ACID Properties & Transaction States', summary: 'Atomicity, Consistency, Isolation, Durability. Active, partially committed, committed, failed, aborted states.' },
    { id: 'top-dbms-5-1', unit: 'unt-dbms-5', title: 'Concurrency Control & Two-Phase Locking', summary: 'Lost update, dirty read, unrepeatable read. Growing phase, shrinking phase, strict 2PL, deadlock handling.' },
    { id: 'top-dbms-6-1', unit: 'unt-dbms-6', title: 'B-Trees and B+ Trees Indexing', summary: 'Multi-level indexing, internal nodes vs leaf nodes, search, insertion, range queries efficiency.' },
  ];

  for (const t of dbmsTopics) {
    db.run(`INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level) VALUES ('${t.id}', '${t.unit}', '${t.title}', '${t.summary}', 'High', 65);`);
  }

  // 9. Seed Questions (Viva, MCQs, 2 Marks, 5 Marks, 10 Marks, Scenario, Application)
  const seedQuestions = [
    // Unit 1 Questions
    {
      id: 'q-dbms-101',
      topic: 'top-dbms-1-1',
      unit: 'unt-dbms-1',
      sub: 'sub-dbms',
      text: 'Explain the 3-tier architecture of DBMS and how it achieves physical and logical data independence.',
      type: '5_marks',
      diff: 'medium',
      options: null,
      answer: 'The 3-tier ANSI-SPARC architecture separates the user view from physical storage: 1) External/View Level (user views), 2) Conceptual/Logical Level (community view, entities, relationships, constraints), 3) Internal/Physical Level (physical data storage, indexing, record layouts). Logical Data Independence is the capacity to change conceptual schema without altering external schemas. Physical Data Independence is the capacity to modify internal schema (e.g. changing storage structures or indexing) without changing the conceptual schema.',
      concepts: JSON.stringify(['3-tier architecture', 'External schema', 'Conceptual schema', 'Internal schema', 'Physical data independence', 'Logical data independence']),
      rubric: 'Full marks for naming all 3 levels accurately and defining both types of data independence with distinctions.',
    },
    {
      id: 'q-dbms-102',
      topic: 'top-dbms-1-2',
      unit: 'unt-dbms-1',
      sub: 'sub-dbms',
      text: 'What is a Weak Entity set in an ER diagram? How is it represented and how is its primary key formed?',
      type: 'viva',
      diff: 'easy',
      options: null,
      answer: 'A weak entity set is an entity set that does not have sufficient attributes to form a primary key of its own. It depends on an identifying/owner entity set for existence. In ER diagrams, it is represented by a double rectangle, and its identifying relationship is represented by a double diamond. Its primary key is formed by combining the primary key of the identifying entity set with the discriminator (partial key) of the weak entity set, which is underlined with a dashed line.',
      concepts: JSON.stringify(['Weak entity', 'Discriminator', 'Partial key', 'Double rectangle', 'Identifying relationship']),
      rubric: 'Must explain lack of independent primary key, identifying entity dependency, and combination of owner PK + partial key.',
    },

    // Unit 2 Questions
    {
      id: 'q-dbms-201',
      topic: 'top-dbms-2-1',
      unit: 'unt-dbms-2',
      sub: 'sub-dbms',
      text: 'Differentiate between a Candidate Key, Primary Key, and Foreign Key with a concrete database example.',
      type: '5_marks',
      diff: 'medium',
      options: null,
      answer: 'Candidate Key is a minimal super key with unique values and no redundant attributes. Primary Key is one candidate key chosen by the database designer to uniquely identify tuples in a table (cannot contain NULLs). Foreign Key is an attribute in one table that references the Primary Key of another table, enforcing referential integrity. Example: In an Employee(emp_id, ssn, name, dept_id) table, {emp_id} and {ssn} are Candidate Keys. emp_id is chosen as Primary Key. dept_id is a Foreign Key referencing Department(dept_id).',
      concepts: JSON.stringify(['Candidate Key', 'Primary Key', 'Foreign Key', 'Referential Integrity', 'Minimal Super Key']),
      rubric: 'Clear definitions of all 3 keys with exact relational example showing primary and foreign key mapping.',
    },
    {
      id: 'q-dbms-202',
      topic: 'top-dbms-2-1',
      unit: 'unt-dbms-2',
      sub: 'sub-dbms',
      text: 'Which relational integrity rule states that foreign key values must either match a valid primary key in the referenced relation or be null?',
      type: 'mcq',
      diff: 'easy',
      options: JSON.stringify(['Entity Integrity Rule', 'Referential Integrity Rule', 'Domain Constraint', 'Key Constraint']),
      answer: 'Referential Integrity Rule',
      concepts: JSON.stringify(['Referential integrity', 'Foreign key constraint', 'Relational model']),
      rubric: 'Option 2 is correct.',
    },

    // Unit 3 Questions
    {
      id: 'q-dbms-301',
      topic: 'top-dbms-3-1',
      unit: 'unt-dbms-3',
      sub: 'sub-dbms',
      text: 'Explain Database Normalization from 1NF through BCNF. What anomalies does normalization eliminate?',
      type: '10_marks',
      diff: 'hard',
      options: null,
      answer: 'Normalization is the process of organizing relational tables to minimize data redundancy and prevent insertion, update, and deletion anomalies. 1NF: Atomic values only, no repeating groups. 2NF: In 1NF and no partial functional dependency (non-prime attributes must depend on the whole candidate key). 3NF: In 2NF and no transitive functional dependency (X -> Y where Y is non-prime and X is not a super key). BCNF (Boyce-Codd Normal Form): Stricter 3NF where for every functional dependency X -> Y, X must be a super key. Eliminates insertion anomalies (cannot add data without extra info), update anomalies (inconsistent duplicate updates), and deletion anomalies (loss of unintended data when deleting a record).',
      concepts: JSON.stringify(['1NF', '2NF', '3NF', 'BCNF', 'Insertion anomaly', 'Deletion anomaly', 'Update anomaly', 'Transitive dependency', 'Partial dependency']),
      rubric: 'Full 10 marks requires thorough breakdown of 1NF, 2NF, 3NF, BCNF rules, definitions of partial/transitive dependencies, and explanation of all three anomalies.',
    },
    {
      id: 'q-dbms-302',
      topic: 'top-dbms-3-1',
      unit: 'unt-dbms-3',
      sub: 'sub-dbms',
      text: 'Why is Boyce-Codd Normal Form (BCNF) considered stronger than Third Normal Form (3NF)? Provide a scenario where a relation is in 3NF but not BCNF.',
      type: 'viva',
      diff: 'application',
      options: null,
      answer: 'In 3NF, for any non-trivial dependency X -> A, either X is a super key OR A is a prime attribute (part of a candidate key). In BCNF, this second relaxation is removed: X MUST be a super key, regardless of whether A is prime. Thus, 3NF allows dependencies where a non-super-key determines a prime attribute, while BCNF strictly forbids it. Scenario: Consider Student_Advisor(student_id, subject, advisor) where (student_id, subject) is candidate key and each advisor teaches only one subject, giving advisor -> subject. Subject is prime, so it is in 3NF, but advisor is not a super key, violating BCNF.',
      concepts: JSON.stringify(['BCNF vs 3NF', 'Prime attribute exception', 'Super key condition', 'Overlapping candidate keys']),
      rubric: 'Must explain the prime attribute exception in 3NF and provide or explain the classic overlapping candidate key scenario.',
    },

    // Unit 4 Questions
    {
      id: 'q-dbms-401',
      topic: 'top-dbms-4-1',
      unit: 'unt-dbms-4',
      sub: 'sub-dbms',
      text: 'Explain the ACID properties of database transactions and describe how the DBMS engine guarantees each property.',
      type: '5_marks',
      diff: 'medium',
      options: null,
      answer: 'ACID ensures reliable transaction processing: 1) Atomicity: "All or nothing" execution. Ensured by the Recovery Manager using Write-Ahead Logging (WAL) and rollback mechanisms. 2) Consistency: The database transforms from one valid state to another, satisfying all integrity constraints. Ensured by schema constraints and application logic. 3) Isolation: Concurrent transactions do not interfere with each other. Ensured by the Concurrency Control Manager using locking protocols (2PL) or timestamping. 4) Durability: Once committed, changes survive system crashes. Ensured by non-volatile storage and database redo logs.',
      concepts: JSON.stringify(['Atomicity', 'Consistency', 'Isolation', 'Durability', 'Write-Ahead Log', 'Concurrency control']),
      rubric: 'Must state all 4 properties with their exact meanings and the internal DBMS mechanism responsible for guaranteeing them.',
    },
    {
      id: 'q-dbms-402',
      topic: 'top-dbms-4-1',
      unit: 'unt-dbms-4',
      sub: 'sub-dbms',
      text: 'A banking system crashes right after debiting $500 from Account A but before crediting it to Account B. Which ACID property is directly violated if Account A remains debited without Account B receiving the funds?',
      type: 'scenario',
      diff: 'medium',
      options: null,
      answer: 'Atomicity is violated. The fund transfer is an atomic unit of work consisting of both debit and credit operations. Under Atomicity, either both operations must complete or neither must occur. If the crash causes partial execution leaving the database inconsistent, the recovery manager must perform an UNDO to restore Account A to its initial balance.',
      concepts: JSON.stringify(['Atomicity', 'Atomic transaction', 'Rollback', 'Crash recovery']),
      rubric: 'Identifies Atomicity and explains why partial execution of the transfer constitutes an atomicity failure.',
    },

    // Unit 5 Questions
    {
      id: 'q-dbms-501',
      topic: 'top-dbms-5-1',
      unit: 'unt-dbms-5',
      sub: 'sub-dbms',
      text: 'Explain the Two-Phase Locking (2PL) protocol. How does it guarantee serializability, and does it prevent deadlocks?',
      type: '5_marks',
      diff: 'hard',
      options: null,
      answer: 'Two-Phase Locking (2PL) is a concurrency control protocol with two phases: 1) Growing Phase: A transaction may acquire locks (shared or exclusive) but cannot release any lock. 2) Shrinking Phase: A transaction may release locks but cannot obtain any new locks. The Lock Point is the instant when the transaction acquires its final lock. 2PL guarantees Conflict Serializability because the serialization order corresponds to the order of lock points. However, standard 2PL does NOT prevent deadlocks; circular lock waits can still occur and require deadlock detection (Wait-For Graph) or prevention protocols (Wait-Die, Wound-Wait).',
      concepts: JSON.stringify(['Two-Phase Locking', 'Growing phase', 'Shrinking phase', 'Lock point', 'Conflict serializability', 'Deadlock']),
      rubric: 'Must explain growing and shrinking phases, note that it guarantees serializability, and explicitly state that it does NOT prevent deadlocks.',
    },
    {
      id: 'q-dbms-502',
      topic: 'top-dbms-5-1',
      unit: 'unt-dbms-5',
      sub: 'sub-dbms',
      text: 'In Strict Two-Phase Locking (Strict 2PL), when are exclusive locks held by a transaction released?',
      type: 'mcq',
      diff: 'medium',
      options: JSON.stringify([
        'Immediately after the data item is modified',
        'At the start of the shrinking phase',
        'Only after the transaction commits or aborts',
        'When requested by another higher priority transaction'
      ]),
      answer: 'Only after the transaction commits or aborts',
      concepts: JSON.stringify(['Strict 2PL', 'Exclusive locks', 'Cascadeless recovery']),
      rubric: 'Option 3 is correct. Strict 2PL holds all exclusive locks until transaction commit/abort to prevent cascading rollbacks.',
    },

    // Unit 6 Questions
    {
      id: 'q-dbms-601',
      topic: 'top-dbms-6-1',
      unit: 'unt-dbms-6',
      sub: 'sub-dbms',
      text: 'Why are B+ Trees preferred over B-Trees for database indexing on disk storage?',
      type: 'viva',
      diff: 'hard',
      options: null,
      answer: 'B+ Trees are superior for database indexing because: 1) Separation of Keys and Data: In a B+ Tree, data pointers and records are stored exclusively in leaf nodes; internal nodes store only routing search keys. This allows internal nodes to have a much higher branching factor (fan-out), keeping tree height smaller and reducing costly disk I/O operations. 2) Sequential Access: All leaf nodes in a B+ Tree are linked together in a doubly linked list, making range queries (e.g. BETWEEN 10 AND 50) and full table scans fast and sequential. In a B-Tree, range queries require expensive tree traversals. 3) Predictable Performance: Every search in a B+ Tree traverses from root to leaf, providing consistent search latency O(log n).',
      concepts: JSON.stringify(['B+ Tree vs B-Tree', 'Leaf node linked list', 'Fan-out', 'Disk I/O', 'Range queries', 'Routing keys']),
      rubric: 'Must highlight higher fanout due to smaller internal node keys and sequential leaf node linking for range queries.',
    },
    {
      id: 'q-dbms-602',
      topic: 'top-dbms-6-1',
      unit: 'unt-dbms-6',
      sub: 'sub-dbms',
      text: 'Explain the CAP theorem in distributed databases. Why can a distributed database system only guarantee two of the three properties simultaneously?',
      type: '2_marks',
      diff: 'medium',
      options: null,
      answer: 'The CAP theorem states that a distributed data store can simultaneously provide at most two of three guarantees: Consistency (every read receives the most recent write or an error), Availability (every non-failing request receives a non-error response), and Partition Tolerance (system continues operating despite arbitrary dropped or delayed network messages). Because network partitions (P) are inevitable in real-world distributed networks, a system must choose between Consistency (CP) by refusing requests, or Availability (AP) by returning potentially stale data during a partition.',
      concepts: JSON.stringify(['CAP Theorem', 'Consistency', 'Availability', 'Partition Tolerance', 'Brewer conjecture']),
      rubric: 'Must state C, A, and P clearly and explain that network partitions force a trade-off between Consistency and Availability.',
    }
  ];

  for (const q of seedQuestions) {
    const opts = q.options ? `'${q.options.replace(/'/g, "''")}'` : 'NULL';
    const cleanText = q.text.replace(/'/g, "''");
    const cleanAns = q.answer.replace(/'/g, "''");
    const cleanRubric = q.rubric ? `'${q.rubric.replace(/'/g, "''")}'` : 'NULL';
    db.run(`
      INSERT INTO questions (id, topic_id, unit_id, subject_id, question_text, question_type, difficulty, options_json, ideal_answer, key_concepts_json, rubric_json)
      VALUES ('${q.id}', '${q.topic}', '${q.unit}', '${q.sub}', '${cleanText}', '${q.type}', '${q.diff}', ${opts}, '${cleanAns}', '${q.concepts.replace(/'/g, "''")}', ${cleanRubric});
    `);
  }

  // 10. Seed Initial Achievements
  const achievements = [
    { key: 'ach_first_exam', title: 'First Flight', desc: 'Completed your first smart AI examination', icon: 'Rocket' },
    { key: 'ach_streak_3', title: 'Consistent Scholar', desc: 'Maintained a 3-day study streak', icon: 'Flame' },
    { key: 'ach_dbms_master', title: 'DBMS Maestro', desc: 'Achieved 85%+ accuracy in Database Management Systems', icon: 'Database' },
    { key: 'ach_voice_ninja', title: 'Oral Viva Ace', desc: 'Answered 5 viva questions via microphone voice input', icon: 'Mic' },
    { key: 'ach_100_correct', title: 'Century Club', desc: 'Answered 100 questions correctly', icon: 'Award' },
    { key: 'ach_hard_crusher', title: 'Expert Analyst', desc: 'Scored full marks on an Expert level question', icon: 'Zap' },
  ];

  for (const a of achievements) {
    db.run(`
      INSERT INTO achievements (id, user_id, badge_key, title, description, icon, unlocked_at)
      VALUES ('ach-${a.key}', 'usr-demo-1', '${a.key}', '${a.title}', '${a.desc}', '${a.icon}', datetime('now'));
    `);
  }

  // 11. Seed sample performance & mistakes for Riddhi
  db.run(`
    INSERT INTO performance (id, user_id, subject_id, total_exams, questions_attempted, correct_answers, total_marks_earned, total_marks_possible, accuracy_pct, readiness_score, streak_days, last_study_date)
    VALUES ('perf-1', 'usr-demo-1', 'sub-dbms', 3, 18, 14, 62, 80, 77.5, 78.0, 5, date('now'));

    INSERT INTO mistakes (id, user_id, subject_id, unit_id, topic_id, question_text, student_answer, ideal_answer, feedback_summary, mistake_count, consecutive_correct, is_mastered, last_reviewed_at)
    VALUES (
      'mst-1',
      'usr-demo-1',
      'sub-dbms',
      'unt-dbms-3',
      'top-dbms-3-1',
      'Why is BCNF considered stronger than 3NF?',
      'Because BCNF is Boyce Codd form and has less redundancy than normal 3NF.',
      'BCNF strictly requires the determinant X to be a super key for all dependencies X->Y, removing 3NFs prime-attribute exemption.',
      'Missed the exact technical distinction regarding prime attributes in candidate keys.',
      2,
      1,
      0,
      datetime('now', '-1 day')
    );

    INSERT INTO study_plans (id, user_id, subject_id, plan_date, day_label, target_unit, target_topic, focus_areas, status)
    VALUES
    ('sp-1', 'usr-demo-1', 'sub-dbms', date('now'), 'Today', 'Unit 3: SQL & Database Normalization', 'BCNF vs 3NF & Overlapping Candidate Keys', 'Resolve prime attribute dependency gap', 'pending'),
    ('sp-2', 'usr-demo-1', 'sub-dbms', date('now', '+1 day'), 'Tomorrow', 'Unit 5: Concurrency Control', 'Two-Phase Locking & Conflict Serializability', 'Practice lock points and wait-for graphs', 'pending'),
    ('sp-3', 'usr-demo-1', 'sub-dbms', date('now', '+2 days'), 'Friday', 'Unit 6: Indexing & Storage', 'B+ Tree leaf linked lists & Fanout calculations', 'Review index access depth', 'pending');
  `);
}
