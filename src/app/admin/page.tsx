'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  BookOpen,
  PlusCircle,
  BarChart3,
  CheckCircle2,
  Trash2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Pattern, QuestionType, Subject } from '@/types';

export default function AdminPanelPage() {
  const [stats, setStats] = useState<any>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [patternName, setPatternName] = useState('');
  const [patternDesc, setPatternDesc] = useState('');
  const [branchName, setBranchName] = useState('');
  const [yearName, setYearName] = useState('');

  // Subject Form
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subYearId, setSubYearId] = useState('yr-sppu-se');

  // Question Form
  const [qSubjectId, setQSubjectId] = useState('sub-dbms');
  const [qUnitId, setQUnitId] = useState('unt-dbms-1');
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('5_marks');
  const [qDiff, setQDiff] = useState('medium');
  const [qIdeal, setQIdeal] = useState('');
  const [qConcepts, setQConcepts] = useState('');

  const [message, setMessage] = useState('');

  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setPatterns(data.patterns);
        setSubjects(data.subjects);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternName) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_pattern',
          name: patternName,
          description: patternDesc,
          branchName,
          yearName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Custom academic pattern created successfully!');
        setPatternName('');
        setPatternDesc('');
        loadAdminData();
      }
    } catch (err: any) {
      setMessage('Error creating pattern: ' + err.message);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearId: subYearId,
          code: subCode || 'CS-NEW',
          name: subName,
          credits: 4,
          description: subDesc,
          units: [
            { title: 'Unit 1: Fundamentals & Theory' },
            { title: 'Unit 2: Core Architecture' },
            { title: 'Unit 3: Implementation & Methods' },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Subject added successfully with initial units!');
        setSubName('');
        setSubCode('');
        setSubDesc('');
        loadAdminData();
      }
    } catch (err: any) {
      setMessage('Error creating subject: ' + err.message);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !qIdeal) return;
    try {
      const conceptsArray = qConcepts.split(',').map((c) => c.trim()).filter(Boolean);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_question',
          subjectId: qSubjectId,
          unitId: qUnitId,
          questionText: qText,
          questionType: qType,
          difficulty: qDiff,
          idealAnswer: qIdeal,
          keyConcepts: conceptsArray,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Examination question recorded in database!');
        setQText('');
        setQIdeal('');
        setQConcepts('');
        loadAdminData();
      }
    } catch (err: any) {
      setMessage('Error adding question: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Academic Administration Console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          <Shield className="w-3.5 h-3.5" />
          <span>Curriculum Administrator Console</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Admin Panel: Academic Patterns & Question Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Manage multi-institutional patterns (Autonomous, Diploma, Engineering, MCA, MBA), subjects, units, topics, and authentic question banks.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {message}
        </div>
      )}

      {/* PLATFORM STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Patterns</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats?.totalPatterns || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Subjects</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats?.totalSubjects || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Questions</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats?.totalQuestions || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Exams Taken</span>
          <span className="text-2xl font-black text-amber-500">{stats?.totalExams || 0}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Users</span>
          <span className="text-2xl font-black text-rose-500">{stats?.totalUsers || 0}</span>
        </div>
      </div>

      {/* CREATE CUSTOM ACADEMIC PATTERN */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Create Custom Academic Pattern
        </h3>
        <p className="text-xs text-slate-500">
          Support any university or autonomous college curriculum structure.
        </p>

        <form onSubmit={handleCreatePattern} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pattern / University Name
            </label>
            <input
              type="text"
              required
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="e.g. Autonomous College 2026 NEP Pattern"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Branch Name
            </label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Artificial Intelligence & Machine Learning"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Year / Semester Name
            </label>
            <input
              type="text"
              value={yearName}
              onChange={(e) => setYearName(e.target.value)}
              placeholder="e.g. Third Year (Semester V)"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={patternDesc}
              onChange={(e) => setPatternDesc(e.target.value)}
              placeholder="Autonomous credit choice based curriculum"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition"
            >
              Add Academic Pattern
            </button>
          </div>
        </form>
      </div>

      {/* CREATE NEW SUBJECT */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Add Subject to Curriculum
        </h3>

        <form onSubmit={handleCreateSubject} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject Name
            </label>
            <input
              type="text"
              required
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="e.g. Cloud Computing & DevOps"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Code
            </label>
            <input
              type="text"
              value={subCode}
              onChange={(e) => setSubCode(e.target.value)}
              placeholder="e.g. CS-305"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Description
            </label>
            <textarea
              rows={2}
              value={subDesc}
              onChange={(e) => setSubDesc(e.target.value)}
              placeholder="Virtualization, containers, CI/CD pipelines, Kubernetes, microservices architecture..."
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md transition"
            >
              Add Subject with Units
            </button>
          </div>
        </form>
      </div>

      {/* ADD QUESTION TO QUESTION BANK */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          Add Question to Authentic Question Bank
        </h3>

        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={qSubjectId}
                onChange={(e) => setQSubjectId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Type
              </label>
              <select
                value={qType}
                onChange={(e) => setQType(e.target.value as QuestionType)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                <option value="viva">Viva Question</option>
                <option value="mcq">MCQ</option>
                <option value="2_marks">2 Marks Question</option>
                <option value="5_marks">5 Marks Question</option>
                <option value="10_marks">10 Marks Question</option>
                <option value="application">Application-Based</option>
                <option value="scenario">Scenario-Based</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={qDiff}
                onChange={(e) => setQDiff(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="application">Application</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Question Text
            </label>
            <input
              type="text"
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="e.g. Explain how Two-Phase Locking avoids conflicting schedules."
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ideal Model Answer
            </label>
            <textarea
              rows={3}
              required
              value={qIdeal}
              onChange={(e) => setQIdeal(e.target.value)}
              placeholder="Detailed reference answer used by AI evaluator for semantic grading..."
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Key Concepts Required (Comma Separated)
            </label>
            <input
              type="text"
              value={qConcepts}
              onChange={(e) => setQConcepts(e.target.value)}
              placeholder="e.g. Growing phase, Shrinking phase, Lock point, Conflict serializability"
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
          >
            Add Question to Bank
          </button>
        </form>
      </div>
    </div>
  );
}
