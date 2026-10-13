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
    // ── New Subjects ──────────────────────────────────────────────────
    {
      id: 'sub-ai',
      year_id: 'yr-sppu-be',
      code: 'CS-401',
      name: 'Artificial Intelligence',
      credits: 4,
      desc: 'Search algorithms, knowledge representation, expert systems, natural language processing, planning, and intelligent agents.',
    },
    {
      id: 'sub-dl',
      year_id: 'yr-sppu-be',
      code: 'CS-402',
      name: 'Deep Learning',
      credits: 4,
      desc: 'Neural networks, backpropagation, CNNs, RNNs, LSTMs, transformers, GANs, autoencoders, and transfer learning.',
    },
    {
      id: 'sub-ml',
      year_id: 'yr-sppu-be',
      code: 'CS-403',
      name: 'Machine Learning',
      credits: 4,
      desc: 'Supervised, unsupervised, and reinforcement learning. Regression, classification, clustering, SVM, ensemble methods.',
    },
    {
      id: 'sub-se',
      year_id: 'yr-sppu-te',
      code: 'CS-302',
      name: 'Software Engineering',
      credits: 3,
      desc: 'SDLC models, agile methodologies, requirement engineering, design patterns, testing strategies, project management.',
    },
    {
      id: 'sub-wt',
      year_id: 'yr-sppu-te',
      code: 'CS-303',
      name: 'Web Technology',
      credits: 3,
      desc: 'HTML5, CSS3, JavaScript, React, Node.js, REST APIs, HTTP, web security, responsive design, and PWA.',
    },
    {
      id: 'sub-toc',
      year_id: 'yr-sppu-te',
      code: 'CS-304',
      name: 'Theory of Computation',
      credits: 3,
      desc: 'Finite automata, regular expressions, context-free grammars, pushdown automata, Turing machines, and decidability.',
    },
    {
      id: 'sub-cc',
      year_id: 'yr-sppu-be',
      code: 'CS-404',
      name: 'Cloud Computing',
      credits: 3,
      desc: 'Cloud service models (IaaS, PaaS, SaaS), virtualization, containerization, microservices, AWS, Azure, and GCP.',
    },
    {
      id: 'sub-is',
      year_id: 'yr-sppu-be',
      code: 'CS-405',
      name: 'Information Security',
      credits: 3,
      desc: 'Cryptography, symmetric & asymmetric encryption, digital signatures, PKI, network security, cyber attacks, and ethical hacking.',
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

  // 7b. Seed Units for Artificial Intelligence
  const aiUnits = [
    { id: 'unt-ai-1', sub: 'sub-ai', num: 1, title: 'Introduction to AI & Intelligent Agents', desc: 'History of AI, Turing test, PEAS framework, rational agents, types of environments (deterministic, stochastic, observable)' },
    { id: 'unt-ai-2', sub: 'sub-ai', num: 2, title: 'Search Algorithms & Problem Solving', desc: 'Uninformed search (BFS, DFS, UCS, IDDFS), informed search (A*, Greedy Best-First), heuristics and admissibility' },
    { id: 'unt-ai-3', sub: 'sub-ai', num: 3, title: 'Knowledge Representation & Reasoning', desc: 'Propositional logic, predicate logic, inference rules, resolution principle, forward and backward chaining, Bayesian reasoning' },
    { id: 'unt-ai-4', sub: 'sub-ai', num: 4, title: 'Expert Systems & Machine Learning Basics', desc: 'Rule-based systems, inference engine, knowledge base, decision trees, k-NN, naive Bayes classifier' },
    { id: 'unt-ai-5', sub: 'sub-ai', num: 5, title: 'Natural Language Processing', desc: 'Morphological, syntactic, semantic, and pragmatic analysis. Parsing, tokenization, POS tagging, NER, sentiment analysis' },
    { id: 'unt-ai-6', sub: 'sub-ai', num: 6, title: 'Planning, Games & Uncertain Reasoning', desc: 'State space planning, STRIPS, minimax algorithm, alpha-beta pruning, Monte Carlo methods, fuzzy logic' },
  ];
  for (const u of aiUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 7c. Seed Units for Deep Learning
  const dlUnits = [
    { id: 'unt-dl-1', sub: 'sub-dl', num: 1, title: 'Neural Networks & Perceptrons', desc: 'Biological neuron model, McCulloch-Pitts neuron, perceptron learning rule, multi-layer perceptrons, activation functions' },
    { id: 'unt-dl-2', sub: 'sub-dl', num: 2, title: 'Backpropagation & Optimization', desc: 'Gradient descent, chain rule, vanishing gradient problem, Adam, RMSProp, momentum optimizers, learning rate scheduling' },
    { id: 'unt-dl-3', sub: 'sub-dl', num: 3, title: 'Convolutional Neural Networks (CNNs)', desc: 'Convolutional layers, pooling, padding, stride, feature maps, AlexNet, VGG, ResNet, transfer learning' },
    { id: 'unt-dl-4', sub: 'sub-dl', num: 4, title: 'Recurrent Neural Networks & LSTMs', desc: 'RNN architecture, BPTT, vanishing gradient, LSTM gates (input, forget, output), GRU, sequence-to-sequence models' },
    { id: 'unt-dl-5', sub: 'sub-dl', num: 5, title: 'Attention Mechanisms & Transformers', desc: 'Self-attention, multi-head attention, positional encoding, encoder-decoder architecture, BERT, GPT, ViT' },
    { id: 'unt-dl-6', sub: 'sub-dl', num: 6, title: 'GANs, Autoencoders & Regularization', desc: 'Generative Adversarial Networks, discriminator vs generator, VAE, dropout, batch normalization, L1/L2 regularization, data augmentation' },
  ];
  for (const u of dlUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 7d. Seed Units for Machine Learning
  const mlUnits = [
    { id: 'unt-ml-1', sub: 'sub-ml', num: 1, title: 'Supervised Learning: Regression', desc: 'Linear regression, polynomial regression, gradient descent, cost function, Ridge/Lasso regularization, evaluation metrics' },
    { id: 'unt-ml-2', sub: 'sub-ml', num: 2, title: 'Supervised Learning: Classification', desc: 'Logistic regression, SVM, kernel trick, decision trees, random forests, evaluation: precision, recall, F1, ROC-AUC' },
    { id: 'unt-ml-3', sub: 'sub-ml', num: 3, title: 'Unsupervised Learning & Clustering', desc: 'K-Means, hierarchical clustering, DBSCAN, PCA dimensionality reduction, t-SNE, silhouette score' },
    { id: 'unt-ml-4', sub: 'sub-ml', num: 4, title: 'Ensemble Methods & Boosting', desc: 'Bagging, boosting, AdaBoost, Gradient Boosting, XGBoost, LightGBM, stacking and blending techniques' },
    { id: 'unt-ml-5', sub: 'sub-ml', num: 5, title: 'Reinforcement Learning', desc: 'MDP, reward function, Q-Learning, policy gradient, Deep Q-Networks (DQN), exploration vs exploitation' },
    { id: 'unt-ml-6', sub: 'sub-ml', num: 6, title: 'Model Selection & Deployment', desc: 'Cross-validation, hyperparameter tuning, grid search, bias-variance tradeoff, model pipeline, MLOps basics' },
  ];
  for (const u of mlUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 7e. Seed Units for Software Engineering
  const seUnits = [
    { id: 'unt-se-1', sub: 'sub-se', num: 1, title: 'SDLC Models & Agile', desc: 'Waterfall, spiral, incremental, RAD, Scrum, Kanban, XP, sprint planning, user stories' },
    { id: 'unt-se-2', sub: 'sub-se', num: 2, title: 'Requirement Engineering', desc: 'Functional vs non-functional requirements, SRS document, use case diagrams, requirement elicitation techniques' },
    { id: 'unt-se-3', sub: 'sub-se', num: 3, title: 'Software Design & Design Patterns', desc: 'Cohesion, coupling, modularity, SOLID principles, creational/structural/behavioral design patterns (GoF)' },
    { id: 'unt-se-4', sub: 'sub-se', num: 4, title: 'Software Testing', desc: 'Unit, integration, system, acceptance testing, black-box vs white-box, boundary value analysis, McCabe cyclomatic complexity' },
    { id: 'unt-se-5', sub: 'sub-se', num: 5, title: 'Project Management & Estimation', desc: 'Function point analysis, COCOMO model, Gantt charts, CPM, PERT, risk management, configuration management' },
    { id: 'unt-se-6', sub: 'sub-se', num: 6, title: 'Software Quality & Maintenance', desc: 'ISO 9001, CMMI levels, software metrics, code review, refactoring, preventive vs corrective maintenance' },
  ];
  for (const u of seUnits) {
    db.run(`INSERT INTO units (id, subject_id, unit_number, title, description) VALUES ('${u.id}', '${u.sub}', ${u.num}, '${u.title}', '${u.desc}');`);
  }

  // 7f. Seed Topics for AI
  const aiTopics = [
    { id: 'top-ai-1-1', unit: 'unt-ai-1', title: 'PEAS Framework & Rational Agents', summary: 'Performance measure, Environment, Actuators, Sensors. Agent types: simple reflex, model-based, goal-based, utility-based, learning agents.' },
    { id: 'top-ai-1-2', unit: 'unt-ai-1', title: 'Types of AI Environments', summary: 'Fully vs partially observable, deterministic vs stochastic, episodic vs sequential, static vs dynamic, discrete vs continuous.' },
    { id: 'top-ai-2-1', unit: 'unt-ai-2', title: 'Uninformed Search Strategies', summary: 'BFS (optimal, complete), DFS (incomplete), UCS (lowest cost), IDDFS (optimal+memory efficient). Time and space complexity comparisons.' },
    { id: 'top-ai-2-2', unit: 'unt-ai-2', title: 'A* Search & Heuristics', summary: 'A* uses f(n)=g(n)+h(n). Admissible heuristics never overestimate. Consistent (monotone) heuristics guarantee optimal path.' },
    { id: 'top-ai-3-1', unit: 'unt-ai-3', title: 'Propositional & Predicate Logic', summary: 'Propositional: AND, OR, NOT, IMPLIES. Predicate: quantifiers (∀, ∃), predicates, variables. Resolution principle for inference.' },
    { id: 'top-ai-4-1', unit: 'unt-ai-4', title: 'Expert Systems Architecture', summary: 'Knowledge base (facts + rules), inference engine (forward/backward chaining), explanation facility, knowledge acquisition module.' },
    { id: 'top-ai-5-1', unit: 'unt-ai-5', title: 'NLP Pipeline & Parsing', summary: 'Tokenization → POS tagging → NER → parsing → semantic analysis → pragmatics. CFG grammars, ambiguity resolution.' },
    { id: 'top-ai-6-1', unit: 'unt-ai-6', title: 'Minimax & Alpha-Beta Pruning', summary: 'Game trees for two-player zero-sum games. Minimax guarantees optimal play. Alpha-beta pruning eliminates branches without affecting result.' },
  ];
  for (const t of aiTopics) {
    db.run(`INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level) VALUES ('${t.id}', '${t.unit}', '${t.title}', '${t.summary}', 'High', 60);`);
  }

  // 7g. Seed Topics for Deep Learning
  const dlTopics = [
    { id: 'top-dl-1-1', unit: 'unt-dl-1', title: 'Activation Functions', summary: 'Sigmoid (vanishing gradient), tanh, ReLU (dying ReLU), Leaky ReLU, ELU, Softmax for multi-class output. Role in non-linearity.' },
    { id: 'top-dl-1-2', unit: 'unt-dl-1', title: 'Perceptron & Multi-Layer Networks', summary: 'Single perceptron for linear separability. MLP with hidden layers solves XOR. Universal approximation theorem.' },
    { id: 'top-dl-2-1', unit: 'unt-dl-2', title: 'Backpropagation Algorithm', summary: 'Forward pass computes output. Backward pass computes gradients via chain rule. Weight update: w = w - η∇L.' },
    { id: 'top-dl-2-2', unit: 'unt-dl-2', title: 'Optimization Algorithms', summary: 'SGD with momentum, Adam (adaptive moment estimation), RMSProp, learning rate schedules (step decay, cosine annealing).' },
    { id: 'top-dl-3-1', unit: 'unt-dl-3', title: 'CNN Architecture & Operations', summary: 'Convolution operation, filters/kernels, feature maps, stride, padding (same/valid), MaxPooling, GlobalAveragePooling.' },
    { id: 'top-dl-3-2', unit: 'unt-dl-3', title: 'Transfer Learning & Fine-Tuning', summary: 'Use pretrained weights (ImageNet). Freeze early layers, fine-tune later layers. VGG16, ResNet50, MobileNet applications.' },
    { id: 'top-dl-4-1', unit: 'unt-dl-4', title: 'LSTM & Gating Mechanisms', summary: 'Forget gate (what to remove), input gate (what to add), output gate (what to expose). Cell state carries long-term memory.' },
    { id: 'top-dl-5-1', unit: 'unt-dl-5', title: 'Transformer & Self-Attention', summary: 'Query, Key, Value matrices. Attention(Q,K,V) = softmax(QK^T/√d)V. Multi-head attention. Positional encoding for sequence order.' },
    { id: 'top-dl-6-1', unit: 'unt-dl-6', title: 'GAN Architecture & Training', summary: 'Generator creates fake samples; discriminator classifies real/fake. Min-max game: G minimizes, D maximizes. Mode collapse problem.' },
  ];
  for (const t of dlTopics) {
    db.run(`INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level) VALUES ('${t.id}', '${t.unit}', '${t.title}', '${t.summary}', 'High', 55);`);
  }

  // 7h. Seed Topics for Machine Learning
  const mlTopics = [
    { id: 'top-ml-1-1', unit: 'unt-ml-1', title: 'Linear Regression & Cost Function', summary: 'Hypothesis h(x)=θ₀+θ₁x. MSE cost function. Normal equation vs gradient descent. R² score for evaluation.' },
    { id: 'top-ml-2-1', unit: 'unt-ml-2', title: 'Support Vector Machines', summary: 'Maximum margin hyperplane, support vectors, kernel trick (RBF, polynomial), soft margin (C parameter), SVR for regression.' },
    { id: 'top-ml-2-2', unit: 'unt-ml-2', title: 'Decision Trees & Random Forests', summary: 'Information gain (entropy), Gini impurity, pruning. Random forest: bagging of trees, feature randomness, majority voting.' },
    { id: 'top-ml-3-1', unit: 'unt-ml-3', title: 'K-Means Clustering', summary: 'Initialize k centroids, assign points to nearest, recompute centroids, repeat until convergence. Elbow method for k selection.' },
    { id: 'top-ml-4-1', unit: 'unt-ml-4', title: 'Gradient Boosting & XGBoost', summary: 'Additive ensemble: each tree corrects previous errors. Gradient descent in function space. XGBoost adds regularization and pruning.' },
    { id: 'top-ml-5-1', unit: 'unt-ml-5', title: 'Q-Learning & Reinforcement Learning', summary: 'Q(s,a) estimates future rewards. Bellman equation: Q(s,a)=r+γ·max Q(s\',a\'). ε-greedy exploration strategy.' },
  ];
  for (const t of mlTopics) {
    db.run(`INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level) VALUES ('${t.id}', '${t.unit}', '${t.title}', '${t.summary}', 'High', 50);`);
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
    // Unit 1 Questions (SPPU Unit 1)
    {
      id: 'q-dbms-101',
      topic: 'top-dbms-1-1',
      unit: 'unt-dbms-1',
      sub: 'sub-dbms',
      text: 'What are the 3 levels of DBMS architecture? Name them and explain what each level does in simple words.',
      type: '5_marks',
      diff: 'easy',
      options: null,
      answer: 'The 3 levels are: 1) View / External Level: What the user sees on their screen. 2) Conceptual / Logical Level: What data is stored in tables and how tables connect. 3) Physical / Internal Level: How data is actually saved on the hard drive or SSD.',
      concepts: JSON.stringify(['3 levels', 'View level', 'Conceptual level', 'Physical level']),
      rubric: 'Give full or high marks if the student names the 3 levels (user view, table level, storage level) in their own words.',
    },
    {
      id: 'q-dbms-102',
      topic: 'top-dbms-1-2',
      unit: 'unt-dbms-1',
      sub: 'sub-dbms',
      text: 'What is a Weak Entity in a database? Give an everyday example.',
      type: 'viva',
      diff: 'easy',
      options: null,
      answer: 'A weak entity is an entity that cannot stand on its own and depends on another main table to exist. For example, a child dependent in a company database cannot exist without the employee parent record.',
      concepts: JSON.stringify(['Weak entity', 'Depends on main table', 'Example']),
      rubric: 'Award full marks if the student explains it depends on another table or gives any valid example.',
    },

    // Unit 2 Questions (SPPU Unit 2)
    {
      id: 'q-dbms-201',
      topic: 'top-dbms-2-1',
      unit: 'unt-dbms-2',
      sub: 'sub-dbms',
      text: 'What is the difference between a Primary Key and a Foreign Key? Explain with a simple student example.',
      type: '5_marks',
      diff: 'easy',
      options: null,
      answer: '1) Primary Key: Uniquely identifies a student (like Roll Number). It cannot be empty or duplicate. 2) Foreign Key: Connects one table to another (like Department ID in a Student table, linking to the Department table).',
      concepts: JSON.stringify(['Primary Key', 'Foreign Key', 'Unique ID', 'Links tables']),
      rubric: 'Give full marks if student says primary key is unique identifier and foreign key links two tables together.',
    },
    {
      id: 'q-dbms-202',
      topic: 'top-dbms-2-1',
      unit: 'unt-dbms-2',
      sub: 'sub-dbms',
      text: 'Which key is used to uniquely identify each row in a database table?',
      type: 'mcq',
      diff: 'easy',
      options: JSON.stringify(['Primary Key', 'Foreign Key', 'Alternate Key', 'Composite Key']),
      answer: 'Primary Key',
      concepts: JSON.stringify(['Primary Key', 'Unique row identifier']),
      rubric: 'Option 1 (Primary Key) is correct.',
    },

    // Unit 3 Questions (SPPU Unit 3)
    {
      id: 'q-dbms-301',
      topic: 'top-dbms-3-1',
      unit: 'unt-dbms-3',
      sub: 'sub-dbms',
      text: 'What is Normalization in simple words? State the main rule for 1NF, 2NF, and 3NF.',
      type: '5_marks',
      diff: 'medium',
      options: null,
      answer: 'Normalization means organizing database tables to remove duplicate data and prevent mistakes. The basic rules are: 1NF: Each cell must have only a single value (no lists). 2NF: All columns must depend on the whole primary key. 3NF: No column should depend on another non-key column.',
      concepts: JSON.stringify(['Normalization', '1NF single value', '2NF no partial dependency', '3NF no transitive dependency']),
      rubric: 'Award generous marks if the student understands single values (1NF) and removing dependencies (2NF and 3NF).',
    },
    {
      id: 'q-dbms-302',
      topic: 'top-dbms-3-1',
      unit: 'unt-dbms-3',
      sub: 'sub-dbms',
      text: 'Why do we use Normalization in databases? Give two simple reasons.',
      type: 'viva',
      diff: 'easy',
      options: null,
      answer: '1) To save disk space by avoiding duplicate data. 2) To keep data consistent and avoid errors when adding or deleting records.',
      concepts: JSON.stringify(['Avoid duplicate data', 'Prevent errors', 'Keep data consistent']),
      rubric: 'Award full marks for saying avoid duplicate data or prevent errors.',
    },

    // Unit 4 Questions (SPPU Unit 4)
    {
      id: 'q-dbms-401',
      topic: 'top-dbms-4-1',
      unit: 'unt-dbms-4',
      sub: 'sub-dbms',
      text: 'What does ACID stand for in database transactions? Explain each letter in one line.',
      type: '5_marks',
      diff: 'easy',
      options: null,
      answer: 'A - Atomicity: Either all steps happen or none happen (all or nothing). C - Consistency: Data remains correct before and after. I - Isolation: Transactions do not disturb each other. D - Durability: Once saved, data is never lost even if power goes off.',
      concepts: JSON.stringify(['Atomicity', 'Consistency', 'Isolation', 'Durability']),
      rubric: 'Give full marks if the student lists the four words and gives a simple one-line explanation of each.',
    },
    {
      id: 'q-dbms-402',
      topic: 'top-dbms-4-1',
      unit: 'unt-dbms-4',
      sub: 'sub-dbms',
      text: 'If money is deducted from your Google Pay but the shopkeeper does not receive it, and the money comes back to you, which ACID property did this?',
      type: 'scenario',
      diff: 'easy',
      options: null,
      answer: 'Atomicity. Because the full payment did not finish, the system cancelled the transaction and refunded the money (all or nothing rule).',
      concepts: JSON.stringify(['Atomicity', 'All or nothing', 'Refund']),
      rubric: 'Award full marks if the student identifies Atomicity or explains all-or-nothing rollback.',
    },

    // Unit 5 Questions (SPPU Unit 5)
    {
      id: 'q-dbms-501',
      topic: 'top-dbms-5-1',
      unit: 'unt-dbms-5',
      sub: 'sub-dbms',
      text: 'What is Two-Phase Locking (2PL)? What happens in the Growing phase and Shrinking phase?',
      type: '5_marks',
      diff: 'medium',
      options: null,
      answer: '2PL is a way to make sure two users do not edit the same data at the same time. Phase 1 (Growing): You can only take locks on data. Phase 2 (Shrinking): You can only release locks and cannot take new ones.',
      concepts: JSON.stringify(['Two-Phase Locking', 'Growing takes locks', 'Shrinking releases locks']),
      rubric: 'Award full marks if student says growing phase takes locks and shrinking phase releases locks.',
    },
    {
      id: 'q-dbms-502',
      topic: 'top-dbms-5-1',
      unit: 'unt-dbms-5',
      sub: 'sub-dbms',
      text: 'What is a Deadlock in simple words?',
      type: 'viva',
      diff: 'easy',
      options: null,
      answer: 'A deadlock happens when two transactions are stuck waiting for each other to finish, so neither can move forward. It is like two cars meeting on a narrow one-way road where neither backs up.',
      concepts: JSON.stringify(['Deadlock', 'Waiting for each other', 'Stuck']),
      rubric: 'Award full marks for explaining that two processes are stuck waiting for each other.',
    },

    // Unit 6 Questions (SPPU Unit 6)
    {
      id: 'q-dbms-601',
      topic: 'top-dbms-6-1',
      unit: 'unt-dbms-6',
      sub: 'sub-dbms',
      text: 'What is an Index in a database? Why is it like the index at the back of a book?',
      type: 'viva',
      diff: 'easy',
      options: null,
      answer: 'An index in a database helps find data quickly without reading every row from start to finish, just like a book index helps you find a topic page without reading the entire book.',
      concepts: JSON.stringify(['Index', 'Fast search', 'Book index comparison']),
      rubric: 'Award full marks if the student mentions faster searching or book index comparison.',
    },
    {
      id: 'q-dbms-602',
      topic: 'top-dbms-6-1',
      unit: 'unt-dbms-6',
      sub: 'sub-dbms',
      text: 'Give one simple difference between SQL and NoSQL databases.',
      type: '2_marks',
      diff: 'easy',
      options: null,
      answer: 'SQL stores data in fixed rows and columns like an Excel sheet (e.g. MySQL). NoSQL stores data in flexible documents or key-values (e.g. MongoDB).',
      concepts: JSON.stringify(['SQL rows and columns', 'NoSQL flexible documents']),
      rubric: 'Award full marks if student notes tables vs flexible documents.',
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
