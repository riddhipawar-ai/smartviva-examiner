'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mic,
  FileCheck2,
  ListFilter,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  BrainCircuit,
  Zap,
} from 'lucide-react';
import { DifficultyLevel, ExamType, Subject } from '@/types';

function CreateExamForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subjectId') || 'sub-dbms';
  const initialMode = (searchParams.get('mode') as ExamType) || 'viva';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubject);
  const [examType, setExamType] = useState<ExamType>(initialMode);
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [startingDifficulty, setStartingDifficulty] = useState<DifficultyLevel>('medium');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.subjects.length > 0) {
          setSubjects(data.subjects);
          if (!searchParams.get('subjectId')) {
            setSelectedSubjectId(data.subjects[0].id);
          }
        }
      })
      .catch(console.error);
  }, [searchParams]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          examType,
          totalQuestions: questionCount,
          difficulty: startingDifficulty,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to initialize exam');
      } else {
        router.push(`/exam/${data.examId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error launching examination');
    } finally {
      setCreating(false);
    }
  };

  const examModes = [
    {
      type: 'viva' as ExamType,
      title: 'Voice Viva Mode',
      desc: 'Oral examiner tests concepts via microphone speech-to-text with AI vocal feedback.',
      icon: Mic,
      color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600',
    },
    {
      type: 'mcq' as ExamType,
      title: 'MCQ Mode',
      desc: 'Rigorous 4-option conceptual challenges without trivial elimination clues.',
      icon: ListFilter,
      color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600',
    },
    {
      type: 'descriptive' as ExamType,
      title: 'Descriptive Mode',
      desc: '2 Marks, 5 Marks & 10 Marks university-style descriptive long responses.',
      icon: FileCheck2,
      color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600',
    },
    {
      type: 'mixed' as ExamType,
      title: 'Mixed Mode',
      desc: 'Comprehensive combination of viva, MCQs, scenarios, and analytical questions.',
      icon: Sparkles,
      color: 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Smart Question Flow & Adaptive Difficulty</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Configure Your AI Practice Examination
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Questions are structured according to the smart 2-per-unit flow rule. The unit and topic remain hidden during the exam and are revealed only after AI semantic grading.
        </p>
      </div>

      <form onSubmit={handleStartExam} className="space-y-6">
        {/* Step 1: Select Subject */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Step 1: Choose Academic Subject
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                  selectedSubjectId === sub.id
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    {sub.code}
                  </span>
                  {selectedSubjectId === sub.id && (
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {sub.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {sub.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Select Exam Mode */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Step 2: Select Digital Examiner Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {examModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = examType === mode.type;
              return (
                <div
                  key={mode.type}
                  onClick={() => setExamType(mode.type)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition space-y-2 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-xl border ${mode.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {mode.title}
                      </h4>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {mode.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Question Count & Smart Flow Rule Notice */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Step 3: Total Questions (2 Questions Per Unit Rule)
              </label>
              <p className="text-xs text-slate-500">
                Units will automatically switch after every 2 questions in randomized order.
              </p>
            </div>
            <div className="flex gap-2">
              {[4, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`w-12 h-10 rounded-xl font-bold text-xs transition ${
                    questionCount === num
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {num} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Visual Smart Flow Rule preview */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-950/40 border border-indigo-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span>Smart Question Flow Active Pattern:</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Exam will present: Q1 & Q2 from randomized Unit A &rarr; Q3 & Q4 from Unit B &rarr; Q5 & Q6 from Unit C.
              Topic and unit names are completely hidden during answering to test independent concept recall!
            </p>
          </div>
        </div>

        {/* Step 4: Starting Difficulty */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Step 4: Starting Difficulty (Will Adapt Automatically)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['easy', 'medium', 'hard', 'application', 'expert'] as DifficultyLevel[]).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setStartingDifficulty(diff)}
                className={`py-2 rounded-xl text-xs font-bold capitalize transition ${
                  startingDifficulty === diff
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Adaptive Difficulty: Correct answers scale difficulty up; incorrect answers scale down.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={creating}
          className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl shadow-indigo-600/25 disabled:opacity-50 transition flex items-center justify-center space-x-2"
        >
          {creating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating Fresh Questions & Randomizing Units...</span>
            </>
          ) : (
            <>
              <span>Launch Smart Examination Arena</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function CreateExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreateExamForm />
    </Suspense>
  );
}
