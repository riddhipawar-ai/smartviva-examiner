'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookOpen,
  Check,
} from 'lucide-react';
import { StudyPlanItem } from '@/types';

export default function StudyPlannerPage() {
  const [plans, setPlans] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/study-plan');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const toggleTask = async (planId: string, currentStatus: boolean) => {
    const nextStatus = currentStatus ? 'pending' : 'completed';
    setPlans(
      plans.map((p) => (p.id === planId ? { ...p, completed: !currentStatus } : p))
    );
    await fetch('/api/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', planId, status: nextStatus }),
    });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await fetch('/api/study-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' }),
    });
    await loadPlans();
    setRegenerating(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Synthesizing Adaptive Study Schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 text-xs font-semibold text-purple-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Weak-Topic Remediation</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              AI Study Planner
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Dynamically generates your daily revision agenda based on detected conceptual gaps from exam mistakes.
            </p>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate From Weak Areas</span>
          </button>
        </div>
      </div>

      {/* Schedule Agenda Cards */}
      <div className="space-y-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              p.completed
                ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-80'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div className="flex items-start space-x-4">
              <button
                onClick={() => toggleTask(p.id, p.completed)}
                className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                  p.completed
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                }`}
              >
                {p.completed && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-extrabold text-[11px] uppercase">
                    {p.day_label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {p.date_str} &bull; {p.estimated_minutes} mins estimated
                  </span>
                </div>
                <h3 className={`text-base font-bold ${p.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {p.subject_name}: {p.unit_title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{p.topic_title}</span> &bull; {p.focus_areas}
                </p>
              </div>
            </div>

            <Link
              href="/create-exam"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0"
            >
              <span>Practice This Unit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
