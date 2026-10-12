'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Flame,
  Zap,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Mic,
  FileText,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import ReadinessMeter from '@/components/dashboard/ReadinessMeter';
import { PerformanceStats, StudyPlanItem, User } from '@/types';
import { ReadinessBreakdown } from '@/lib/readiness';

export default function DashboardPage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [readiness, setReadiness] = useState<ReadinessBreakdown | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlanItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [authRes, analyticsRes, planRes] = await Promise.all([
          fetch('/api/auth').then((r) => r.json()),
          fetch('/api/analytics').then((r) => r.json()),
          fetch('/api/study-plan').then((r) => r.json()),
        ]);

        if (authRes.success && authRes.user) {
          setUser(authRes.user);
        }
        if (analyticsRes.success) {
          setStats(analyticsRes.stats);
          setReadiness(analyticsRes.readiness);
        }
        if (planRes.success) {
          setStudyPlans(planRes.plans);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading AI Academic Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-indigo-200">
            <Sparkles className="w-3 h-3 text-indigo-300" />
            <span>AI Digital Professor Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Scholar'}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200">
            Track your conceptual weaknesses, review strict evaluations, and prepare for oral viva.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/create-exam"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 shadow-md transition"
          >
            <Mic className="w-4 h-4 text-indigo-600" />
            <span>Start AI Exam</span>
          </Link>
          <Link
            href="/upload"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
          >
            <FileText className="w-4 h-4" />
            <span>Upload Notes</span>
          </Link>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Exams */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Exams Taken</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats?.total_exams || 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.questions_attempted || 0} questions evaluated
          </div>
        </div>

        {/* Metric 2: Conceptual Accuracy */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Accuracy Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats?.overall_accuracy || 0}%
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.total_marks_earned || 0} / {stats?.total_marks_possible || 0} strict marks
          </div>
        </div>

        {/* Metric 3: Daily Streak */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-500">
            {stats?.streak_days || 1} Days
          </div>
          <div className="text-[11px] text-slate-500">
            Active revision habit
          </div>
        </div>

        {/* Metric 4: Academic Level & XP */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Level & XP</span>
            <Zap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
            Lvl {stats?.level || 1}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.xp || 0} total XP earned
          </div>
        </div>
      </div>

      {/* READINESS METER SECTION */}
      {readiness && <ReadinessMeter readiness={readiness} />}

      {/* TWO COLUMN GRID: WEAK/STRONG TOPICS + AI STUDY PLANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Knowledge Gap Detection */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Knowledge Gap Detection (Weak vs Strong Areas)
                </h3>
                <p className="text-xs text-slate-500">
                  Semantic tracking reveals specific concepts needing remediation before university evaluation.
                </p>
              </div>
              <Link
                href="/mistakes"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Mistakes Vault</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Weak Topics */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Priority Weak Concepts (Need Review)
              </h4>
              <div className="space-y-2">
                {stats?.weak_topics && stats.weak_topics.length > 0 ? (
                  stats.weak_topics.map((wt, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-rose-950 dark:text-rose-200">{wt.topic}</p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">{wt.subject}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold">
                        {wt.score}% mastery
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No critical weak topics flagged yet.</p>
                )}
              </div>
            </div>

            {/* Strong Topics */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Mastered Strong Concepts
              </h4>
              <div className="space-y-2">
                {stats?.strong_topics && stats.strong_topics.length > 0 ? (
                  stats.strong_topics.map((st, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-emerald-950 dark:text-emerald-200">{st.topic}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{st.subject}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        {st.score}% mastery
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Complete more practice exams to log mastered concepts.</p>
                )}
              </div>
            </div>
          </div>

          {/* Unit-Wise Performance Breakdown */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Unit-Wise Syllabus Accuracy
            </h3>
            <div className="space-y-3">
              {stats?.unit_performance.map((up, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{up.unit}</span>
                    <span>{up.accuracy}% ({up.total} questions)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        up.accuracy >= 75 ? 'bg-emerald-500' : up.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${up.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): AI Study Planner + Quick Viva Launcher */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Study Planner Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  AI Study Planner
                </h3>
                <p className="text-xs text-slate-500">
                  Targeted daily schedule auto-generated from your weak topics.
                </p>
              </div>
              <Link
                href="/study-planner"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Full Plan
              </Link>
            </div>

            <div className="space-y-3">
              {studyPlans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {plan.day_label}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {plan.estimated_minutes} mins
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {plan.subject_name}: {plan.unit_title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {plan.topic_title} - {plan.focus_areas}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/create-exam"
              className="w-full py-3 rounded-2xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center space-x-2 transition"
            >
              <span>Practice Today's Targets</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Voice Viva Challenge */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 p-6 text-white space-y-4 shadow-xl border border-purple-800/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Voice Viva Challenge
              </span>
            </div>
            <h4 className="text-lg font-extrabold">
              Simulate Oral University Viva
            </h4>
            <p className="text-xs text-purple-200 leading-relaxed">
              Experience the pressure of real viva questions. Speak your answer into the microphone and receive immediate conceptual breakdown without any grace marks.
            </p>
            <Link
              href="/create-exam?mode=viva"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-500 hover:bg-purple-600 text-white shadow-md shadow-purple-500/30 transition"
            >
              <span>Launch Viva Mode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
