import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const subjects = await query<{
      id: string;
      year_id: string;
      code: string;
      name: string;
      credits: number;
      description: string;
      branch_name: string;
      pattern_name: string;
    }>(
      `SELECT s.*, b.name as branch_name, p.name as pattern_name
       FROM subjects s
       JOIN years y ON y.id = s.year_id
       JOIN branches b ON b.id = y.branch_id
       JOIN patterns p ON p.id = b.pattern_id
       ORDER BY s.name ASC`
    );

    // Enrich each subject with units & topics
    const enriched = await Promise.all(
      subjects.map(async (sub) => {
        const units = await query<{ id: string; unit_number: number; title: string; description: string }>(
          `SELECT * FROM units WHERE subject_id = ? ORDER BY unit_number ASC`,
          [sub.id]
        );

        const unitsWithTopics = await Promise.all(
          units.map(async (u) => {
            const topics = await query(
              `SELECT * FROM topics WHERE unit_id = ? ORDER BY title ASC`,
              [u.id]
            );
            return { ...u, topics };
          })
        );

        const questionCount = await query<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM questions WHERE subject_id = ?`,
          [sub.id]
        );

        return {
          ...sub,
          units: unitsWithTopics,
          question_count: questionCount[0]?.cnt || 0,
        };
      })
    );

    return NextResponse.json({ success: true, subjects: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { yearId, code, name, credits, description, units } = body;

    if (!yearId || !name) {
      return NextResponse.json({ success: false, error: 'Year ID and subject name are required' }, { status: 400 });
    }

    const subjectId = `sub-${Date.now()}`;
    await run(
      `INSERT INTO subjects (id, year_id, code, name, credits, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subjectId, yearId, code || 'SUB-101', name, credits || 3, description || '']
    );

    // If initial units provided
    if (Array.isArray(units)) {
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const unitId = `unt-${subjectId}-${i + 1}`;
        await run(
          `INSERT INTO units (id, subject_id, unit_number, title, description)
           VALUES (?, ?, ?, ?, ?)`,
          [unitId, subjectId, i + 1, u.title || `Unit ${i + 1}`, u.description || '']
        );

        if (Array.isArray(u.topics)) {
          for (const t of u.topics) {
            const topicId = `top-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await run(
              `INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level)
               VALUES (?, ?, ?, ?, 'High', 50)`,
              [topicId, unitId, typeof t === 'string' ? t : t.title, typeof t === 'string' ? t : t.summary || '']
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, subjectId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
