import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { get, query, run } from '@/lib/db';
import { calculateNextDifficulty, evaluateAnswer } from '@/lib/ai';
import { processGamificationReward } from '@/lib/gamification';
import { AIEvaluation, DifficultyLevel } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1';

    const body = await req.json();
    const { examId, examQuestionId, studentAnswer, isIdontknow = false, answerTimeSeconds = 0 } = body;

    if (!examId || !examQuestionId) {
      return NextResponse.json({ success: false, error: 'Exam ID and Question ID are required' }, { status: 400 });
    }

    // 1. Fetch Question and Exam data
    const questionRow = await get<any>(
      `SELECT eq.*, q.question_text, q.question_type, q.ideal_answer, q.key_concepts_json,
              u.unit_number, t.title as topic_title, e.subject_id, e.adaptive_difficulty
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       JOIN units u ON u.id = eq.unit_id
       LEFT JOIN topics t ON t.id = eq.topic_id
       JOIN exams e ON e.id = eq.exam_id
       WHERE eq.id = ? AND eq.exam_id = ?`,
      [examQuestionId, examId]
    );

    if (!questionRow) {
      return NextResponse.json({ success: false, error: 'Exam question not found' }, { status: 404 });
    }

    const keyConcepts = questionRow.key_concepts_json ? JSON.parse(questionRow.key_concepts_json) : [];

    // 2. Perform AI semantic evaluation
    const evaluation: AIEvaluation = await evaluateAnswer({
      questionText: questionRow.question_text,
      questionType: questionRow.question_type,
      maxMarks: questionRow.max_marks,
      idealAnswer: questionRow.ideal_answer,
      studentAnswer: isIdontknow ? "I Don't Know" : studentAnswer || '',
      keyConcepts,
      unitNumber: questionRow.unit_number,
      topicTitle: questionRow.topic_title,
    });

    // Hidden Unit System: NOW REVEAL the unit and topic
    evaluation.source_unit_number = questionRow.unit_number;
    evaluation.source_topic_title = questionRow.topic_title;

    // 3. Update exam_question in DB
    const finalStatus = isIdontknow ? 'idontknow' : 'answered';
    await run(
      `UPDATE exam_questions
       SET student_answer = ?,
           marks_obtained = ?,
           ai_evaluation_json = ?,
           status = ?,
           evaluated_at = datetime('now')
       WHERE id = ?`,
      [
        isIdontknow ? "I Don't Know" : studentAnswer,
        evaluation.marks_obtained,
        JSON.stringify(evaluation),
        finalStatus,
        examQuestionId,
      ]
    );

    // 4. Save feedback record
    const feedbackId = `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await run(
      `INSERT INTO feedback (id, exam_question_id, concept_accuracy_pct, completeness_pct, technical_correctness_pct, relevance_pct, examples_used_score, strengths, missing_concepts, mistakes, suggested_improvements, model_answer, learning_mode_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedbackId,
        examQuestionId,
        evaluation.concept_accuracy_pct,
        evaluation.completeness_pct,
        evaluation.technical_correctness_pct,
        evaluation.relevance_pct,
        evaluation.examples_used_score,
        JSON.stringify(evaluation.strengths),
        JSON.stringify(evaluation.missing_concepts),
        JSON.stringify(evaluation.mistakes),
        evaluation.suggested_improvements,
        evaluation.model_answer,
        evaluation.learning_mode ? JSON.stringify(evaluation.learning_mode) : null,
      ]
    );

    // 5. Adaptive difficulty adjustment
    const scoredRatio = questionRow.max_marks > 0 ? evaluation.marks_obtained / questionRow.max_marks : 0;
    const currentDiff: DifficultyLevel = (questionRow.adaptive_difficulty as DifficultyLevel) || 'medium';
    const nextDiff = calculateNextDifficulty(currentDiff, scoredRatio);

    await run(`UPDATE exams SET adaptive_difficulty = ? WHERE id = ?`, [nextDiff, examId]);

    // 6. Learn from Mistakes & Mastery Tracking
    const isCorrect = scoredRatio >= 0.75;
    const existingMistake = await get<any>(
      `SELECT * FROM mistakes WHERE user_id = ? AND topic_id = ?`,
      [userId, questionRow.topic_id]
    );

    if (!isCorrect) {
      if (existingMistake) {
        await run(
          `UPDATE mistakes
           SET mistake_count = mistake_count + 1,
               consecutive_correct = 0,
               is_mastered = 0,
               student_answer = ?,
               feedback_summary = ?,
               last_reviewed_at = datetime('now')
           WHERE id = ?`,
          [studentAnswer || 'Non-attempt', evaluation.suggested_improvements, existingMistake.id]
        );
      } else {
        const mistakeId = `mst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await run(
          `INSERT INTO mistakes (id, user_id, subject_id, unit_id, topic_id, question_text, student_answer, ideal_answer, feedback_summary, mistake_count, consecutive_correct, is_mastered)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)`,
          [
            mistakeId,
            userId,
            questionRow.subject_id,
            questionRow.unit_id,
            questionRow.topic_id,
            questionRow.question_text,
            studentAnswer || 'Non-attempt',
            questionRow.ideal_answer,
            evaluation.suggested_improvements,
          ]
        );
      }
    } else {
      // Correct answer: increment consecutive correct
      if (existingMistake) {
        const newConsecutive = (existingMistake.consecutive_correct || 0) + 1;
        const isMastered = newConsecutive >= 3 ? 1 : 0; // Mastered after 3 consecutive correct!
        await run(
          `UPDATE mistakes
           SET consecutive_correct = ?, is_mastered = ?, last_reviewed_at = datetime('now')
           WHERE id = ?`,
          [newConsecutive, isMastered, existingMistake.id]
        );
      }
    }

    // 7. Gamification Reward: XP & Badges
    const xpEarned = 50 + (isCorrect ? 50 : 0);
    const reward = await processGamificationReward(userId, xpEarned);

    // 8. Check if Exam is finished
    const remaining = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM exam_questions WHERE exam_id = ? AND status = 'pending'`,
      [examId]
    );

    const isExamComplete = (remaining[0]?.cnt || 0) === 0;
    if (isExamComplete) {
      const sumResult = await query<{ total_scored: number }>(
        `SELECT SUM(marks_obtained) as total_scored FROM exam_questions WHERE exam_id = ?`,
        [examId]
      );
      const totalScored = sumResult[0]?.total_scored || 0;
      await run(
        `UPDATE exams SET scored_marks = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?`,
        [totalScored, examId]
      );
    }

    return NextResponse.json({
      success: true,
      evaluation,
      nextDifficulty: nextDiff,
      isExamComplete,
      gamification: reward,
      revealedSource: {
        unitNumber: questionRow.unit_number,
        topicTitle: questionRow.topic_title,
      },
    });
  } catch (err: any) {
    console.error('Evaluate API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
