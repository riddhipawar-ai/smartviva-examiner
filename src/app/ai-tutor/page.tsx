'use client';

import { useState, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  Upload, BookOpen, Brain, CheckCircle, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Loader2,
  FileText, Zap, Star, RotateCcw, Send, Eye, EyeOff
} from 'lucide-react';

type QuestionType = 'MCQ' | 'Viva' | 'Short Answer' | 'Long Answer' | 'Numerical' | 'Scenario-Based' | 'Conceptual';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface GeneratedQuestion {
  id: string;
  question: string;
  answer: string;
  keyPoints: string[];
  difficulty: Difficulty;
  marks: number;
  type: QuestionType;
  options?: string[];
  correctOption?: string;
}

interface EvaluationResult {
  marks: number;
  maxMarks: number;
  percentage: number;
  status: 'Correct' | 'Partially Correct' | 'Incorrect';
  feedback: string;
  missingPoints: string[];
  suggestions: string;
  modelAnswer: string;
}

interface QuestionState {
  question: GeneratedQuestion;
  studentAnswer: string;
  evaluation: EvaluationResult | null;
  showAnswer: boolean;
  evaluating: boolean;
}

const QUESTION_TYPES: QuestionType[] = ['MCQ', 'Viva', 'Short Answer', 'Long Answer', 'Numerical', 'Scenario-Based', 'Conceptual'];
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: 'bg-green-100 text-green-700 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Hard: 'bg-red-100 text-red-700 border-red-200',
};
const TYPE_MARKS: Record<QuestionType, number> = {
  MCQ: 1, Viva: 5, 'Short Answer': 2, 'Long Answer': 10, Numerical: 5, 'Scenario-Based': 5, Conceptual: 5,
};
const STATUS_STYLES: Record<string, string> = {
  Correct: 'border-green-400 bg-green-50',
  'Partially Correct': 'border-yellow-400 bg-yellow-50',
  Incorrect: 'border-red-400 bg-red-50',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  Correct: <CheckCircle className="w-5 h-5 text-green-600" />,
  'Partially Correct': <AlertCircle className="w-5 h-5 text-yellow-600" />,
  Incorrect: <XCircle className="w-5 h-5 text-red-600" />,
};

export default function AITutorPage() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [subjectText, setSubjectText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('Viva');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Questions state
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [sessionScore, setSessionScore] = useState({ obtained: 0, total: 0, evaluated: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const allowed = ['pdf', 'docx', 'txt', 'pptx'];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowed.includes(ext)) {
        setError('Only PDF, DOCX, TXT, and PPTX files are supported.');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setError('');
    }
  };

  const generateQuestions = async () => {
    if (!file && !subjectText.trim()) {
      setError('Please upload a file or enter a subject/topic.');
      return;
    }
    setGenerating(true);
    setError('');
    setQuestionStates([]);
    setSessionScore({ obtained: 0, total: 0, evaluated: 0 });
    setExpandedIndex(0);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('subject', subjectText);
      formData.append('questionType', questionType);
      formData.append('count', questionCount.toString());

      const res = await fetch('/api/ai-tutor', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate questions.');
        return;
      }

      const states: QuestionState[] = (data.questions as GeneratedQuestion[]).map(q => ({
        question: q,
        studentAnswer: '',
        evaluation: null,
        showAnswer: false,
        evaluating: false,
      }));
      setQuestionStates(states);
      setSessionScore({ obtained: 0, total: data.questions.reduce((s: number, q: GeneratedQuestion) => s + q.marks, 0), evaluated: 0 });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const evaluateAnswer = async (index: number) => {
    const qs = questionStates[index];
    if (!qs.studentAnswer.trim()) {
      setError('Please write an answer before submitting.');
      return;
    }
    setError('');

    // Mark as evaluating
    setQuestionStates(prev => prev.map((s, i) => i === index ? { ...s, evaluating: true } : s));

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qs.question.question,
          studentAnswer: qs.studentAnswer,
          modelAnswer: qs.question.answer,
          maxMarks: qs.question.marks,
        }),
      });
      const evaluation: EvaluationResult = await res.json();

      setQuestionStates(prev => prev.map((s, i) =>
        i === index ? { ...s, evaluation, evaluating: false, showAnswer: true } : s
      ));

      // Update session score
      setSessionScore(prev => ({
        obtained: prev.obtained + evaluation.marks,
        total: prev.total,
        evaluated: prev.evaluated + 1,
      }));

      // Auto-expand next question
      if (index + 1 < questionStates.length) {
        setTimeout(() => setExpandedIndex(index + 1), 500);
      }
    } catch {
      setQuestionStates(prev => prev.map((s, i) => i === index ? { ...s, evaluating: false } : s));
      setError('Evaluation failed. Please try again.');
    }
  };

  const updateAnswer = (index: number, value: string) => {
    setQuestionStates(prev => prev.map((s, i) => i === index ? { ...s, studentAnswer: value } : s));
  };

  const toggleShowAnswer = (index: number) => {
    setQuestionStates(prev => prev.map((s, i) => i === index ? { ...s, showAnswer: !s.showAnswer } : s));
  };

  const resetSession = () => {
    setQuestionStates([]);
    setSessionScore({ obtained: 0, total: 0, evaluated: 0 });
    setExpandedIndex(0);
    setError('');
  };

  const scorePercent = sessionScore.total > 0
    ? Math.round((sessionScore.obtained / sessionScore.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Brain className="w-4 h-4" />
            AI Academic Assessment Assistant
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Question Generator & Evaluator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Upload your study material, notes, or question banks. Get exam-ready questions with model answers and instant evaluation.
          </p>
        </div>

        {/* Upload Panel */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" /> Upload Study Material
          </h2>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all mb-4"
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.pptx" onChange={handleFileChange} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-indigo-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Drop your file here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Supports PDF, DOCX, TXT, PPT</p>
              </>
            )}
          </div>

          {/* OR text input */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-400">OR enter subject / topic</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <input
            type="text"
            value={subjectText}
            onChange={e => setSubjectText(e.target.value)}
            placeholder="e.g., Artificial Intelligence, Deep Learning, Machine Learning..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
          />

          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mb-4">
            ⚠️ Computer Networking questions are not available in this assistant.
          </p>

          {/* Options Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Type</label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value as QuestionType)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {[3, 5, 7, 10, 15].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generateQuestions}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 rounded-xl transition-all"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Questions'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Score Summary */}
        {sessionScore.evaluated > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">{scorePercent}%</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Session Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {sessionScore.obtained.toFixed(1)} / {sessionScore.total}
                  </p>
                  <p className="text-xs text-gray-400">{sessionScore.evaluated} of {questionStates.length} answered</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                  scorePercent >= 75 ? 'bg-green-100 text-green-700 border-green-200' :
                  scorePercent >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {scorePercent >= 75 ? '✅ Good Performance' : scorePercent >= 50 ? '⚠️ Needs Improvement' : '❌ Needs More Study'}
                </div>
                <button onClick={resetSession} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        {questionStates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                {questionStates.length} Questions Generated
              </h2>
              <span className="text-sm text-gray-400">Click each question to expand</span>
            </div>

            {questionStates.map((qs, index) => {
              const isExpanded = expandedIndex === index;
              const evaluated = qs.evaluation !== null;

              return (
                <div
                  key={qs.question.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border transition-all ${
                    evaluated
                      ? STATUS_STYLES[qs.evaluation!.status]
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Question Header */}
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full text-left px-6 py-4 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-relaxed line-clamp-2">
                          {qs.question.question}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[qs.question.difficulty]}`}>
                            {qs.question.difficulty}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {qs.question.type}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {qs.question.marks} marks
                          </span>
                          {evaluated && (
                            <span className="text-xs font-semibold flex items-center gap-1">
                              {STATUS_ICONS[qs.evaluation!.status]}
                              {qs.evaluation!.marks}/{qs.evaluation!.maxMarks}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                      {/* MCQ Options */}
                      {qs.question.type === 'MCQ' && qs.question.options && !evaluated && (
                        <div className="mb-4 space-y-2">
                          {qs.question.options.map((opt, oi) => (
                            <button
                              key={oi}
                              onClick={() => updateAnswer(index, opt)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                                qs.studentAnswer === opt
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Text Answer Area */}
                      {qs.question.type !== 'MCQ' && !evaluated && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Answer
                          </label>
                          <textarea
                            value={qs.studentAnswer}
                            onChange={e => updateAnswer(index, e.target.value)}
                            rows={qs.question.type === 'Long Answer' ? 6 : 3}
                            placeholder="Write your answer here..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                          />
                        </div>
                      )}

                      {/* Submit Button */}
                      {!evaluated && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => evaluateAnswer(index)}
                            disabled={qs.evaluating || !qs.studentAnswer.trim()}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl transition-all text-sm"
                          >
                            {qs.evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {qs.evaluating ? 'Evaluating...' : 'Submit Answer'}
                          </button>
                          <button
                            onClick={() => toggleShowAnswer(index)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            {qs.showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {qs.showAnswer ? 'Hide Answer' : 'View Answer'}
                          </button>
                        </div>
                      )}

                      {/* Peek at answer (before submission) */}
                      {qs.showAnswer && !evaluated && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Model Answer</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{qs.question.answer}</p>
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Key Points:</p>
                            <ul className="space-y-1">
                              {qs.question.keyPoints.map((kp, ki) => (
                                <li key={ki} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                  <Star className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />{kp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Evaluation Result */}
                      {evaluated && qs.evaluation && (
                        <div className={`p-4 rounded-xl border ${STATUS_STYLES[qs.evaluation.status]}`}>
                          {/* Score Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {STATUS_ICONS[qs.evaluation.status]}
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {qs.evaluation.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {qs.evaluation.marks}
                              </span>
                              <span className="text-gray-500"> / {qs.evaluation.maxMarks}</span>
                              <span className="ml-2 text-sm font-medium text-gray-500">({qs.evaluation.percentage}%)</span>
                            </div>
                          </div>

                          {/* Feedback */}
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{qs.evaluation.feedback}</p>

                          {/* Missing Points */}
                          {qs.evaluation.missingPoints.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1.5">Missing Points:</p>
                              <ul className="space-y-1">
                                {qs.evaluation.missingPoints.map((mp, mi) => (
                                  <li key={mi} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                    <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />{mp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Suggestion */}
                          {qs.evaluation.suggestions && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                              💡 {qs.evaluation.suggestions}
                            </p>
                          )}

                          {/* Model Answer */}
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Model Answer</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{qs.evaluation.modelAnswer}</p>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Key Points:</p>
                            <ul className="space-y-1">
                              {qs.question.keyPoints.map((kp, ki) => (
                                <li key={ki} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                  <Star className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />{kp}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[qs.question.difficulty]}`}>
                              {qs.question.difficulty}
                            </span>
                            <span className="text-xs text-gray-400">{qs.question.type}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {questionStates.length === 0 && !generating && (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Ready to generate exam questions</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Upload a PDF or enter a subject above and click Generate</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
