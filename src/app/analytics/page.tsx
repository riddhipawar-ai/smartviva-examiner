'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PerformanceStats } from '@/types';
import ReadinessMeter from '@/components/dashboard/ReadinessMeter';
import { ReadinessBreakdown } from '@/lib/readiness';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [readiness, setReadiness] = useState<ReadinessBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setReadiness(data.readiness);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Generating Deep Academic Analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Longitudinal Performance Intelligence</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Performance Analytics & Gap Discovery
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Comprehensive multi-dimensional analysis across accuracy, difficulty bands, syllabus units, and temporal progress.
        </p>
      </div>

      {/* READINESS METER GAUGE */}
      {readiness && <ReadinessMeter readiness={readiness} />}

      {/* DIFFICULTY-WISE PERFORMANCE */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Difficulty-Wise Conceptual Performance
        </h3>
        <p className="text-xs text-slate-500">
          Tracks retention and reasoning accuracy across the adaptive difficulty spectrum.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {stats?.difficulty_performance.map((dp, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-center"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 capitalize">
                {dp.difficulty}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {dp.accuracy}%
              </div>
              <span className="text-[10px] text-slate-500 block">
                {dp.total} Questions Attempted
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* UNIT-WISE BREAKDOWN */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Unit-Wise Examination Mastery
        </h3>
        <div className="space-y-3">
          {stats?.unit_performance.map((up, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{up.unit}</span>
                <span>{up.accuracy}% ({up.total} questions)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    up.accuracy >= 75 ? 'bg-emerald-500' : up.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${up.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DAILY / WEEKLY PROGRESS TABLE */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          Recent Daily Progress Trend
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                <th className="pb-3">Session Date</th>
                <th className="pb-3">Questions Evaluated</th>
                <th className="pb-3">Marks Scored</th>
                <th className="pb-3">Conceptual Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats?.daily_progress.map((dp, i) => (
                <tr key={i} className="text-slate-700 dark:text-slate-300">
                  <td className="py-3 font-semibold">{dp.date}</td>
                  <td className="py-3">{dp.questions} Qs</td>
                  <td className="py-3 font-bold">{dp.marks} pts</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        dp.accuracy >= 75
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                      }`}
                    >
                      {dp.accuracy}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
