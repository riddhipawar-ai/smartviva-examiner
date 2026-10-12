'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Zap,
  Flame,
  CheckCircle2,
  Lock,
  Trophy,
  Shield,
  Star,
  Sparkles,
} from 'lucide-react';
import { AchievementBadge, User } from '@/types';

export default function AchievementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const badges = [
    {
      key: 'ach_first_exam',
      title: 'First Flight',
      desc: 'Completed your very first AI examination session.',
      icon: 'Rocket',
      unlocked: true,
      category: 'Milestone',
    },
    {
      key: 'ach_streak_3',
      title: 'Consistent Scholar',
      desc: 'Maintained a 3-day daily study and viva practice streak.',
      icon: 'Flame',
      unlocked: true,
      category: 'Consistency',
    },
    {
      key: 'ach_dbms_master',
      title: 'DBMS Maestro',
      desc: 'Achieved 85%+ accuracy on Database Management Systems.',
      icon: 'Database',
      unlocked: true,
      category: 'Mastery',
    },
    {
      key: 'ach_voice_ninja',
      title: 'Oral Viva Ace',
      desc: 'Answered 5 viva questions via microphone voice input.',
      icon: 'Mic',
      unlocked: true,
      category: 'Skill',
    },
    {
      key: 'ach_50_correct',
      title: 'Half-Century Scholar',
      desc: 'Answered 50 questions with university-level accuracy.',
      icon: 'Medal',
      unlocked: false,
      category: 'Milestone',
    },
    {
      key: 'ach_100_correct',
      title: 'Century Club',
      desc: 'Answered 100 questions with flawless conceptual rigor.',
      icon: 'Trophy',
      unlocked: false,
      category: 'Milestone',
    },
    {
      key: 'ach_7_streak',
      title: '7-Day Unstoppable Streak',
      desc: 'Studied and tested every single day for a full week.',
      icon: 'Flame',
      unlocked: false,
      category: 'Consistency',
    },
    {
      key: 'ach_hard_crusher',
      title: 'Expert Level Crusher',
      desc: 'Scored full marks on an Expert tier scenario question.',
      icon: 'Zap',
      unlocked: false,
      category: 'Skill',
    },
  ];

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) setUser(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const xp = user?.xp || 750;
  const level = user?.level || 4;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const prevLevelXp = Math.pow(level - 1, 2) * 100;
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp || 1)) * 100))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
              <Award className="w-3.5 h-3.5" />
              <span>Academic Recognition & Gamification</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Badges, Level & Achievements
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Earn XP for strict conceptual accuracy, maintain study streaks, and unlock university badges.
            </p>
          </div>

          {/* Level Badge Card */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[140px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
              Current Rank
            </span>
            <div className="text-3xl font-black text-white">Level {level}</div>
            <span className="text-xs text-slate-300">{xp} Total XP</span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Progress to Level {level + 1}</span>
            <span>{progressPct}% ({nextLevelXp - xp} XP needed)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* STREAK HIGHLIGHT */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Flame className="w-7 h-7 fill-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Active Daily Study Streak: {user?.streak || 5} Days
            </h3>
            <p className="text-xs text-slate-500">
              Complete at least one practice question each day to maintain your momentum multiplier.
            </p>
          </div>
        </div>
      </div>

      {/* BADGES GRID */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-600" />
          Academic Achievement Badges
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b) => (
            <div
              key={b.key}
              className={`p-5 rounded-3xl border transition flex items-start space-x-4 ${
                b.unlocked
                  ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold ${
                  b.unlocked
                    ? 'bg-gradient-to-tr from-amber-400 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {b.unlocked ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {b.category}
                  </span>
                  {b.unlocked && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Unlocked
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {b.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
