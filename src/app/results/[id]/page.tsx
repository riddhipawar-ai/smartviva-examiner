'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  BookOpen,
  BarChart3,
  Sparkles,
  Zap,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { Exam, ExamQuestion } from '@/types';

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exams?id=${examId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.exam) {
          setExam(data.exam);
          setQuestions(data.exam.questions || []);
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (e) {}
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Compiling Comprehensive Evaluation Report...</p>
      </div>
    );
  }

  if (!exam) {
    return <div className="text-center py-20 text-slate-500">Exam record not found.</div>;
  }

  const scoredTotal = exam.scored_marks || 0;
  const maxTotal = exam.total_marks || 1;
  const percentage = Math.round((scoredTotal / maxTotal) * 100);

  const correctCount = questions.filter((q) => (q.marks_obtained || 0) >= q.max_marks * 0.75).length;
  const partialCount = questions.filter((q) => (q.marks_obtained || 0) > 0 && (q.marks_obtained || 0) < q.max_marks * 0.75).length;
  const zeroCount = questions.filter((q) => (q.marks_obtained || 0) === 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Examination Completed
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {exam.subject_name} Performance Report
            </h1>
            <p className="text-xs text-slate-300">
              Exam Type: {exam.exam_type.toUpperCase()} &bull; Final Difficulty: {exam.adaptive_difficulty}
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
            <div className="text-right">
              <div className="text-3xl font-black text-amber-300">
                {scoredTotal} / {maxTotal}
              </div>
              <div className="text-[11px] font-bold uppercase text-slate-300">
                Total Strict Marks ({percentage}%)
              </div>
            </div>
          </div>
        </div>

        {/* Quick summary grid */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center">
            <div className="text-[10px] font-bold uppercase text-emerald-400">Mastered (Full/High)</div>
            <div className="text-xl font-black text-emerald-300">{correctCount} Qs</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-center">
            <div className="text-[10px] font-bold uppercase text-amber-400">Partial Credit</div>
            <div className="text-xl font-black text-amber-300">{partialCount} Qs</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-center">
            <div className="text-[10px] font-bold uppercase text-rose-400">0 Marks (Reviewed)</div>
            <div className="text-xl font-black text-rose-300">{zeroCount} Qs</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/create-exam"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reattempt Fresh Variation</span>
          </Link>
          <Link
            href="/mistakes"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Review Mistakes in Vault</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* DETAILED QUESTION-BY-QUESTION REVIEW */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Question-by-Question Semantic Analysis
        </h2>

        {questions.map((q, idx) => {
          const evalData = q.evaluation;
          const isCorrect = (q.marks_obtained || 0) >= q.max_marks * 0.75;
          const isZero = (q.marks_obtained || 0) === 0;

          return (
            <div
              key={q.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                    Q{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Source Revealed: Unit {q.unit_number || 'N/A'} &bull; Topic: {q.topic_title || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                        : isZero
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                    }`}
                  >
                    {q.marks_obtained} / {q.max_marks} Marks
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {q.question_text}
              </h4>

              {/* Student Answer */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold block text-slate-400 text-[10px] uppercase mb-1">
                  Your Answer:
                </span>
                {q.student_answer || 'No answer submitted'}
              </div>

              {/* Model Answer */}
              {evalData?.model_answer && (
                <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-semibold block text-indigo-600 dark:text-indigo-400 text-[10px] uppercase mb-1">
                    Ideal University Model Answer:
                  </span>
                  <p className="font-mono">{evalData.model_answer}</p>
                </div>
              )}

              {/* Professor Suggestions */}
              {evalData?.suggested_improvements && (
                <p className="text-xs text-slate-500 italic">
                  <span className="font-semibold not-italic">Professor Advice:</span> {evalData.suggested_improvements}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
