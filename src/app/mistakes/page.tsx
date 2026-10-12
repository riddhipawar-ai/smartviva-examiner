'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
} from 'lucide-react';
import { MistakeRecord } from '@/types';

export default function MistakesVaultPage() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'unmastered' | 'mastered'>('unmastered');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mistakes')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMistakes(data.mistakes);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredMistakes = mistakes.filter((m) => {
    if (filter === 'unmastered') return !m.is_mastered;
    if (filter === 'mastered') return m.is_mastered;
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Accessing Mistakes Revision Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-xs font-semibold text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Active Learning Through Mistakes</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Mistakes Vault & Concept Mastery Tracker
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Concepts stay in this vault until you achieve 3 consecutive correct answers in exams. Review where previous conceptual answers fell short and practice them again.
        </p>

        {/* Filters */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setFilter('unmastered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'unmastered'
                ? 'bg-rose-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            Needs Mastery ({mistakes.filter((m) => !m.is_mastered).length})
          </button>
          <button
            onClick={() => setFilter('mastered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'mastered'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            Mastered ({mistakes.filter((m) => m.is_mastered).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            All Mistakes ({mistakes.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredMistakes.map((m) => (
          <div
            key={m.id}
            className={`p-6 rounded-3xl border transition space-y-4 ${
              m.is_mastered
                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                    Unit {m.unit_number}: {m.topic_title}
                  </span>
                  <span className="text-xs text-slate-400">{m.subject_name}</span>
                </div>
              </div>

              {/* Mastery Progress Indicator (consecutive correct) */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500">
                  Mastery Streak:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        m.consecutive_correct >= step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                {m.is_mastered && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                    Mastered
                  </span>
                )}
              </div>
            </div>

            {/* Question */}
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {m.question_text}
            </h3>

            {/* Previous Student Answer vs Ideal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-rose-700 dark:text-rose-400 block text-[10px] uppercase mb-1">
                  Your Answer (Missed Concept):
                </span>
                {m.student_answer}
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300">
                <span className="font-bold text-indigo-700 dark:text-indigo-400 block text-[10px] uppercase mb-1">
                  Ideal Examination Model Answer:
                </span>
                <p className="font-mono">{m.ideal_answer}</p>
              </div>
            </div>

            {/* Professor Feedback */}
            <p className="text-xs text-slate-500 italic">
              <span className="font-bold not-italic">Feedback Note:</span> {m.feedback_summary}
            </p>

            <div className="pt-2 flex justify-end">
              <Link
                href={`/create-exam?subjectId=${m.subject_id}`}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Revision on this Unit</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
