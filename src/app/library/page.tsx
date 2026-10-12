'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Pattern, Subject } from '@/types';

export default function LibraryPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>('sub-dbms');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [patRes, subRes] = await Promise.all([
          fetch('/api/patterns').then((r) => r.json()),
          fetch('/api/subjects').then((r) => r.json()),
        ]);

        if (patRes.success) setPatterns(patRes.patterns);
        if (subRes.success) setSubjects(subRes.subjects);
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    const matchesPattern = selectedPatternId === 'all' || s.pattern_name?.toLowerCase().includes(selectedPatternId.toLowerCase()) || s.id.includes(selectedPatternId);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPattern && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-300">
          <Layers className="w-3.5 h-3.5" />
          <span>Dynamic Academic Structure Hierarchy</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Curriculum & Subject Library
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Explore complete syllabus breakdowns: Pattern → Branch → Year/Semester → Subject → Unit → Topic. Choose any subject to inspect units, concepts, or launch practice exams.
        </p>

        {/* Academic Pattern Selector Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setSelectedPatternId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedPatternId === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            All Academic Patterns
          </button>
          {patterns.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPatternId(p.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedPatternId === p.name
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects or course codes..."
            className="w-full text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredSubjects.length} academic courses
        </div>
      </div>

      {/* SUBJECTS ACCORDION / CARDS */}
      <div className="space-y-4">
        {filteredSubjects.map((sub) => {
          const isExpanded = expandedSubjectId === sub.id;
          return (
            <div
              key={sub.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {sub.pattern_name || 'Standard Syllabus'} &bull; {sub.branch_name || 'Computing'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {sub.description}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sub.units?.length || 0} Units &bull; {sub.question_count || 0} Questions
                    </div>
                    <div className="text-[11px] text-slate-400">{sub.credits} Credits</div>
                  </div>

                  <Link
                    href={`/create-exam?subjectId=${sub.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center space-x-1.5"
                  >
                    <span>Test Subject</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="p-1.5 rounded-lg text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Units & Topics Breakdown */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Units & Academic Learning Hierarchy
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sub.units && sub.units.length > 0 ? (
                      sub.units.map((unit: any) => (
                        <div
                          key={unit.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                              Unit {unit.unit_number}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {unit.topics?.length || 0} Topics
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {unit.title}
                          </h5>
                          {unit.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">
                              {unit.description}
                            </p>
                          )}

                          {unit.topics && unit.topics.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {unit.topics.slice(0, 3).map((t: any) => (
                                <div
                                  key={t.id}
                                  className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1.5 truncate"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                  <span className="truncate">{t.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No units listed for this subject yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
