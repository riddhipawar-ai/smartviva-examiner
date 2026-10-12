import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, run } from '@/lib/db';
import { MistakeRecord } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1';

    const mistakes = await query<any>(
      `SELECT m.*, s.name as subject_name
       FROM mistakes m
       JOIN subjects s ON s.id = m.subject_id
       WHERE m.user_id = ?
       ORDER BY m.is_mastered ASC, m.mistake_count DESC`,
      [userId]
    );

    const formatted: MistakeRecord[] = mistakes.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      subject_id: m.subject_id,
      subject_name: m.subject_name,
      unit_number: m.unit_number || 1,
      topic_title: m.topic_title || 'Core Topic',
      question_text: m.question_text,
      student_answer: m.student_answer || '',
      ideal_answer: m.ideal_answer,
      feedback_summary: m.feedback_summary || '',
      mistake_count: m.mistake_count || 1,
      consecutive_correct: m.consecutive_correct || 0,
      is_mastered: Boolean(m.is_mastered),
      last_reviewed_at: m.last_reviewed_at,
    }));

    return NextResponse.json({ success: true, mistakes: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
