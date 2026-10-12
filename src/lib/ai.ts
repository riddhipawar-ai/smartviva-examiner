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
You are SmartViva Digital Examiner, an exceptionally rigorous, strict academic professor and viva examiner.
You NEVER award grace marks or participation marks.
You evaluate based on semantic understanding of engineering and academic concepts, NOT exact keyword matching.

CRITICAL MARKING RULES:
1. Correct Answer: Full Marks
2. Partially Correct: Marks strictly proportional to conceptual completeness and technical correctness
3. Incorrect Answer: 0 Marks
4. Unrelated / Off-topic Answer: 0 Marks
5. Random Text / Gibberish / "I don't know": 0 Marks
6. Absolutely NO grace marks.

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

  // Strict zero if answer is too short or lacks semantic relevance
  if (studentTokens.size < 4 && combinedScoreRatio < 0.2) {
    return createZeroEvaluation({
      maxMarks,
      idealAnswer,
      reason: 'Answer is too brief or lacks substantive conceptual content (Strict 0 Marks applied).',
      topicTitle,
      unitNumber,
      questionText,
    });
  }

  // Calculate marks strictly
  let rawMarks = 0;
  if (combinedScoreRatio >= 0.7) {
    rawMarks = maxMarks; // Full marks
  } else if (combinedScoreRatio >= 0.45) {
    rawMarks = Math.round(maxMarks * 0.7 * 10) / 10; // Partial strong
  } else if (combinedScoreRatio >= 0.25) {
    rawMarks = Math.round(maxMarks * 0.4 * 10) / 10; // Partial weak
  } else {
    rawMarks = 0; // Strict zero for weak/unrelated answers
  }

  const accuracyPct = Math.round(Math.min(100, Math.max(0, combinedScoreRatio * 100)));
  const completenessPct = Math.round(Math.min(100, (conceptHits / (keyConcepts.length || 1)) * 100));
  const technicalPct = Math.round(Math.min(100, tokenOverlapRatio * 100 * 1.2));

  const mistakes: string[] = [];
  if (rawMarks < maxMarks) {
    if (completenessPct < 60) mistakes.push('Incomplete technical scope compared to university model standard.');
    if (technicalPct < 50) mistakes.push('Missing critical terminology and precise formal definitions.');
  }

  return {
    marks_obtained: rawMarks,
    max_marks: maxMarks,
    concept_accuracy_pct: accuracyPct,
    completeness_pct: completenessPct,
    technical_correctness_pct: technicalPct,
    relevance_pct: accuracyPct > 0 ? Math.min(100, accuracyPct + 15) : 0,
    examples_used_score: studentLower.includes('example') || studentLower.includes('e.g.') || studentLower.includes('such as') ? 8 : 3,
    strengths: strengths.length > 0 ? strengths : ['Attempted basic conceptual description'],
    missing_concepts: missingConcepts.length > 0 ? missingConcepts : ['None, answer covered core concepts.'],
    mistakes: mistakes.length > 0 ? mistakes : ['No critical errors identified.'],
    suggested_improvements:
      rawMarks === maxMarks
        ? 'Excellent response! To make it stand out even further, complement with architectural diagrams or edge cases.'
        : 'Incorporate formal definitions and structured bullet points to ensure complete marks in university evaluations.',
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
Generate a fresh, unique academic examination question for the topic "${topicTitle}" with concept context: "${conceptSummary}".
Question Type: ${type}
Target Difficulty: ${difficulty}

RULES:
- Must NOT copy questions verbatim from textbooks; generate fresh variations.
- For MCQs, provide exactly 4 options and mark the correct one.
- Provide a rigorous ideal model answer.
- Provide 3-5 key concepts required in the answer.

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

  // Algorithmic dynamic variation generator
  const templates: Record<QuestionType, string[]> = {
    viva: [
      `In a viva examination, how would you defend the necessity of ${topicTitle} in high-throughput enterprise systems?`,
      `Explain the fundamental trade-offs introduced when implementing ${topicTitle}.`,
      `If a junior engineer asks you why ${topicTitle} cannot be replaced by simpler heuristics, what is your technical reasoning?`
    ],
    mcq: [
      `Which of the following statements most accurately characterizes ${topicTitle}?`,
      `In the context of ${topicTitle}, what is the primary structural invariant maintained?`
    ],
    '2_marks': [
      `Define ${topicTitle} and state its primary mathematical or logical formulation.`,
      `What are the two most critical benefits of ${topicTitle} in modern software architectures?`
    ],
    '5_marks': [
      `Provide a comprehensive technical description of ${topicTitle}. Discuss its working mechanism and primary use cases.`,
      `Explain how ${topicTitle} operates under failure conditions, and state the safeguards utilized.`
    ],
    '10_marks': [
      `Critically analyze ${topicTitle}. Provide a detailed architectural breakdown, algorithmic considerations, failure modes, and a comparison with alternative paradigms.`,
      `Design an end-to-end framework incorporating ${topicTitle}. Discuss edge cases, scalability bottlenecks, and theoretical guarantees.`
    ],
    application: [
      `A high-volume banking platform reports latency spikes under peak load. How can ${topicTitle} be strategically leveraged to mitigate this issue?`,
      `Describe how an autonomous distributed system applies ${topicTitle} to maintain consistency during partial network degradation.`
    ],
    scenario: [
      `Scenario: A critical transaction fails halfway through an asynchronous batch process. Explain how principles of ${topicTitle} prevent inconsistent state.`,
      `Scenario: During a database migration, two services attempt concurrent schema adjustments. How does ${topicTitle} resolve conflict?`
    ],
    case_study: [
      `Case Study: Consider an e-commerce platform processing 100,000 orders per second. Formulate a technical study on how ${topicTitle} guarantees correctness.`,
      `Case Study: Evaluate the failure of an un-normalized microservice data layer and outline a remediation blueprint based on ${topicTitle}.`
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
