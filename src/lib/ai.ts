import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIEvaluation, DifficultyLevel, LearningModeContent, Question, QuestionType } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Adaptive difficulty ladder
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'hard', 'application', 'expert'];

export function calculateNextDifficulty(current: DifficultyLevel, scoredRatio: number): DifficultyLevel {
  const currentIndex = DIFFICULTY_LEVELS.indexOf(current);
  if (scoredRatio >= 0.75) {
    // Correct / strong performance: step up
    const nextIndex = Math.min(DIFFICULTY_LEVELS.length - 1, currentIndex + 1);
    return DIFFICULTY_LEVELS[nextIndex];
  } else if (scoredRatio <= 0.35) {
    // Poor / wrong performance: step down
    const nextIndex = Math.max(0, currentIndex - 1);
    return DIFFICULTY_LEVELS[nextIndex];
  }
  return current;
}

// Strict check for "I don't know", gibberish, or empty
export function isNonAttempt(answer: string): boolean {
  if (!answer) return true;
  const trimmed = answer.trim().toLowerCase();
  const idontknowPatterns = [
    "i don't know",
    "i dont know",
    "idk",
    "no idea",
    "dont know",
    "not sure",
    "skip",
    "pass",
    "dunno",
    "cannot answer",
    "can't answer",
    "blank",
    "na",
    "n/a",
    "nil"
  ];
  if (idontknowPatterns.includes(trimmed)) return true;

  // Gibberish detection: repeating characters, keyboard walks, or long consonant streaks
  if (trimmed.length > 4) {
    const uniqueChars = new Set(trimmed.replace(/\s+/g, '')).size;
    if (uniqueChars <= 3) return true;
    if (/(asdf|hjkl|qwerty|zxcvb|12345|aaaa|xxxx)/i.test(trimmed)) return true; // Keyboard walk / mash
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(trimmed)) return true; // 5+ consecutive consonants like sdfghjkl
  }
  return false;
}

// Core Semantic Answer Evaluation
export async function evaluateAnswer(params: {
  questionText: string;
  questionType: QuestionType;
  maxMarks: number;
  idealAnswer: string;
  studentAnswer: string;
  keyConcepts?: string[];
  unitNumber?: number;
  topicTitle?: string;
}): Promise<AIEvaluation> {
  const { questionText, maxMarks, idealAnswer, studentAnswer, keyConcepts = [], unitNumber, topicTitle } = params;

  // 1. Strict zero for non-attempts, gibberish, or "I don't know"
  if (isNonAttempt(studentAnswer)) {
    return createZeroEvaluation({
      maxMarks,
      idealAnswer,
      reason: 'No valid conceptual attempt provided (classified as "I Don\'t Know" or non-responsive).',
      topicTitle,
      unitNumber,
      questionText,
    });
  }

  // 2. Try Gemini Semantic Evaluation if API key is present
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
You are SmartViva Digital Examiner, an encouraging, supportive, and fair academic professor and viva examiner.
Your goal is to build students' confidence, encourage their learning, and foster deep conceptual understanding rather than demotivating them.

CRITICAL LENIENT EVALUATION RULES:
1. Focus on CONCEPTUAL UNDERSTANDING, NEVER on exact textbook wording or strict phrasing.
2. If the student's answer captures the basic or core idea, is somewhat similar to the concept, or is near to the answer:
   - Award generous partial marks (at least 50% to 75% marks).
   - Acknowledge their conceptual understanding in the strengths section.
3. If the answer is substantially correct even if informal, incomplete in formal vocabulary, or expressed in simple student language:
   - Award Full or near-full marks (80% to 100%).
4. Give constructive, supportive, and motivating feedback. NEVER use harsh or discouraging remarks.
5. Only award 0 marks for completely blank inputs, explicit "I don't know", gibberish/keyboard mash, or completely unrelated random text.
6. If the student makes an honest effort and mentions relevant ideas or keywords, award points!

QUESTION:
"${questionText}"
MAX MARKS: ${maxMarks}

MODEL / IDEAL ANSWER:
"${idealAnswer}"

KEY CONCEPTS REQUIRED:
${JSON.stringify(keyConcepts)}

STUDENT ANSWER:
"${studentAnswer}"

Return ONLY a valid JSON object with EXACTLY this structure:
{
  "marks_obtained": number (between 0 and ${maxMarks}),
  "concept_accuracy_pct": number (0 to 100),
  "completeness_pct": number (0 to 100),
  "technical_correctness_pct": number (0 to 100),
  "relevance_pct": number (0 to 100),
  "examples_used_score": number (0 to 10),
  "strengths": ["list of accurate conceptual points made by student"],
  "missing_concepts": ["key academic concepts omitted or missed"],
  "mistakes": ["specific conceptual errors or misunderstandings in student answer"],
  "suggested_improvements": "Actionable professor advice on how to improve this answer for a university examination",
  "model_answer": "${idealAnswer.replace(/"/g, '\\"')}",
  "learning_mode": {
    "step1_marks": 0,
    "step2_concept_explanation": "Crystal-clear conceptual explanation of why this concept matters",
    "step3_best_model_answer": "Flawless examination-grade answer",
    "step4_simple_example": "A memorable real-world analogy or practical code/system example",
    "step5_memory_trick": "A clever mnemonic or memory rule to never forget this concept",
    "step6_easier_followup": {
      "question": "An easier, beginner-friendly conceptual question testing the basic root idea",
      "hint": "Helpful hint without giving it away",
      "correct_answer": "Concise correct answer"
    }
  }
}
`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      // Clamp marks
      const marksObtained = Math.max(0, Math.min(maxMarks, Number(parsed.marks_obtained) || 0));

      return {
        marks_obtained: marksObtained,
        max_marks: maxMarks,
        concept_accuracy_pct: Math.min(100, Math.max(0, Number(parsed.concept_accuracy_pct) || 0)),
        completeness_pct: Math.min(100, Math.max(0, Number(parsed.completeness_pct) || 0)),
        technical_correctness_pct: Math.min(100, Math.max(0, Number(parsed.technical_correctness_pct) || 0)),
        relevance_pct: Math.min(100, Math.max(0, Number(parsed.relevance_pct) || 0)),
        examples_used_score: Math.min(10, Math.max(0, Number(parsed.examples_used_score) || 0)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Demonstrated basic familiarity with terms'],
        missing_concepts: Array.isArray(parsed.missing_concepts) ? parsed.missing_concepts : [],
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
        suggested_improvements: parsed.suggested_improvements || 'Review core definitions and include real-world application examples.',
        model_answer: idealAnswer,
        source_unit_number: unitNumber,
        source_topic_title: topicTitle,
        learning_mode: parsed.learning_mode || createLearningMode({ questionText, idealAnswer, topicTitle }),
      };
    } catch (err) {
      console.error('Gemini API call failed, falling back to local semantic engine:', err);
    }
  }

  // 3. Fallback High-Fidelity Local Semantic Evaluation Engine
  return localSemanticEvaluation({
    questionText,
    maxMarks,
    idealAnswer,
    studentAnswer,
    keyConcepts,
    unitNumber,
    topicTitle,
  });
}

function createZeroEvaluation(params: {
  maxMarks: number;
  idealAnswer: string;
  reason: string;
  topicTitle?: string;
  unitNumber?: number;
  questionText: string;
}): AIEvaluation {
  const { maxMarks, idealAnswer, reason, topicTitle, unitNumber, questionText } = params;
  return {
    marks_obtained: 0,
    max_marks: maxMarks,
    concept_accuracy_pct: 0,
    completeness_pct: 0,
    technical_correctness_pct: 0,
    relevance_pct: 0,
    examples_used_score: 0,
    strengths: [],
    missing_concepts: ['Complete concept omitted or unaddressed'],
    mistakes: [reason],
    suggested_improvements: 'Study the foundational definition and review the provided model answer below.',
    model_answer: idealAnswer,
    source_unit_number: unitNumber,
    source_topic_title: topicTitle,
    learning_mode: createLearningMode({ questionText, idealAnswer, topicTitle }),
  };
}

function createLearningMode(params: { questionText: string; idealAnswer: string; topicTitle?: string }): LearningModeContent {
  const { questionText, idealAnswer, topicTitle = 'Core Concept' } = params;
  return {
    step1_marks: 0,
    step2_concept_explanation: `The concept of "${topicTitle}" is fundamental. At its core, it ensures systemic integrity and structured behavior in computing architectures. When asked in viva or exams, examiners look for the primary mechanism and why alternative approaches fail.`,
    step3_best_model_answer: idealAnswer,
    step4_simple_example: `Think of this like an airport passport checkpoint: every passenger must be authenticated against the central database before boarding to prevent unauthorized access or duplicate seats.`,
    step5_memory_trick: `Memory Mnemonic: "F-A-C-T" -> Functions, Architecture, Constraints, Transactions. Always state what it does, how it is organized, and what boundary condition it enforces.`,
    step6_easier_followup: {
      question: `What is the single primary objective of "${topicTitle}"?`,
      hint: `Think of the most fundamental benefit it provides to the system.`,
      correct_answer: `To eliminate redundancy, maintain consistency, and ensure structural reliability.`,
    },
  };
}

// Local Semantic Evaluation Engine (No API key needed)
function localSemanticEvaluation(params: {
  questionText: string;
  maxMarks: number;
  idealAnswer: string;
  studentAnswer: string;
  keyConcepts: string[];
  unitNumber?: number;
  topicTitle?: string;
}): AIEvaluation {
  const { questionText, maxMarks, idealAnswer, studentAnswer, keyConcepts, unitNumber, topicTitle } = params;

  const studentLower = studentAnswer.toLowerCase();
  const idealLower = idealAnswer.toLowerCase();

  // Tokenize & semantic overlap
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for', 'it', 'by', 'with', 'as', 'are', 'that', 'this', 'or']);
  const idealTokens = idealLower
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const studentTokens = new Set(
    studentLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );

  let matchedTokens = 0;
  for (const t of idealTokens) {
    if (studentTokens.has(t)) {
      matchedTokens++;
    }
  }

  const tokenOverlapRatio = idealTokens.length > 0 ? matchedTokens / idealTokens.length : 0;

  // Key concept checks
  let conceptHits = 0;
  const missingConcepts: string[] = [];
  const strengths: string[] = [];

  for (const kc of keyConcepts) {
    const kcWords = kc.toLowerCase().split(/\s+/).filter((w) => !stopWords.has(w));
    const matched = kcWords.some((w) => studentLower.includes(w));
    if (matched) {
      conceptHits++;
      strengths.push(`Correctly referenced ${kc}`);
    } else {
      missingConcepts.push(`Did not address ${kc}`);
    }
  }

  const conceptRatio = keyConcepts.length > 0 ? conceptHits / keyConcepts.length : tokenOverlapRatio;
  const combinedScoreRatio = (tokenOverlapRatio * 0.4) + (conceptRatio * 0.6);

  // Strict zero only if no meaningful input
  if (studentTokens.size === 0) {
    return createZeroEvaluation({
      maxMarks,
      idealAnswer,
      reason: 'No response submitted.',
      topicTitle,
      unitNumber,
      questionText,
    });
  }

  // Lenient, student-friendly scoring to build confidence:
  // Award generous marks if the student captures the concept or is in the right ballpark
  let rawMarks = 0;
  if (combinedScoreRatio >= 0.45) {
    rawMarks = maxMarks; // Full marks for grasping the core idea!
  } else if (combinedScoreRatio >= 0.25) {
    rawMarks = Math.round(maxMarks * 0.75 * 10) / 10; // 75% marks for being on the right track
  } else if (combinedScoreRatio >= 0.1 || studentTokens.size >= 4) {
    rawMarks = Math.max(1, Math.round(maxMarks * 0.5 * 10) / 10); // Generous half marks for effort & basic familiarity
  } else {
    rawMarks = Math.max(0.5, Math.round(maxMarks * 0.25 * 10) / 10); // At least partial encouragement marks
  }

  const accuracyPct = Math.min(100, Math.round(Math.max(40, combinedScoreRatio * 100 + 20)));
  const completenessPct = Math.min(100, Math.round((conceptHits / (keyConcepts.length || 1)) * 100 + 25));
  const technicalPct = Math.min(100, Math.round(tokenOverlapRatio * 100 * 1.5 + 25));

  const mistakes: string[] = [];
  if (rawMarks < maxMarks) {
    if (completenessPct < 60) mistakes.push('Good intuition! You are very close — try to add one simple example to secure full marks.');
    if (technicalPct < 50) mistakes.push('Your general concept is right! Practicing the standard SPPU definitions will polish your answers.');
  }

  return {
    marks_obtained: rawMarks,
    max_marks: maxMarks,
    concept_accuracy_pct: accuracyPct,
    completeness_pct: completenessPct,
    technical_correctness_pct: technicalPct,
    relevance_pct: accuracyPct > 0 ? Math.min(100, accuracyPct + 15) : 0,
    examples_used_score: studentLower.includes('example') || studentLower.includes('e.g.') || studentLower.includes('such as') ? 8 : 4,
    strengths: strengths.length > 0 ? strengths : ['Understands the general concept well', 'Good effort in framing the answer in own words'],
    missing_concepts: missingConcepts.length > 0 ? missingConcepts : ['None, answer covered core concepts.'],
    mistakes: mistakes.length > 0 ? mistakes : ['No major errors — concept is on the right track!'],
    suggested_improvements:
      rawMarks === maxMarks
        ? 'Outstanding response! You have grasped this concept thoroughly.'
        : 'Great effort! You clearly have the core idea right. To boost marks further in SPPU exams, use bullet points or a brief diagram.',
    model_answer: idealAnswer,
    source_unit_number: unitNumber,
    source_topic_title: topicTitle,
    learning_mode: rawMarks < maxMarks * 0.5 ? createLearningMode({ questionText, idealAnswer, topicTitle }) : undefined,
  };
}

// Generate Dynamic Exam Questions from Concepts
export async function generateQuestionVariations(params: {
  topicTitle: string;
  conceptSummary: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
}): Promise<{ question_text: string; ideal_answer: string; key_concepts: string[]; options?: string[] }> {
  const { topicTitle, conceptSummary, difficulty, type } = params;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
Generate a clear, confidence-building examination question strictly conforming to the Savitribai Phule Pune University (SPPU) syllabus for the topic "${topicTitle}" with concept context: "${conceptSummary}".
Question Type: ${type}
Target Difficulty: ${difficulty} (Keep questions student-friendly, encouraging, clear, and direct — suitable for average engineering students to understand and answer without unnecessary complexity).

SPPU SYLLABUS ALIGNMENT RULES:
- Focus on core SPPU examination questions (definitions, basic working, standard diagrams, comparisons, real-life examples).
- Categorize clearly into Easy (direct definition/concept), Medium (explanation/comparison), or Difficult (application/working).
- Avoid overly convoluted or trick questions. Questions must be encouraging and accessible to boost student morale!
- For MCQs, provide 4 clear options with 1 unambiguous correct answer.
- Provide a clear, structured model answer that is easy for a student to learn.
- Provide 2-4 key conceptual points.

Return ONLY a JSON object:
{
  "question_text": "...",
  "ideal_answer": "...",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "options": ["Option A", "Option B", "Option C", "Option D"] (only if type is mcq)
}
`;
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(res.response.text());
      return {
        question_text: parsed.question_text,
        ideal_answer: parsed.ideal_answer,
        key_concepts: parsed.key_concepts || [],
        options: parsed.options,
      };
    } catch (e) {
      console.error('Gemini question generation failed, using dynamic algorithmic template:', e);
    }
  }

  // Algorithmic dynamic variation generator (SPPU syllabus-focused, student-friendly)
  const templates: Record<QuestionType, string[]> = {
    viva: [
      `What do you understand by ${topicTitle}? Explain in simple terms with a real-life example.`,
      `State the main purpose and importance of ${topicTitle} in simple words.`,
      `How would you explain the basic working of ${topicTitle} to a peer?`
    ],
    mcq: [
      `Which of the following is the primary purpose of ${topicTitle}?`,
      `In the context of ${topicTitle}, which statement is correct?`
    ],
    '2_marks': [
      `Define ${topicTitle} and state any two of its advantages.`,
      `What is ${topicTitle}? Give one simple example.`
    ],
    '5_marks': [
      `Explain ${topicTitle} with a neat diagram and its basic working mechanism.`,
      `Describe the key features and advantages of ${topicTitle} as per SPPU pattern.`
    ],
    '10_marks': [
      `Explain ${topicTitle} in detail with its architecture, working steps, and a practical example.`,
      `Compare ${topicTitle} with related approaches and discuss its practical applications.`
    ],
    application: [
      `Explain how ${topicTitle} is used in real-world computer engineering applications with a simple example.`,
      `Give a practical scenario where ${topicTitle} provides the most effective solution.`
    ],
    scenario: [
      `Consider a simple real-life system: how does ${topicTitle} help in organizing and processing data effectively?`,
      `Scenario: If a system needs better performance, how does applying ${topicTitle} help?`
    ],
    case_study: [
      `Discuss a simple case study illustrating how ${topicTitle} is implemented in standard industry software.`,
      `Explain the step-by-step role of ${topicTitle} in solving a practical engineering problem.`
    ]
  };

  const selectedList = templates[type] || templates['5_marks'];
  const text = selectedList[Math.floor(Math.random() * selectedList.length)];

  return {
    question_text: text,
    ideal_answer: `The comprehensive analysis of ${topicTitle} entails understanding its core properties: ${conceptSummary}. It guarantees systemic consistency, isolates transient failures, and provides predictable asymptotic complexity.`,
    key_concepts: [topicTitle, 'Systemic Consistency', 'Architectural Integrity', 'Failure Isolation'],
    options: type === 'mcq' ? [
      `Maintains strict invariant consistency across state transitions`,
      `Increases memory overhead without providing concurrency guarantees`,
      `Replaces physical indexing with brute-force sequential scans`,
      `Bypasses ACID properties to achieve arbitrary throughput`
    ] : undefined,
  };
}
