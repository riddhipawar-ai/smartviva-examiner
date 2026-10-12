'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertOctagon,
  Lightbulb,
  Sparkles,
  HelpCircle,
  ArrowRight,
  BrainCircuit,
  X,
} from 'lucide-react';
import { LearningModeContent } from '@/types';

interface LearningModeDrawerProps {
  learningData: LearningModeContent;
  onClose: () => void;
  onFollowupSuccess?: () => void;
}

export default function LearningModeDrawer({ learningData, onClose, onFollowupSuccess }: LearningModeDrawerProps) {
  const [followupAnswer, setFollowupAnswer] = useState('');
  const [isFollowupSubmitted, setIsFollowupSubmitted] = useState(false);
  const [isFollowupCorrect, setIsFollowupCorrect] = useState(false);

  const handleCheckFollowup = () => {
    if (!followupAnswer.trim()) return;
    setIsFollowupSubmitted(true);
    // Simple conceptual check against correct answer
    const userWords = followupAnswer.toLowerCase().split(/\s+/);
    const targetWords = learningData.step6_easier_followup.correct_answer.toLowerCase().split(/\s+/);
    const hasOverlap = userWords.some((w) => targetWords.includes(w) && w.length > 3);

    const isMatch = followupAnswer.length > 10 || hasOverlap;
    setIsFollowupCorrect(isMatch);
    if (isMatch && onFollowupSuccess) {
      onFollowupSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                AI Professor Tutoring Mode
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-semibold uppercase tracking-wider">
                  6-Step Concept Master
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Active learning after a mistake to turn weak concepts into permanent knowledge.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body with all 6 Steps */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* STEP 1: STRICT 0 MARKS ASSIGNED */}
          <div className="rounded-2xl border border-rose-200 dark:border-rose-950 bg-rose-50/60 dark:bg-rose-950/20 p-4 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
              0
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Step 1: Strict Evaluation Rule (0 Marks Assigned)
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                Zero marks were recorded for this question because the concept was incorrect or skipped. No grace marks are given in SmartViva. Now, let’s master this concept immediately.
              </p>
            </div>
          </div>

          {/* STEP 2: EXPLAIN CONCEPT */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-slate-800/40 p-5 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Step 2: Conceptual Explanation</h4>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {learningData.step2_concept_explanation}
            </p>
          </div>

          {/* STEP 3: BEST MODEL ANSWER */}
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-slate-800/40 p-5 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Step 3: University Model Answer</h4>
            </div>
            <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 font-mono text-xs leading-relaxed">
              {learningData.step3_best_model_answer}
            </div>
          </div>

          {/* STEP 4: SIMPLE REAL-WORLD EXAMPLE */}
          <div className="rounded-2xl border border-amber-100 dark:border-amber-950 bg-amber-50/40 dark:bg-slate-800/40 p-5 space-y-2">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
              <Lightbulb className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Step 4: Intuitive Real-World Analogy</h4>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
              "{learningData.step4_simple_example}"
            </p>
          </div>

          {/* STEP 5: MEMORY TRICK / MNEMONIC */}
          <div className="rounded-2xl border border-purple-100 dark:border-purple-950 bg-purple-50/40 dark:bg-slate-800/40 p-5 space-y-2">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Step 5: Memory Trick & Mnemonic Rule</h4>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-sm font-semibold text-purple-900 dark:text-purple-200">
              {learningData.step5_memory_trick}
            </div>
          </div>

          {/* STEP 6: EASIER SIMILAR QUESTION */}
          <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">
                Step 6: Follow-up Concept Check (Easier Question)
              </h4>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {learningData.step6_easier_followup.question}
            </p>
            {learningData.step6_easier_followup.hint && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hint: {learningData.step6_easier_followup.hint}
              </p>
            )}

            {!isFollowupSubmitted ? (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={followupAnswer}
                  onChange={(e) => setFollowupAnswer(e.target.value)}
                  placeholder="Type your quick answer to verify understanding..."
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleCheckFollowup}
                  disabled={!followupAnswer.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition"
                >
                  Verify Understanding
                </button>
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border ${
                  isFollowupCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isFollowupCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Concept Understood! Excellent Recovery.
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-5 h-5 text-amber-600" />
                      Good Attempt! Review the Ideal Target below:
                    </>
                  )}
                </div>
                <p className="text-xs mt-2">
                  <span className="font-semibold">Ideal Target Answer:</span> {learningData.step6_easier_followup.correct_answer}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Concept logged in your Revision Mistakes Vault.
          </span>
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <span>Continue Examination</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
