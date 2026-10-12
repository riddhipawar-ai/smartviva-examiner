import { query, run } from './db';

export interface GamificationReward {
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
  levelUp: boolean;
  unlockedBadges: { key: string; title: string; description: string; icon: string }[];
}

export async function processGamificationReward(userId: string, gainedXp: number): Promise<GamificationReward> {
  const userRows = await query<{ xp: number; level: number; streak: number; last_active: string }>(
    `SELECT xp, level, streak, last_active FROM users WHERE id = ?`,
    [userId]
  );
  if (userRows.length === 0) {
    return {
      xpGained: gainedXp,
      newTotalXp: gainedXp,
      newLevel: 1,
      levelUp: false,
      unlockedBadges: [],
    };
  }

  const user = userRows[0];
  const oldXp = user.xp || 0;
  const oldLevel = user.level || 1;
  const newTotalXp = oldXp + gainedXp;
  const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1;
  const levelUp = newLevel > oldLevel;

  // Streak logic
  const today = new Date().toISOString().split('T')[0];
  let streak = user.streak || 1;
  if (user.last_active) {
    const lastDate = user.last_active.split('T')[0];
    const diffTime = Math.abs(new Date(today).getTime() - new Date(lastDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
  }

  // Update user XP, level, streak
  await run(
    `UPDATE users SET xp = ?, level = ?, streak = ?, last_active = datetime('now') WHERE id = ?`,
    [newTotalXp, newLevel, streak, userId]
  );

  // Check achievements to unlock
  const unlockedBadges: { key: string; title: string; description: string; icon: string }[] = [];

  // Check total correct answers
  const correctCountRow = await query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM exam_questions eq
     JOIN exams e ON e.id = eq.exam_id
     WHERE e.user_id = ? AND eq.marks_obtained >= (eq.max_marks * 0.75)`,
    [userId]
  );
  const correctCount = correctCountRow[0]?.cnt || 0;

  // Check existing unlocked
  const existingUnlocked = await query<{ badge_key: string }>(
    `SELECT badge_key FROM achievements WHERE user_id = ?`,
    [userId]
  );
  const unlockedSet = new Set(existingUnlocked.map((b) => b.badge_key));

  async function awardBadge(key: string, title: string, desc: string, icon: string) {
    if (!unlockedSet.has(key)) {
      await run(
        `INSERT INTO achievements (id, user_id, badge_key, title, description, icon)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`ach-${userId}-${key}`, userId, key, title, desc, icon]
      );
      unlockedBadges.push({ key, title, description: desc, icon });
    }
  }

  if (correctCount >= 50) {
    await awardBadge('ach_50_correct', 'Half-Century Scholar', 'Answered 50 questions with distinction marks', 'Medal');
  }
  if (correctCount >= 100) {
    await awardBadge('ach_100_correct', 'Century Club', 'Mastered 100 questions with university-level accuracy', 'Trophy');
  }
  if (streak >= 7) {
    await awardBadge('ach_7_streak', '7-Day Unstoppable Streak', 'Studied and tested every single day for a full week', 'Flame');
  }

  return {
    xpGained: gainedXp,
    newTotalXp,
    newLevel,
    levelUp,
    unlockedBadges,
  };
}
