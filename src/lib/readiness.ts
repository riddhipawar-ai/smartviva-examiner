import { query } from './db';

export interface ReadinessBreakdown {
  score: number; // 0 - 100
  accuracyComponent: number; // 0 - 35
  consistencyComponent: number; // 0 - 20
  recentPerformanceComponent: number; // 0 - 25
  masteredConceptsComponent: number; // 0 - 20
  weakTopicsPenalty: number; // penalty subtracted
  statusLabel: 'Critical Revision Needed' | 'Developing Competence' | 'Exam Ready' | 'University Rank Material';
  colorHex: string;
}

export async function calculateReadinessScore(userId: string, subjectId?: string): Promise<ReadinessBreakdown> {
  const subjectFilter = subjectId ? `AND eq.exam_id IN (SELECT id FROM exams WHERE subject_id = '${subjectId}')` : '';

  // 1. Overall Accuracy
  const stats = await query<{ total: number; correct: number; total_scored: number; total_max: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN marks_obtained >= (max_marks * 0.75) THEN 1 ELSE 0 END) as correct,
       SUM(marks_obtained) as total_scored,
       SUM(max_marks) as total_max
     FROM exam_questions eq
     WHERE eq.status = 'answered' ${subjectFilter}`
  );

  const totalAttempted = stats[0]?.total || 0;
  const totalScored = stats[0]?.total_scored || 0;
  const totalMax = stats[0]?.total_max || 1;

  const rawAccuracy = totalMax > 0 ? (totalScored / totalMax) * 100 : 50;
  const accuracyComponent = Math.min(35, Math.round((rawAccuracy / 100) * 35));

  // 2. Consistency: check streak and completed exams
  const userRow = await query<{ streak: number }>(`SELECT streak FROM users WHERE id = ?`, [userId]);
  const streak = userRow[0]?.streak || 1;
  const consistencyComponent = Math.min(20, Math.round(Math.min(streak, 10) * 2));

  // 3. Recent Performance: last 5 answered questions
  const recentRows = await query<{ marks_obtained: number; max_marks: number }>(
    `SELECT marks_obtained, max_marks FROM exam_questions eq
     JOIN exams e ON e.id = eq.exam_id
     WHERE e.user_id = ? AND eq.status = 'answered' ${subjectFilter}
     ORDER BY eq.evaluated_at DESC LIMIT 5`,
    [userId]
  );

  let recentScored = 0;
  let recentMax = 0;
  for (const r of recentRows) {
    recentScored += r.marks_obtained;
    recentMax += r.max_marks;
  }
  const recentRate = recentMax > 0 ? recentScored / recentMax : 0.6;
  const recentPerformanceComponent = Math.min(25, Math.round(recentRate * 25));

  // 4. Mastered Concepts vs Active Mistakes
  const mistakeStats = await query<{ total_mistakes: number; mastered: number }>(
    `SELECT
       COUNT(*) as total_mistakes,
       SUM(CASE WHEN is_mastered = 1 THEN 1 ELSE 0 END) as mastered
     FROM mistakes WHERE user_id = ?`,
    [userId]
  );
  const masteredCount = mistakeStats[0]?.mastered || 0;
  const unmasteredCount = (mistakeStats[0]?.total_mistakes || 0) - masteredCount;

  const masteredConceptsComponent = Math.min(20, Math.round(masteredCount * 4 + 5));
  const weakTopicsPenalty = Math.min(15, unmasteredCount * 3);

  // Total Score calculation
  let finalScore = Math.max(0, Math.min(100,
    accuracyComponent + consistencyComponent + recentPerformanceComponent + masteredConceptsComponent - weakTopicsPenalty
  ));

  if (totalAttempted === 0) {
    finalScore = 65; // Baseline starting readiness score
  }

  let statusLabel: ReadinessBreakdown['statusLabel'] = 'Developing Competence';
  let colorHex = '#f59e0b';

  if (finalScore >= 85) {
    statusLabel = 'University Rank Material';
    colorHex = '#10b981';
  } else if (finalScore >= 70) {
    statusLabel = 'Exam Ready';
    colorHex = '#6366f1';
  } else if (finalScore >= 50) {
    statusLabel = 'Developing Competence';
    colorHex = '#f59e0b';
  } else {
    statusLabel = 'Critical Revision Needed';
    colorHex = '#ef4444';
  }

  return {
    score: finalScore,
    accuracyComponent,
    consistencyComponent,
    recentPerformanceComponent,
    masteredConceptsComponent,
    weakTopicsPenalty,
    statusLabel,
    colorHex,
  };
}

export async function getKnowledgeGapReport(userId: string) {
  // Weak topics (mistakes where is_mastered = 0)
  const weakTopics = await query<{
    topic_title: string;
    unit_number: number;
    mistake_count: number;
    consecutive_correct: number;
    subject_name: string;
  }>(
    `SELECT m.topic_title, m.unit_number, m.mistake_count, m.consecutive_correct, s.name as subject_name
     FROM mistakes m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.user_id = ? AND m.is_mastered = 0
     ORDER BY m.mistake_count DESC LIMIT 6`,
    [userId]
  );

  // Strong topics (mastered or high accuracy)
  const strongTopics = await query<{
    topic_title: string;
    unit_number: number;
    consecutive_correct: number;
    subject_name: string;
  }>(
    `SELECT m.topic_title, m.unit_number, m.consecutive_correct, s.name as subject_name
     FROM mistakes m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.user_id = ? AND m.is_mastered = 1
     ORDER BY m.consecutive_correct DESC LIMIT 6`,
    [userId]
  );

  return {
    weakTopics,
    strongTopics,
  };
}
