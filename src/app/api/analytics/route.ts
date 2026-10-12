import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, get } from '@/lib/db';
import { calculateReadinessScore, getKnowledgeGapReport } from '@/lib/readiness';
import { PerformanceStats, User } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1';

    // 1. User info & readiness score
    const userRow = await get<User>(`SELECT * FROM users WHERE id = ?`, [userId]);
    const readiness = await calculateReadinessScore(userId);

    // 2. Aggregate exam question stats
    const totalExamsRow = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM exams WHERE user_id = ?`,
      [userId]
    );

    const questionsStats = await query<{
      attempted: number;
      scored: number;
      possible: number;
    }>(
      `SELECT
         COUNT(*) as attempted,
         SUM(eq.marks_obtained) as scored,
         SUM(eq.max_marks) as possible
       FROM exam_questions eq
       JOIN exams e ON e.id = eq.exam_id
       WHERE e.user_id = ? AND eq.status IN ('answered', 'idontknow')`,
      [userId]
    );

    const attempted = questionsStats[0]?.attempted || 0;
    const scored = questionsStats[0]?.scored || 0;
    const possible = questionsStats[0]?.possible || 1;
    const overallAccuracy = possible > 0 ? Math.round((scored / possible) * 100) : 0;

    // 3. Unit-wise performance
    const unitPerformance = await query<{ unit: string; accuracy: number; total: number }>(
      `SELECT
         ('Unit ' || u.unit_number) as unit,
         COUNT(*) as total,
         ROUND((SUM(eq.marks_obtained) / MAX(1, SUM(eq.max_marks))) * 100) as accuracy
       FROM exam_questions eq
       JOIN units u ON u.id = eq.unit_id
       JOIN exams e ON e.id = eq.exam_id
       WHERE e.user_id = ? AND eq.status IN ('answered', 'idontknow')
       GROUP BY u.unit_number
       ORDER BY u.unit_number ASC`,
      [userId]
    );

    // 4. Difficulty-wise performance
    const diffPerformance = await query<{ difficulty: string; accuracy: number; total: number }>(
      `SELECT
         eq.presented_difficulty as difficulty,
         COUNT(*) as total,
         ROUND((SUM(eq.marks_obtained) / MAX(1, SUM(eq.max_marks))) * 100) as accuracy
       FROM exam_questions eq
       JOIN exams e ON e.id = eq.exam_id
       WHERE e.user_id = ? AND eq.status IN ('answered', 'idontknow')
       GROUP BY eq.presented_difficulty`,
      [userId]
    );

    // 5. Weak & Strong topics
    const gapReport = await getKnowledgeGapReport(userId);

    // 6. Daily progress
    const dailyProgress = await query<{ date: string; marks: number; accuracy: number; questions: number }>(
      `SELECT
         date(eq.evaluated_at) as date,
         SUM(eq.marks_obtained) as marks,
         COUNT(*) as questions,
         ROUND((SUM(eq.marks_obtained) / MAX(1, SUM(eq.max_marks))) * 100) as accuracy
       FROM exam_questions eq
       JOIN exams e ON e.id = eq.exam_id
       WHERE e.user_id = ? AND eq.evaluated_at IS NOT NULL
       GROUP BY date(eq.evaluated_at)
       ORDER BY date(eq.evaluated_at) DESC LIMIT 7`,
      [userId]
    );

    const stats: PerformanceStats = {
      total_exams: totalExamsRow[0]?.cnt || 0,
      questions_attempted: attempted,
      total_marks_earned: scored,
      total_marks_possible: possible,
      overall_accuracy: overallAccuracy,
      readiness_score: readiness.score,
      streak_days: userRow?.streak || 1,
      level: userRow?.level || 1,
      xp: userRow?.xp || 0,
      strong_topics: gapReport.strongTopics.map((t) => ({
        topic: t.topic_title,
        subject: t.subject_name,
        score: Math.min(100, 75 + t.consecutive_correct * 8),
      })),
      weak_topics: gapReport.weakTopics.map((t) => ({
        topic: t.topic_title,
        subject: t.subject_name,
        score: Math.max(15, 60 - t.mistake_count * 15),
      })),
      unit_performance: unitPerformance.length > 0 ? unitPerformance : [
        { unit: 'Unit 1', accuracy: 85, total: 4 },
        { unit: 'Unit 2', accuracy: 90, total: 4 },
        { unit: 'Unit 3', accuracy: 55, total: 6 },
        { unit: 'Unit 4', accuracy: 80, total: 4 },
        { unit: 'Unit 5', accuracy: 65, total: 4 },
        { unit: 'Unit 6', accuracy: 70, total: 2 },
      ],
      difficulty_performance: diffPerformance.length > 0 ? diffPerformance : [
        { difficulty: 'easy', accuracy: 92, total: 6 },
        { difficulty: 'medium', accuracy: 78, total: 8 },
        { difficulty: 'hard', accuracy: 60, total: 6 },
        { difficulty: 'application', accuracy: 55, total: 4 },
      ],
      daily_progress: dailyProgress.length > 0 ? dailyProgress.reverse() : [
        { date: 'Mon', marks: 15, accuracy: 75, questions: 3 },
        { date: 'Tue', marks: 22, accuracy: 80, questions: 4 },
        { date: 'Wed', marks: 18, accuracy: 70, questions: 3 },
        { date: 'Thu', marks: 25, accuracy: 85, questions: 5 },
        { date: 'Today', marks: 30, accuracy: 88, questions: 6 },
      ],
    };

    return NextResponse.json({
      success: true,
      stats,
      readiness,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
