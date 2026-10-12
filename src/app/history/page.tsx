'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, RotateCcw, Eye, Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import { Exam } from '@/types';

export default function HistoryPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/exams')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.exams) {
          setExams(data.exams);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Exam Records...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          <History className="w-3.5 h-3.5" />
          <span>Full Academic Evaluation Archive</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Exam History & Attempt Vault
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Access past examination records, review student submissions and AI feedback, or reattempt fresh randomized variations to test improvement.
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            No Past Exams Recorded Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Take your first oral viva or descriptive exam to begin logging performance analytics.
          </p>
          <Link
            href="/create-exam"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Start Your First Exam
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((ex) => {
            const pct = ex.total_marks > 0 ? Math.round((ex.scored_marks / ex.total_marks) * 100) : 0;
            return (
              <div
                key={ex.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase">
                      {ex.exam_type} Mode
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ex.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {ex.subject_name || 'Academic Assessment'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {ex.total_questions} Questions &bull; Difficulty: <span className="capitalize">{ex.adaptive_difficulty}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {ex.scored_marks} / {ex.total_marks}
                    </div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {pct}% Score
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/results/${ex.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </Link>
                    <Link
                      href={`/create-exam?subjectId=${ex.subject_id}&mode=${ex.exam_type}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reattempt</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
