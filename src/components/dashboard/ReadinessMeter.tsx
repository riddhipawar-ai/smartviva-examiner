'use client';

import React from 'react';
import { ReadinessBreakdown } from '@/lib/readiness';
import { ShieldCheck, TrendingUp, AlertTriangle, Award, CheckCircle } from 'lucide-react';

interface ReadinessMeterProps {
  readiness: ReadinessBreakdown;
}

export default function ReadinessMeter({ readiness }: ReadinessMeterProps) {
  const score = readiness.score;
  const strokeDashoffset = 440 - (440 * score) / 100;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Exam Readiness Meter
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: `${readiness.colorHex}20`,
                color: readiness.colorHex,
              }}
            >
              {readiness.statusLabel}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Weighted composite score based on conceptual mastery, streak consistency & mistake frequency.
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Circular Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="14"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={readiness.colorHex}
                strokeWidth="14"
                strokeDasharray="440"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                {score}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Out of 100
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Factors */}
        <div className="md:col-span-7 space-y-3.5">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                Conceptual Accuracy Component
              </span>
              <span>{readiness.accuracyComponent} / 35</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${(readiness.accuracyComponent / 35) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                Recent Examination Performance
              </span>
              <span>{readiness.recentPerformanceComponent} / 25</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${(readiness.recentPerformanceComponent / 25) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                Streak & Study Consistency
              </span>
              <span>{readiness.consistencyComponent} / 20</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${(readiness.consistencyComponent / 20) * 100}%` }}
              />
            </div>
          </div>

          {readiness.weakTopicsPenalty > 0 && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Unresolved Mistakes Penalty
              </span>
              <span className="font-bold">-{readiness.weakTopicsPenalty} pts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
