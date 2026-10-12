import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, run, get } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Platform statistics
    const userCount = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users');
    const examCount = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM exams');
    const questionCount = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM questions');
    const subjectCount = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM subjects');
    const patternCount = await query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM patterns');

    // Recent activity
    const recentExams = await query(
      `SELECT e.*, s.name as subject_name, u.name as user_name
       FROM exams e
       JOIN subjects s ON s.id = e.subject_id
       JOIN users u ON u.id = e.user_id
       ORDER BY e.created_at DESC LIMIT 10`
    );

    // All subjects and patterns
    const patterns = await query('SELECT * FROM patterns ORDER BY created_at DESC');
    const subjects = await query(
      `SELECT s.*, p.name as pattern_name, b.name as branch_name
       FROM subjects s
       JOIN years y ON y.id = s.year_id
       JOIN branches b ON b.id = y.branch_id
       JOIN patterns p ON p.id = b.pattern_id
       ORDER BY s.name ASC`
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCount[0]?.cnt || 0,
        totalExams: examCount[0]?.cnt || 0,
        totalQuestions: questionCount[0]?.cnt || 0,
        totalSubjects: subjectCount[0]?.cnt || 0,
        totalPatterns: patternCount[0]?.cnt || 0,
      },
      recentExams,
      patterns,
      subjects,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_pattern') {
      const { name, description } = body;
      const id = `pat-${Date.now()}`;
      await run(`INSERT INTO patterns (id, name, description, is_system) VALUES (?, ?, ?, 0)`, [
        id,
        name,
        description || '',
      ]);
      return NextResponse.json({ success: true, id });
    }

    if (action === 'create_question') {
      const { subjectId, unitId, topicId, questionText, questionType, difficulty, idealAnswer, keyConcepts, options } = body;
      const id = `q-adm-${Date.now()}`;
      await run(
        `INSERT INTO questions (id, topic_id, unit_id, subject_id, question_text, question_type, difficulty, options_json, ideal_answer, key_concepts_json, rubric_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Admin created exam rubric')`,
        [
          id,
          topicId || null,
          unitId,
          subjectId,
          questionText,
          questionType || '5_marks',
          difficulty || 'medium',
          options ? JSON.stringify(options) : null,
          idealAnswer,
          keyConcepts ? JSON.stringify(keyConcepts) : '[]',
        ]
      );
      return NextResponse.json({ success: true, id });
    }

    if (action === 'delete_subject') {
      const { subjectId } = body;
      await run(`DELETE FROM subjects WHERE id = ?`, [subjectId]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown admin action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
