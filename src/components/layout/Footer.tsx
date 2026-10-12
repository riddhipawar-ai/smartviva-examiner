import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, Cpu, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                SmartViva Examiner
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Next-Gen Academic Viva, MCQ & Descriptive Examination Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Strict Zero-Grace Marking</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Semantic AI Evaluation</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Adaptive Difficulty Engine</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} SmartViva Examiner. Built for Engineering, MCA, MBA & Autonomous Institutions.
          </div>
        </div>
      </div>
    </footer>
  );
}
