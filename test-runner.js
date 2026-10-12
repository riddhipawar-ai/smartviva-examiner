const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   SMARTVIVA EXAMINER - AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Test Database
  console.log('--- 1. Testing Database & Academic Patterns ---');
  const { getDb, query, get, run } = require('./src/lib/db');
  await getDb();

  const patterns = await query('SELECT * FROM patterns');
  assert(patterns.length >= 7, 'Database seeded with all 7 academic patterns (SPPU, Autonomous, Diploma, Engineering, MCA, MBA, Custom)');

  const subjects = await query('SELECT * FROM subjects');
  assert(subjects.length >= 4, 'Core subjects seeded (DBMS, DS, CN, OS)');

  const units = await query('SELECT * FROM units WHERE subject_id = "sub-dbms"');
  assert(units.length === 6, 'DBMS seeded with full 6 university syllabus units');

  const questions = await query('SELECT * FROM questions WHERE subject_id = "sub-dbms"');
  assert(questions.length >= 10, 'DBMS seeded with questions across Viva, MCQ, 2m, 5m, 10m');

  // 2. Test Auth & Guest Mode
  console.log('\n--- 2. Testing Authentication & Guest Mode ---');
  const { hashPassword, comparePassword, createGuestUser, generateToken, verifyToken } = require('./src/lib/auth');

  const hashed = await hashPassword('securePass123');
  const isMatch = await comparePassword('securePass123', hashed);
  assert(isMatch, 'Password hashing and verification functional');

  const guest = await createGuestUser();
  assert(guest.user.is_guest === true, 'Guest user generated with is_guest = true');
  assert(guest.token.length > 20, 'Guest JWT token successfully generated');
  const verified = verifyToken(guest.token);
  assert(verified.id === guest.user.id, 'JWT payload verified correctly');

  // 3. Test File Extractor & Educational Cleaner
  console.log('\n--- 3. Testing Educational Cleaner & Hierarchy Extractor ---');
  const { cleanEducationalText, extractHierarchyAndConcepts } = require('./src/lib/extractor');

  const sampleRawText = `
    College of Engineering & Technology
    Dr. Evelyn Sterling, HOD Computer Science
    Guided by: Prof. John Smith
    Certificate of Completion
    All rights reserved. Copyright (C) 2026.
    Table of Contents
    Unit 1: Relational Model Fundamentals
    Topic: Referential Integrity
    Definition: A foreign key must match a valid primary key or be null.
    Important exam point: Crucial for avoiding orphaned records.
    Unit 2: Database Normalization
    Topic: Third Normal Form
    Definition: In 2NF with no transitive functional dependencies.
    Bibliography: References to Date C.J.
    Page 14 of 95
  `;

  const cleaned = cleanEducationalText(sampleRawText);
  assert(!cleaned.includes('College of Engineering'), 'Boilerplate college name filtered out');
  assert(!cleaned.includes('Dr. Evelyn Sterling'), 'Faculty names filtered out');
  assert(!cleaned.includes('Copyright'), 'Copyright text removed');
  assert(cleaned.includes('Referential Integrity'), 'Core concept retained');

  const extractedHierarchy = extractHierarchyAndConcepts(cleaned);
  assert(extractedHierarchy.length >= 2, 'Hierarchy extracted into distinct units');
  assert(extractedHierarchy[0].topics[0].definitions.length > 0, 'Definitions categorized under topic');

  // 4. Test Smart Question Flow (2 questions per unit, unit switching, randomized order, hidden unit)
  console.log('\n--- 4. Testing Smart Question Flow Engine ---');
  const { createSmartFlowExam } = require('./src/lib/flow');

  const examResult = await createSmartFlowExam({
    userId: guest.user.id,
    subjectId: 'sub-dbms',
    examType: 'mixed',
    totalQuestions: 6,
    startingDifficulty: 'medium',
  });

  assert(examResult.examId.startsWith('ex-'), 'Exam initialized successfully');
  assert(examResult.questions.length === 6, 'Exactly 6 questions configured');

  // Check 2 questions per unit rule
  const q1 = examResult.questions[0];
  const q2 = examResult.questions[1];
  const q3 = examResult.questions[2];
  const q4 = examResult.questions[3];

  assert(q1.unit_id === q2.unit_id, 'Q1 and Q2 are from the same unit (2 questions per unit rule)');
  assert(q3.unit_id === q4.unit_id, 'Q3 and Q4 are from the same unit (2 questions per unit rule)');
  assert(q1.unit_id !== q3.unit_id, 'Switched to a different unit after Q2 (unit switching rule)');

  // 5. Test AI Semantic Evaluator & Strict Marking
  console.log('\n--- 5. Testing Strict AI Evaluation & Learning Mode ---');
  const { evaluateAnswer, isNonAttempt, calculateNextDifficulty } = require('./src/lib/ai');

  // Strict 0 for "I don't know"
  assert(isNonAttempt("I don't know"), 'Detected "I don\'t know"');
  assert(isNonAttempt("idk"), 'Detected "idk"');
  assert(isNonAttempt("asdfghjkl"), 'Detected gibberish');

  const zeroEval = await evaluateAnswer({
    questionText: 'Explain the 3-tier architecture of DBMS.',
    questionType: '5_marks',
    maxMarks: 5,
    idealAnswer: 'External, Conceptual, and Internal levels providing physical and logical data independence.',
    studentAnswer: "I don't know",
    unitNumber: 1,
    topicTitle: '3-tier architecture',
  });

  assert(zeroEval.marks_obtained === 0, 'Strict 0 marks awarded for "I don\'t know"');
  assert(zeroEval.learning_mode !== undefined, '6-step Learning mode generated for teaching after mistake');
  assert(zeroEval.learning_mode.step1_marks === 0, 'Learning Mode Step 1 records 0 marks');
  assert(zeroEval.learning_mode.step2_concept_explanation.length > 20, 'Learning Mode Step 2 explains concept');
  assert(zeroEval.learning_mode.step3_best_model_answer.length > 20, 'Learning Mode Step 3 provides best model answer');
  assert(zeroEval.learning_mode.step4_simple_example.length > 20, 'Learning Mode Step 4 provides real-world example');
  assert(zeroEval.learning_mode.step5_memory_trick.length > 10, 'Learning Mode Step 5 provides memory trick / mnemonic');
  assert(zeroEval.learning_mode.step6_easier_followup.question.length > 10, 'Learning Mode Step 6 asks easier follow-up question');

  // Accurate Answer evaluation
  const goodEval = await evaluateAnswer({
    questionText: 'Explain the 3-tier architecture of DBMS and how it achieves data independence.',
    questionType: '5_marks',
    maxMarks: 5,
    idealAnswer: 'The 3-tier architecture separates external, conceptual, and internal levels, achieving physical data independence and logical data independence.',
    studentAnswer: 'The 3-tier architecture consists of the external level, conceptual level, and internal physical level. It achieves physical data independence and logical data independence by decoupling schemas.',
    keyConcepts: ['external', 'conceptual', 'internal', 'data independence'],
    unitNumber: 1,
    topicTitle: '3-tier architecture',
  });

  assert(goodEval.marks_obtained >= 3.5, 'Accurate conceptual answer receives high / full marks');
  assert(goodEval.concept_accuracy_pct >= 70, 'Concept accuracy percentage is high');
  assert(goodEval.strengths.length > 0, 'Strengths enumerated');

  // Adaptive Difficulty step
  const diffUp = calculateNextDifficulty('medium', 1.0);
  assert(diffUp === 'hard', 'Difficulty increased from medium to hard after perfect score');
  const diffDown = calculateNextDifficulty('medium', 0.0);
  assert(diffDown === 'easy', 'Difficulty decreased from medium to easy after zero score');

  // 6. Test Exam Readiness Score
  console.log('\n--- 6. Testing Exam Readiness Score (0-100) ---');
  const { calculateReadinessScore } = require('./src/lib/readiness');
  const readiness = await calculateReadinessScore('usr-demo-1');
  assert(readiness.score >= 0 && readiness.score <= 100, 'Readiness score is between 0 and 100');
  assert(readiness.statusLabel.length > 0, 'Readiness status label defined');
  assert(readiness.colorHex.startsWith('#'), 'Readiness color hex code formatted');

  // 7. Test Gamification XP & Badges
  console.log('\n--- 7. Testing Gamification & Streaks ---');
  const { processGamificationReward } = require('./src/lib/gamification');
  const reward = await processGamificationReward('usr-demo-1', 100);
  assert(reward.newTotalXp > 750, 'XP incremented after correct answer');

  console.log('\n====================================================');
  console.log(`   ALL TESTS PASSED: ${passed}/${total} SUCCESS`);
  console.log('====================================================\n');
}

runTestSuite().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
