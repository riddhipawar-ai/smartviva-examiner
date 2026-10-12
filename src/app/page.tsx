import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  Mic,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  BookOpen,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  FileText,
  Award,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-8 sm:p-12 lg:p-16 border border-indigo-800/40 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Production-Grade AI Academic Examiner</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            The Digital Professor that{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Teaches Concepts
            </span>
            , Not Just Grades.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            SmartViva Examiner transforms examination into deep mastery. Featuring dynamic academic patterns (SPPU, Autonomous, Diploma, Engineering, MCA, MBA), voice viva through microphone, smart 2-question unit switching, hidden unit evaluation, strict semantic marking, and active 6-step tutoring after every mistake.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/create-exam"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition transform hover:-translate-y-0.5"
            >
              <Mic className="w-4 h-4" />
              <span>Start Viva Exam</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Syllabus / Notes</span>
            </Link>

            <Link
              href="/login?guest=true"
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-indigo-300 hover:text-white transition"
            >
              <span>Instant Guest Mode</span>
            </Link>
          </div>
        </div>

        {/* Feature stats counter */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 border-t border-slate-800/80 mt-12">
          <div>
            <div className="text-2xl font-black text-indigo-300">0% Grace</div>
            <div className="text-xs text-slate-400">Strict Semantic Marking</div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-300">2-per-Unit</div>
            <div className="text-xs text-slate-400">Smart Question Flow</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-300">Hidden Unit</div>
            <div className="text-xs text-slate-400">Reveal After Evaluation</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300">6-Step Tutor</div>
            <div className="text-xs text-slate-400">Post-Mistake Learning</div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Engineered for Serious Academic Mastery
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A comprehensive suite of examiner and professor tools to bridge the gap between superficial memorization and conceptual understanding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Dynamic Academic Structures */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Dynamic Academic Structures
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Not limited to any single syllabus. Supports SPPU 2024, Autonomous Colleges, Diploma (MSBTE), Degree Engineering, MCA, MBA, and custom administrator hierarchies: Pattern → Branch → Year/Sem → Subject → Unit → Topic.
            </p>
          </div>

          {/* Card 2: Voice Viva Mode */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Voice Viva Mode
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Answer viva questions naturally through your microphone. The AI Professor articulates the question aloud, captures speech in real-time, converts audio to text, and grades conceptual depth.
            </p>
          </div>

          {/* Card 3: Smart 2-Question Flow */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Smart Flow & Hidden Units
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Asks exactly 2 questions per unit, then automatically shifts units in randomized order. Questions are shown clean without unit headers; source unit and topic are revealed only after submission.
            </p>
          </div>

          {/* Card 4: Strict Semantic Marking */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Strict Semantic Marking
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Zero keyword hacks. Compares semantic vectors against an ideal university model answer. Strict 0 marks for "I don't know", off-topic or random text. No grace marks.
            </p>
          </div>

          {/* Card 5: 6-Step Post-Mistake Tutoring */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              6-Step Learning Mode
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When an answer misses the mark: 1) Assign 0 marks, 2) Explain concept, 3) Model answer, 4) Real-world analogy, 5) Memory trick mnemonic, 6) Easier follow-up question.
            </p>
          </div>

          {/* Card 6: AI Educational Document Cleaner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Educational File Cleaner
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload PDF, DOCX, PPT, or notes. Automatically ignores cover pages, professor names, acknowledgments, certificates, and indexes. Extracts core concepts, algorithms, and formulas into a topic tree.
            </p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="rounded-3xl bg-slate-900 dark:bg-slate-900/90 border border-slate-800 p-8 sm:p-12 text-center text-white space-y-6">
        <h2 className="text-3xl font-extrabold max-w-xl mx-auto">
          Ready to Test Your Genuine Conceptual Understanding?
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Start with a realistic 6-question viva or descriptive exam in DBMS, Data Structures, Networks, or upload your own course materials.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/create-exam"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            Create Exam Now
          </Link>
          <Link
            href="/library"
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
          >
            Browse Curriculum Library
          </Link>
        </div>
      </section>
    </div>
  );
}
