'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Shield,
  Flame,
  Zap,
  Award,
  LogOut,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { User } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) setUser(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Profile Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl uppercase shadow-lg shadow-indigo-600/30">
            {user?.name ? user.name[0] : 'S'}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {user?.name || 'Guest Scholar'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                {user?.role || 'student'}
              </span>
              {user?.is_guest && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Guest Session
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">Level Rank</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              Lvl {user?.level || 1}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">Academic XP</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {user?.xp || 0}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-400">Study Streak</div>
            <div className="text-2xl font-black text-amber-500">
              {user?.streak || 1}d
            </div>
          </div>
        </div>

        {/* Academic Settings Notice */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Active Academic Curriculum:
          </h4>
          <p>
            Configured for SPPU 2024, Autonomous Colleges & National AICTE model with cross-pattern support.
          </p>
        </div>
      </div>
    </div>
  );
}
