import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSmartFlowExam } from '@/lib/flow';
import { query, get } from '@/lib/db';
import { Exam, ExamQuestion } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1'; // fallback demo student if unauthenticated

    const body = await req.json();
    const { subjectId, examType = 'viva', totalQuestions = 6, difficulty = 'medium' } = body;

    if (!subjectId) {
      return NextResponse.json({ success: false, error: 'Subject ID is required' }, { status: 400 });
    }

    const { examId, questions } = await createSmartFlowExam({
      userId,
      subjectId,
      examType,
      totalQuestions: Number(totalQuestions) || 6,
      startingDifficulty: difficulty,
    });

    // Hidden Unit System: Mask unit number and topic title in question delivery
    const maskedQuestions = questions.map((q) => ({
      ...q,
      unit_number: undefined,
      topic_title: undefined,
    }));

    return NextResponse.json({
      success: true,
      examId,
      questions: maskedQuestions,
    });
  } catch (err: any) {
    console.error('Create exam error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1';

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('id');

    if (examId) {
      const exam = await get<Exam & { subject_name: string }>(
        `SELECT e.*, s.name as subject_name
         FROM exams e
         JOIN subjects s ON s.id = e.subject_id
         WHERE e.id = ?`,
        [examId]
      );

      if (!exam) {
        return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
      }

      // Fetch questions
      const questions = await query<any>(
        `SELECT eq.*, q.question_text, q.question_type, q.options_json, q.ideal_answer,
                u.unit_number, t.title as topic_title
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
         JOIN units u ON u.id = eq.unit_id
         LEFT JOIN topics t ON t.id = eq.topic_id
         WHERE eq.exam_id = ?
         ORDER BY eq.question_order ASC`,
        [examId]
      );

      // Process questions with Hidden Unit System logic
      const formattedQuestions: ExamQuestion[] = questions.map((q) => {
        const isAnswered = q.status === 'answered' || q.status === 'idontknow' || exam.status === 'completed';
        const evalJson = q.ai_evaluation_json ? JSON.parse(q.ai_evaluation_json) : undefined;
        const options = q.options_json ? JSON.parse(q.options_json) : undefined;

        return {
          id: q.id,
          exam_id: q.exam_id,
          question_id: q.question_id,
          question_order: q.question_order,
          unit_id: q.unit_id,
          topic_id: q.topic_id,
          // Only reveal unit number and topic title AFTER question evaluation or exam completion!
          unit_number: isAnswered ? q.unit_number : undefined,
          topic_title: isAnswered ? q.topic_title : undefined,
          question_text: q.question_text,
          question_type: q.question_type,
          presented_difficulty: q.presented_difficulty,
          options,
          student_answer: q.student_answer,
          marks_obtained: q.marks_obtained,
          max_marks: q.max_marks,
          status: q.status,
          evaluation: evalJson,
        };
      });

      return NextResponse.json({ success: true, exam: { ...exam, questions: formattedQuestions } });
    }

    // List all past exams for this user
    const exams = await query(
      `SELECT e.*, s.name as subject_name
       FROM exams e
       JOIN subjects s ON s.id = e.subject_id
       WHERE e.user_id = ?
       ORDER BY e.created_at DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, exams });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
