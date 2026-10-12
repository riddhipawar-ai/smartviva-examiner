import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const patterns = await query('SELECT * FROM patterns ORDER BY is_system DESC, name ASC');

    // Build hierarchy for each pattern
    const enrichedPatterns = await Promise.all(
      patterns.map(async (pat) => {
        const branches = await query('SELECT * FROM branches WHERE pattern_id = ?', [pat.id]);

        const enrichedBranches = await Promise.all(
          branches.map(async (br) => {
            const years = await query('SELECT * FROM years WHERE branch_id = ?', [br.id]);

            const enrichedYears = await Promise.all(
              years.map(async (yr) => {
                const subjects = await query(
                  `SELECT s.*,
                     (SELECT COUNT(*) FROM units u WHERE u.subject_id = s.id) as unit_count,
                     (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) as question_count
                   FROM subjects s
                   WHERE s.year_id = ?`,
                  [yr.id]
                );
                return { ...yr, subjects };
              })
            );

            return { ...br, years: enrichedYears };
          })
        );

        return { ...pat, branches: enrichedBranches };
      })
    );

    return NextResponse.json({ success: true, patterns: enrichedPatterns });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    // Allow user or admin to create custom academic pattern
    const body = await req.json();
    const { name, description, branchName, yearName } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Pattern name is required' }, { status: 400 });
    }

    const patternId = `pat-custom-${Date.now()}`;
    await run(
      `INSERT INTO patterns (id, name, description, is_system) VALUES (?, ?, ?, 0)`,
      [patternId, name, description || 'Custom academic structure created by user.']
    );

    const branchId = `br-custom-${Date.now()}`;
    await run(
      `INSERT INTO branches (id, pattern_id, name, code) VALUES (?, ?, ?, 'CUSTOM')`,
      [branchId, patternId, branchName || 'General Engineering / Computing']
    );

    const yearId = `yr-custom-${Date.now()}`;
    await run(
      `INSERT INTO years (id, branch_id, name) VALUES (?, ?, ?)`,
      [yearId, branchId, yearName || 'Academic Year 1']
    );

    return NextResponse.json({
      success: true,
      pattern: { id: patternId, name, branchId, yearId },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
