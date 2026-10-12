export type QuestionType =
  | 'viva'
  | 'mcq'
  | '2_marks'
  | '5_marks'
  | '10_marks'
  | 'application'
  | 'scenario'
  | 'case_study';

export type ExamType = 'viva' | 'mcq' | 'descriptive' | 'mixed';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'application' | 'expert';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  is_guest: boolean;
  xp: number;
  level: number;
  streak: number;
  last_active?: string;
  created_at: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  branches?: Branch[];
}

export interface Branch {
  id: string;
  pattern_id: string;
  name: string;
  code: string;
  years?: YearSemester[];
}

export interface YearSemester {
  id: string;
  branch_id: string;
  name: string;
  subjects?: Subject[];
}

export interface Subject {
  id: string;
  year_id: string;
  code: string;
  name: string;
  credits: number;
  description: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string;
  topics?: Topic[];
}

export interface Topic {
  id: string;
  unit_id: string;
  title: string;
  concepts_summary?: string;
  importance?: string;
  mastery_level?: number;
}

export interface Question {
  id: string;
  topic_id: string;
  unit_id: string;
  subject_id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  options?: string[]; // for MCQ
  ideal_answer: string;
  key_concepts?: string[];
  rubric?: string;
  unit_number?: number;
  topic_title?: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string;
  subject_name?: string;
  exam_type: ExamType;
  total_questions: number;
  total_marks: number;
  scored_marks: number;
  status: 'ongoing' | 'completed';
  adaptive_difficulty: DifficultyLevel;
  duration_seconds: number;
  created_at: string;
  completed_at?: string;
  questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  question_order: number;
  unit_id: string;
  topic_id: string;
  unit_number?: number;
  topic_title?: string;
  question_text: string;
  question_type: QuestionType;
  presented_difficulty: DifficultyLevel;
  options?: string[];
  student_answer?: string;
  marks_obtained?: number;
  max_marks: number;
  status: 'pending' | 'answered' | 'skipped' | 'idontknow';
  evaluation?: AIEvaluation;
}

export interface AIEvaluation {
  marks_obtained: number;
  max_marks: number;
  concept_accuracy_pct: number;
  completeness_pct: number;
  technical_correctness_pct: number;
  relevance_pct: number;
  examples_used_score: number;
  strengths: string[];
  missing_concepts: string[];
  mistakes: string[];
  suggested_improvements: string;
  model_answer: string;
  source_unit_number?: number;
  source_topic_title?: string;
  learning_mode?: LearningModeContent;
}

export interface LearningModeContent {
  step1_marks: number; // 0
  step2_concept_explanation: string;
  step3_best_model_answer: string;
  step4_simple_example: string;
  step5_memory_trick: string;
  step6_easier_followup: {
    question: string;
    options?: string[];
    hint: string;
    correct_answer: string;
  };
}

export interface MistakeRecord {
  id: string;
  user_id: string;
  subject_id: string;
  subject_name?: string;
  unit_number: number;
  topic_title: string;
  question_text: string;
  student_answer: string;
  ideal_answer: string;
  feedback_summary: string;
  mistake_count: number;
  consecutive_correct: number;
  is_mastered: boolean;
  last_reviewed_at: string;
}

export interface PerformanceStats {
  total_exams: number;
  questions_attempted: number;
  total_marks_earned: number;
  total_marks_possible: number;
  overall_accuracy: number;
  readiness_score: number;
  streak_days: number;
  level: number;
  xp: number;
  strong_topics: { topic: string; subject: string; score: number }[];
  weak_topics: { topic: string; subject: string; score: number }[];
  unit_performance: { unit: string; accuracy: number; total: number }[];
  difficulty_performance: { difficulty: string; accuracy: number; total: number }[];
  daily_progress: { date: string; marks: number; accuracy: number; questions: number }[];
}

export interface StudyPlanItem {
  id: string;
  day_label: string; // e.g., 'Today', 'Tomorrow', 'Wednesday'
  date_str: string;
  subject_name: string;
  unit_title: string;
  topic_title: string;
  focus_areas: string;
  estimated_minutes: number;
  completed: boolean;
}

export interface AchievementBadge {
  id: string;
  badge_key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
}
