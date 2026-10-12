'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileCheck2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { Subject } from '@/types';

export default function UploadPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sub-dbms');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.subjects.length > 0) {
          setSubjects(data.subjects);
          setSelectedSubjectId(data.subjects[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    if (!selectedSubjectId) {
      setError('Please select a target subject.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', selectedSubjectId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to process document');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automated Educational Content Extractor</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Upload Syllabus, Notes & Question Banks
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          The AI engine extracts pure educational concepts while ignoring cover pages, faculty names, acknowledgments, certificates, and bibliographies.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Target Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Target Course / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.description ? s.description.slice(0, 50) + '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Attach Course Material (PDF, DOCX, PPT/PPTX, TXT Notes)
            </label>
            <div className="relative border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-8 hover:border-indigo-500 dark:hover:border-indigo-600 transition flex flex-col items-center justify-center text-center cursor-pointer bg-indigo-50/20 dark:bg-slate-950/30">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.ppt,.pptx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Click to select or drag and drop files here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports syllabus PDFs, university question banks, lecture notes, or chapter handouts (Max 25MB).
              </p>
              {file && (
                <span className="mt-3 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  {(file.size / 1024).toFixed(1)} KB &bull; Ready for AI Extraction
                </span>
              )}
            </div>
          </div>

          {/* Filtering Guarantees Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Automated Cleaning Rules Applied During Processing:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
              <div>&bull; Ignores cover pages & titles</div>
              <div>&bull; Filters professor & faculty names</div>
              <div>&bull; Strips college & uni headers</div>
              <div>&bull; Omits acknowledgments</div>
              <div>&bull; Discards certificates & signatures</div>
              <div>&bull; Removes index & bibliographies</div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Extracting Concepts & Building Hierarchy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Process & Extract Educational Hierarchy</span>
              </>
            )}
          </button>
        </form>

        {/* Results Showcase */}
        {result && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold">Educational Extraction Completed!</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Successfully parsed <span className="font-semibold">{result.fileName}</span>. Added{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{result.unitsCount} units</span> and{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{result.topicsCount} topics</span> to the subject database with auto-generated practice questions.
            </p>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => router.push(`/create-exam?subjectId=${selectedSubjectId}`)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1.5"
              >
                <span>Launch Exam on Extracted Units</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.push('/library')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                View in Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
