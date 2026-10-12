'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Mic,
  FileCheck2,
  ListFilter,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  BrainCircuit,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import VoiceRecorder from '@/components/exam/VoiceRecorder';
import LearningModeDrawer from '@/components/exam/LearningModeDrawer';
import { AIEvaluation, DifficultyLevel, Exam, ExamQuestion } from '@/types';

export default function ExamArenaPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AIEvaluation | null>(null);
  const [showLearningDrawer, setShowLearningDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealedSource, setRevealedSource] = useState<{ unitNumber?: number; topicTitle?: string } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/exams?id=${examId}`);
        const data = await res.json();
        if (data.success && data.exam) {
          setExam(data.exam);
          const qList: ExamQuestion[] = data.exam.questions || [];
          setQuestions(qList);

          // Find first pending question
          const firstPending = qList.findIndex((q) => q.status === 'pending');
          if (firstPending !== -1) {
            setCurrentIndex(firstPending);
          } else {
            // All answered: redirect to results
            router.push(`/results/${examId}`);
          }
        }
      } catch (err) {
        console.error('Failed to load exam:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [examId, router]);

  // Exam timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQ = questions[currentIndex];

  const handleSubmitAnswer = async (isIdontknow = false) => {
    if (!currentQ || isSubmitting) return;

    let finalAnswer = isIdontknow ? "I Don't Know" : currentQ.question_type === 'mcq' ? selectedOption : studentAnswer;

    if (!isIdontknow && !finalAnswer.trim()) {
      alert('Please provide your answer or click "I Don\'t Know" if you are unsure.');
      return;
    }

    setIsSubmitting(true);
    setCurrentEvaluation(null);
    setRevealedSource(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          examQuestionId: currentQ.id,
          studentAnswer: finalAnswer,
          isIdontknow,
          answerTimeSeconds: elapsedSeconds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentEvaluation(data.evaluation);
        setRevealedSource(data.revealedSource);

        // Update local question state
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex] = {
          ...currentQ,
          status: isIdontknow ? 'idontknow' : 'answered',
          student_answer: finalAnswer,
          marks_obtained: data.evaluation.marks_obtained,
          unit_number: data.revealedSource.unitNumber,
          topic_title: data.revealedSource.topicTitle,
          evaluation: data.evaluation,
        };
        setQuestions(updatedQuestions);

        // If score is 0 or low, trigger learning mode drawer
        if (data.evaluation.marks_obtained < currentQ.max_marks * 0.5 || isIdontknow) {
          setShowLearningDrawer(true);
        }

        // If full marks, trigger subtle confetti
        if (data.evaluation.marks_obtained === currentQ.max_marks) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 },
            });
          } catch (e) {}
        }
      } else {
        alert(data.error || 'Evaluation error');
      }
    } catch (err: any) {
      alert(err.message || 'Network error during evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setCurrentEvaluation(null);
    setRevealedSource(null);
    setStudentAnswer('');
    setSelectedOption('');

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Completed all questions!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
      router.push(`/results/${examId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Initializing Smart Question Arena...</p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="text-center py-20 space-y-4">
        <h3 className="text-xl font-bold">Examination Completed</h3>
        <button
          onClick={() => router.push(`/results/${examId}`)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm"
        >
          View Full Analysis & Results
        </button>
      </div>
    );
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isEvaluated = Boolean(currentEvaluation);
  const unitPairNumber = Math.floor(currentIndex / 2) + 1;
  const questionInUnitNumber = (currentIndex % 2) + 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Examination Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/20">
            Q{currentIndex + 1}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              {/* Smart Flow Indicator */}
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Unit Cycle #{unitPairNumber} (Q{questionInUnitNumber}/2)
              </span>
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {exam?.subject_name} &bull; {currentQ.max_marks} Marks Max
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold">
          {/* Adaptive Difficulty Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="capitalize">{exam?.adaptive_difficulty || 'Medium'} Difficulty</span>
          </div>

          {/* Timer */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* QUESTION CARD (Hidden Unit System) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Hidden Unit System indicator */}
        <div className="flex items-center justify-between text-xs">
          {!isEvaluated ? (
            <div className="flex items-center space-x-2 text-slate-400 italic">
              <EyeOff className="w-4 h-4 text-slate-400" />
              <span>Hidden Unit System Active: Unit & Topic masked during question answering</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold animate-fadeIn">
              <Eye className="w-4 h-4" />
              <span>
                Source Revealed: Unit {revealedSource?.unitNumber} &bull; Topic: {revealedSource?.topicTitle}
              </span>
            </div>
          )}

          <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
            {currentQ.question_type.replace('_', ' ')}
          </span>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {currentQ.question_text}
          </h3>
          <p className="text-xs text-slate-500">
            Strict Marking: Full marks for concept understanding, proportional partial marks, and strict 0 marks for random text, gibberish or off-topic.
          </p>
        </div>

        {/* INPUT MODE: Viva vs MCQ vs Descriptive */}
        {!isEvaluated ? (
          <div className="space-y-4 pt-2">
            {/* 1. Viva Mode with Voice Microphone */}
            {currentQ.question_type === 'viva' ? (
              <VoiceRecorder
                questionText={currentQ.question_text}
                onTranscriptChange={(text) => setStudentAnswer(text)}
                disabled={isSubmitting}
              />
            ) : currentQ.question_type === 'mcq' && currentQ.options ? (
              /* 2. MCQ Mode */
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Select Conceptual Option:
                </label>
                {currentQ.options.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isSubmitting && setSelectedOption(option)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-center space-x-3 ${
                      selectedOption === option
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                        selectedOption === option
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {option}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* 3. Descriptive Mode */
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Enter Technical Explanation:</span>
                  <span>{studentAnswer.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <textarea
                  rows={6}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Provide precise conceptual definitions, algorithmic flow, or real-world system applications..."
                  className="w-full text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>
            )}

            {/* Action Buttons: Submit vs I Don't Know */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSubmitAnswer(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center justify-center space-x-1.5"
              >
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>I Don't Know (Trigger Tutoring Mode)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmitAnswer(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating Conceptual Understanding...</span>
                  </>
                ) : (
                  <>
                    <span>Submit for AI Evaluation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* EVALUATION REVEAL CARD */
          <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Score header */}
            <div
              className={`p-6 rounded-3xl border ${
                currentEvaluation.marks_obtained === currentQ.max_marks
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  : currentEvaluation.marks_obtained > 0
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              } space-y-4`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Strict Semantic Evaluation Result
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {currentEvaluation.marks_obtained} / {currentQ.max_marks} Marks
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white dark:bg-slate-900">
                      {currentEvaluation.marks_obtained === currentQ.max_marks
                        ? 'Full Marks'
                        : currentEvaluation.marks_obtained > 0
                        ? 'Partially Correct'
                        : '0 Marks (Strict Policy)'}
                    </span>
                  </div>
                </div>

                {/* Source Reveal Pill */}
                <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Question Origin:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    Unit {revealedSource?.unitNumber}: {revealedSource?.topicTitle}
                  </span>
                </div>
              </div>

              {/* Semantic Breakdown Radar Scores */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Concept Accuracy</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {currentEvaluation.concept_accuracy_pct}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Completeness</div>
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {currentEvaluation.completeness_pct}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Technical Rigor</div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {currentEvaluation.technical_correctness_pct}%
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Missing Concepts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Demonstrated Strengths
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {currentEvaluation.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  Missing Concepts & Errors
                </h4>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                  {currentEvaluation.missing_concepts.concat(currentEvaluation.mistakes).map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* University Model Answer */}
            <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-slate-950 border border-indigo-100 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                University Model Answer
              </h4>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                {currentEvaluation.model_answer}
              </p>
            </div>

            {/* Professor Improvement Recommendation */}
            <div className="text-xs text-slate-600 dark:text-slate-400 italic">
              <span className="font-bold not-italic">Professor Note:</span> {currentEvaluation.suggested_improvements}
            </div>

            {/* Next Question / Learning Mode Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {currentEvaluation.learning_mode && (
                <button
                  type="button"
                  onClick={() => setShowLearningDrawer(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 flex items-center justify-center space-x-2 transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Review 6-Step Tutoring Breakdown</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full sm:w-auto ml-auto px-6 py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
              >
                <span>
                  {currentIndex + 1 < questions.length ? 'Next Question' : 'Complete Exam & View Results'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6-STEP LEARNING MODE MODAL DRAWER */}
      {showLearningDrawer && currentEvaluation?.learning_mode && (
        <LearningModeDrawer
          learningData={currentEvaluation.learning_mode}
          onClose={() => setShowLearningDrawer(false)}
        />
      )}
    </div>
  );
}
