import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query, run } from '@/lib/db';
import { StudyPlanItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = user ? user.id : 'usr-demo-1';

    // Fetch existing study plans
    let plans = await query<any>(
      `SELECT sp.*, s.name as subject_name
       FROM study_plans sp
       JOIN subjects s ON s.id = sp.subject_id
       WHERE sp.user_id = ?
       ORDER BY sp.plan_date ASC`,
      [userId]
    );

    // If no plans exist yet, automatically generate from weak topics!
    if (plans.length === 0) {
      const weakTopics = await query<any>(
        `SELECT m.*, s.name as subject_name, u.title as unit_title
         FROM mistakes m
         JOIN subjects s ON s.id = m.subject_id
         JOIN units u ON u.id = m.unit_id
         WHERE m.user_id = ? AND m.is_mastered = 0
         ORDER BY m.mistake_count DESC LIMIT 4`,
        [userId]
      );

      const days = ['Today', 'Tomorrow', 'Friday', 'Saturday'];
      for (let i = 0; i < Math.min(days.length, Math.max(1, weakTopics.length)); i++) {
        const wt = weakTopics[i] || {
          subject_id: 'sub-dbms',
          unit_title: 'Unit 3: Normalization',
          topic_title: 'BCNF & Functional Dependencies',
          feedback_summary: 'Target prime attribute and multi-valued dependencies',
        };

        const planId = `sp-${Date.now()}-${i}`;
        await run(
          `INSERT INTO study_plans (id, user_id, subject_id, plan_date, day_label, target_unit, target_topic, focus_areas, status)
           VALUES (?, ?, ?, date('now', '+${i} day'), ?, ?, ?, ?, 'pending')`,
          [
            planId,
            userId,
            wt.subject_id,
            days[i],
            wt.unit_title,
            wt.topic_title,
            wt.feedback_summary || 'Deep conceptual revision and viva practice',
          ]
        );
      }

      plans = await query<any>(
        `SELECT sp.*, s.name as subject_name
         FROM study_plans sp
         JOIN subjects s ON s.id = sp.subject_id
         WHERE sp.user_id = ?
         ORDER BY sp.plan_date ASC`,
        [userId]
      );
    }

    const formatted: StudyPlanItem[] = plans.map((p) => ({
      id: p.id,
      day_label: p.day_label,
      date_str: p.plan_date,
      subject_name: p.subject_name,
      unit_title: p.target_unit,
      topic_title: p.target_topic,
      focus_areas: p.focus_areas,
      estimated_minutes: 45,
      completed: p.status === 'completed',
    }));

    return NextResponse.json({ success: true, plans: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, planId, status } = body;

    if (action === 'toggle' && planId) {
      await run(`UPDATE study_plans SET status = ? WHERE id = ?`, [status || 'completed', planId]);
      return NextResponse.json({ success: true });
    }

    if (action === 'generate') {
      const user = await getCurrentUser(req);
      const userId = user ? user.id : 'usr-demo-1';
      // Clear old plans and recreate
      await run(`DELETE FROM study_plans WHERE user_id = ?`, [userId]);
      return NextResponse.json({ success: true, message: 'Study planner regenerated' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
