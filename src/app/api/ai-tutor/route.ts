import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isNonAttempt } from '@/lib/ai';
import { cleanEducationalText } from '@/lib/extractor';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Blocked subjects — never generate questions from these
const BLOCKED_SUBJECTS = ['computer networking', 'computer network', 'cn', 'networking'];

export interface GeneratedQuestion {
  id: string;
  question: string;
  answer: string;
  keyPoints: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  type: 'MCQ' | 'Viva' | 'Short Answer' | 'Long Answer' | 'Numerical' | 'Scenario-Based' | 'Conceptual';
  options?: string[];       // For MCQ only
  correctOption?: string;   // For MCQ only
  topic?: string;           // Internal — not shown to student during question
  subject?: string;
}

export interface EvaluationResult {
  marks: number;
  maxMarks: number;
  percentage: number;
  status: 'Correct' | 'Partially Correct' | 'Incorrect';
  feedback: string;
  missingPoints: string[];
  suggestions: string;
  modelAnswer: string;
}

function isBlockedSubject(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_SUBJECTS.some(s => lower.includes(s));
}

// Local fallback — generates questions without Gemini
function generateLocalQuestions(content: string, count: number, type: string): GeneratedQuestion[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const questions: GeneratedQuestion[] = [];

  const questionTemplates: Record<string, (s: string) => string> = {
    'Viva': (s) => `Explain the concept: "${s.trim().substring(0, 80)}..."`,
    'Short Answer': (s) => `What is meant by: "${s.trim().substring(0, 60)}..."? Explain briefly.`,
    'Long Answer': (s) => `Describe in detail the following concept and its applications: "${s.trim().substring(0, 70)}..."`,
    'Conceptual': (s) => `Why is the following concept important? "${s.trim().substring(0, 70)}..."`,
    'Scenario-Based': (s) => `Given the scenario related to "${s.trim().substring(0, 50)}...", how would you apply this concept?`,
    'MCQ': (s) => `Which of the following best describes: "${s.trim().substring(0, 60)}..."?`,
  };

  const marksMap: Record<string, number> = {
    'Viva': 5, 'Short Answer': 2, 'Long Answer': 10, 'Conceptual': 5,
    'Scenario-Based': 5, 'MCQ': 1, 'Numerical': 5,
  };

  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const s = sentences[i];
    const template = questionTemplates[type] || questionTemplates['Viva'];
    const q: GeneratedQuestion = {
      id: `q_${Date.now()}_${i}`,
      question: template(s),
      answer: `The concept relates to: ${s.trim()}. Understanding this helps in grasping the broader topic thoroughly.`,
      keyPoints: [
        'Core definition and meaning',
        'Practical application',
        'Importance in the subject area',
      ],
      difficulty: i % 3 === 0 ? 'Easy' : i % 3 === 1 ? 'Medium' : 'Hard',
      marks: marksMap[type] || 5,
      type: type as GeneratedQuestion['type'],
    };
    if (type === 'MCQ') {
      q.options = ['Option A', 'Option B', 'Option C (Correct)', 'Option D'];
      q.correctOption = 'Option C (Correct)';
    }
    questions.push(q);
  }
  return questions;
}

// Local answer evaluation fallback (Lenient & Student-Friendly)
function evaluateLocally(studentAnswer: string, modelAnswer: string, maxMarks: number): EvaluationResult {
  if (isNonAttempt(studentAnswer)) {
    return {
      marks: 0, maxMarks, percentage: 0, status: 'Incorrect',
      feedback: 'No answer attempt provided. Write down what you know to earn points!',
      missingPoints: ['Complete answer required'],
      suggestions: 'Try writing your understanding in simple words to get encouraging marks.',
      modelAnswer,
    };
  }

  const studentWords = new Set(studentAnswer.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const modelWords = new Set(modelAnswer.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  let overlap = 0;
  modelWords.forEach(w => { if (studentWords.has(w)) overlap++; });
  const ratio = modelWords.size > 0 ? overlap / modelWords.size : 0;
  
  // Lenient scoring: award generous marks for expressing core thoughts
  let scoreRatio = 0.35; // Base encouragement floor for attempting
  if (ratio >= 0.35) {
    scoreRatio = 1.0; // Full marks for capturing key concepts
  } else if (ratio >= 0.2) {
    scoreRatio = 0.8; // 80% marks for being on the right track
  } else if (ratio >= 0.1 || studentWords.size >= 4) {
    scoreRatio = 0.6; // 60% marks for basic understanding and effort
  }

  const marks = Math.max(0.5, Math.round(scoreRatio * maxMarks * 10) / 10);

  let status: EvaluationResult['status'] = 'Partially Correct';
  if (scoreRatio >= 0.75) status = 'Correct';
  else if (scoreRatio <= 0.3) status = 'Incorrect';

  return {
    marks,
    maxMarks,
    percentage: Math.round(scoreRatio * 100),
    status,
    feedback: status === 'Correct'
      ? 'Well done! You have explained the concept nicely in your own words.'
      : 'Good attempt! You understand the basic idea. Review the points below to secure full marks in SPPU exams.',
    missingPoints: status !== 'Correct' ? ['Add one real-life example or keyword'] : [],
    suggestions: status !== 'Correct' ? 'Keep it up! Your conceptual direction is right.' : '',
    modelAnswer,
  };
}

// POST handler
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // ─── GENERATE QUESTIONS FROM TEXT/PDF ───────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const questionType = (formData.get('questionType') as string) || 'Viva';
      const count = parseInt((formData.get('count') as string) || '5');
      const subject = (formData.get('subject') as string) || '';

      // Block if user explicitly asked for networking
      if (subject && isBlockedSubject(subject)) {
        return NextResponse.json({ error: 'Computer Networking is not supported.' }, { status: 400 });
      }

      let rawText = '';
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') {
          const pdfParse = (await import('pdf-parse')).default;
          const parsed = await pdfParse(buffer);
          rawText = parsed.text;
        } else if (ext === 'docx') {
          const mammoth = (await import('mammoth')).default;
          const result = await mammoth.extractRawText({ buffer });
          rawText = result.value;
        } else if (ext === 'txt') {
          rawText = buffer.toString('utf-8');
        }
      }

      // If no file, use subject as seed
      if (!rawText && subject) rawText = subject;
      if (!rawText) return NextResponse.json({ error: 'No content provided.' }, { status: 400 });

      // Block networking content
      if (isBlockedSubject(rawText.substring(0, 500))) {
        return NextResponse.json({ error: 'Computer Networking content is not supported in this assistant.' }, { status: 400 });
      }

      const cleanText = cleanEducationalText(rawText);
      const excerpt = cleanText.substring(0, 6000);

      // Try Gemini
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const systemInstruction = `You are an expert academic examiner. Analyze the provided study material and generate ${count} ${questionType} questions.

STRICT RULES:
- Questions must be answerable from the given content.
- Do NOT ask about Computer Networking.
- Never reveal that questions were selected based on pattern analysis or prediction.
- Present questions naturally as if created by an expert educator.
- Vary difficulty: mix Easy, Medium, and Hard.

Return a valid JSON array (and nothing else) with this exact structure:
[
  {
    "id": "q1",
    "question": "...",
    "answer": "...",
    "keyPoints": ["point1", "point2", "point3"],
    "difficulty": "Easy|Medium|Hard",
    "marks": 2,
    "type": "${questionType}",
    "topic": "internal topic name"
  }
]

For MCQ, add: "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctOption": "A"

Study Material:
${excerpt}`;

        try {
          const result = await model.generateContent(systemInstruction);
          const text = result.response.text().trim();
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);
            // Strip internal topic from response so it stays hidden
            const sanitized = questions.map(q => ({ ...q, topic: undefined }));
            return NextResponse.json({ questions: sanitized, source: 'gemini' });
          }
        } catch (_e) {
          // Fall through to local
        }
      }

      // Local fallback
      const questions = generateLocalQuestions(excerpt, count, questionType);
      return NextResponse.json({ questions, source: 'local' });
    }

    // ─── EVALUATE STUDENT ANSWER ─────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { question, studentAnswer, modelAnswer, maxMarks = 5 } = body;

      if (!question || studentAnswer === undefined) {
        return NextResponse.json({ error: 'Missing question or answer.' }, { status: 400 });
      }

      // Strict: non-attempt = 0
      if (isNonAttempt(studentAnswer)) {
        return NextResponse.json<EvaluationResult>({
          marks: 0, maxMarks, percentage: 0, status: 'Incorrect',
          feedback: 'No attempt made. Answers like "I don\'t know" or random text receive 0 marks.',
          missingPoints: ['A genuine attempt is required'],
          suggestions: 'Study the topic carefully and write a proper answer.',
          modelAnswer,
        });
      }

      if (genAI) {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a supportive, encouraging, and fair university examiner evaluating an average engineering student's answer under the SPPU pattern.

Question: ${question}
Expected Answer: ${modelAnswer}
Student's Answer: ${studentAnswer}
Maximum Marks: ${maxMarks}

LENIENT & ENCOURAGING EVALUATION RULES:
- Focus on CONCEPTUAL UNDERSTANDING and student effort, NEVER on exact textbook wording or memorization.
- If the student is somewhat similar to the concept or near the answer, award generous marks (50% to 80%).
- If the answer conveys the correct core idea in simple words, award full or near-full marks.
- Do NOT penalize for grammar or simple student phrasing.
- Award 0 marks only for empty answers, "I don't know", or pure random gibberish.
- Feedback must be encouraging and motivating to build the student's confidence.

Return ONLY a valid JSON object:
{
  "marks": <number>,
  "maxMarks": ${maxMarks},
  "percentage": <0-100>,
  "status": "Correct|Partially Correct|Incorrect",
  "feedback": "...",
  "missingPoints": ["...", "..."],
  "suggestions": "...",
  "modelAnswer": "${modelAnswer.replace(/"/g, "'")}"
}`;
        try {
          const result = await model.generateContent(prompt);
          const text = result.response.text().trim();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const evaluation: EvaluationResult = JSON.parse(jsonMatch[0]);
            evaluation.maxMarks = maxMarks;
            return NextResponse.json(evaluation);
          }
        } catch (_e) {
          // Fall through to local
        }
      }

      return NextResponse.json(evaluateLocally(studentAnswer, modelAnswer, maxMarks));
    }

    return NextResponse.json({ error: 'Unsupported request.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[AI Tutor API]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
