import { query, run } from './db';
import { DifficultyLevel, Exam, ExamQuestion, ExamType, Question, QuestionType } from '@/types';
import { generateQuestionVariations } from './ai';

export interface ExamCreationOptions {
  userId: string;
  subjectId: string;
  examType: ExamType;
  totalQuestions?: number; // default 6 (e.g. 3 units * 2 questions each)
  startingDifficulty?: DifficultyLevel;
}

export async function createSmartFlowExam(options: ExamCreationOptions): Promise<{ examId: string; questions: ExamQuestion[] }> {
  const { userId, subjectId, examType, totalQuestions = 6, startingDifficulty = 'medium' } = options;

  // 1. Fetch all units for this subject
  const units = await query<{ id: string; unit_number: number; title: string }>(
    `SELECT id, unit_number, title FROM units WHERE subject_id = ? ORDER BY unit_number ASC`,
    [subjectId]
  );

  if (units.length === 0) {
    throw new Error('No units configured for this subject. Please add units or upload course material first.');
  }

  // 2. Randomize unit order for every exam
  const shuffledUnits = [...units].sort(() => Math.random() - 0.5);

  // 3. Question distribution rule: Exactly 2 questions from one unit, then switch unit!
  const questionsPerUnit = 2;
  const numUnitsNeeded = Math.ceil(totalQuestions / questionsPerUnit);

  // Cycle through shuffled units if totalQuestions > 2 * units.length
  const selectedUnits: typeof units = [];
  for (let i = 0; i < numUnitsNeeded; i++) {
    selectedUnits.push(shuffledUnits[i % shuffledUnits.length]);
  }

  // 4. Fetch recently asked questions for this user to avoid frequent repeats
  const recentQuestions = await query<{ question_id: string }>(
    `SELECT eq.question_id FROM exam_questions eq
     JOIN exams e ON e.id = eq.exam_id
     WHERE e.user_id = ?
     ORDER BY eq.asked_at DESC LIMIT 20`,
    [userId]
  );
  const recentIds = new Set(recentQuestions.map((r) => r.question_id));

  // 5. Select 2 questions per unit
  const examId = `ex-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const preparedQuestions: ExamQuestion[] = [];
  let currentOrder = 1;

  for (const unit of selectedUnits) {
    if (currentOrder > totalQuestions) break;

    // Filter by question type if specific mode requested
    let typeFilter = '';
    if (examType === 'mcq') {
      typeFilter = `AND (question_type = 'mcq')`;
    } else if (examType === 'viva') {
      typeFilter = `AND (question_type = 'viva' OR question_type = 'application')`;
    } else if (examType === 'descriptive') {
      typeFilter = `AND (question_type IN ('2_marks', '5_marks', '10_marks'))`;
    }

    // Query questions for this unit
    let availableQuestions = await query<Question & { unit_number: number; topic_title: string }>(
      `SELECT q.*, u.unit_number, t.title as topic_title
       FROM questions q
       JOIN units u ON u.id = q.unit_id
       LEFT JOIN topics t ON t.id = q.topic_id
       WHERE q.unit_id = ? ${typeFilter}
       ORDER BY RANDOM()`,
      [unit.id]
    );

    // Prefer questions not recently asked
    let pool = availableQuestions.filter((q) => !recentIds.has(q.id));
    if (pool.length < questionsPerUnit) {
      pool = availableQuestions; // fall back to full pool if not enough unique
    }

    // If still less than questionsPerUnit, generate dynamic variation
    for (let slot = 0; slot < questionsPerUnit; slot++) {
      if (currentOrder > totalQuestions) break;

      let chosenQuestion: (Question & { unit_number: number; topic_title: string }) | null = pool[slot] || null;

      if (!chosenQuestion) {
        // Fetch a topic from unit to synthesize question
        const topics = await query<{ id: string; title: string; concepts_summary: string }>(
          `SELECT id, title, concepts_summary FROM topics WHERE unit_id = ? LIMIT 1`,
          [unit.id]
        );
        const top = topics[0] || { id: `top-${unit.id}`, title: unit.title, concepts_summary: 'Core syllabus principles' };

        const targetType: QuestionType = examType === 'mcq' ? 'mcq' : examType === 'viva' ? 'viva' : '5_marks';
        const generated = await generateQuestionVariations({
          topicTitle: top.title,
          conceptSummary: top.concepts_summary,
          difficulty: startingDifficulty,
          type: targetType,
        });

        const newQId = `q-dyn-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await run(
          `INSERT INTO questions (id, topic_id, unit_id, subject_id, question_text, question_type, difficulty, options_json, ideal_answer, key_concepts_json, rubric_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Dynamic adaptive examination rubric')`,
          [
            newQId,
            top.id,
            unit.id,
            subjectId,
            generated.question_text,
            targetType,
            startingDifficulty,
            generated.options ? JSON.stringify(generated.options) : null,
            generated.ideal_answer,
            JSON.stringify(generated.key_concepts),
          ]
        );

        chosenQuestion = {
          id: newQId,
          topic_id: top.id,
          unit_id: unit.id,
          subject_id: subjectId,
          question_text: generated.question_text,
          question_type: targetType,
          difficulty: startingDifficulty,
          options: generated.options,
          ideal_answer: generated.ideal_answer,
          key_concepts: generated.key_concepts,
          unit_number: unit.unit_number,
          topic_title: top.title,
        };
      }

      // Max marks depending on type
      let maxMarks = 5;
      if (chosenQuestion.question_type === 'mcq') maxMarks = 2;
      else if (chosenQuestion.question_type === '2_marks') maxMarks = 2;
      else if (chosenQuestion.question_type === '5_marks' || chosenQuestion.question_type === 'viva') maxMarks = 5;
      else if (chosenQuestion.question_type === '10_marks' || chosenQuestion.question_type === 'case_study') maxMarks = 10;

      const examQId = `eq-${examId}-${currentOrder}`;
      const optionsParsed = typeof chosenQuestion.options_json === 'string'
        ? JSON.parse(chosenQuestion.options_json)
        : chosenQuestion.options;

      preparedQuestions.push({
        id: examQId,
        exam_id: examId,
        question_id: chosenQuestion.id,
        question_order: currentOrder,
        unit_id: chosenQuestion.unit_id,
        topic_id: chosenQuestion.topic_id || chosenQuestion.unit_id,
        unit_number: chosenQuestion.unit_number || unit.unit_number,
        topic_title: chosenQuestion.topic_title || unit.title,
        question_text: chosenQuestion.question_text,
        question_type: chosenQuestion.question_type,
        presented_difficulty: startingDifficulty,
        options: optionsParsed,
        max_marks: maxMarks,
        marks_obtained: 0,
        status: 'pending',
      });

      currentOrder++;
    }
  }

  // Calculate total marks
  const totalMarks = preparedQuestions.reduce((sum, q) => sum + (q.max_marks || 5), 0);

  // Insert Exam record
  await run(
    `INSERT INTO exams (id, user_id, subject_id, exam_type, total_questions, total_marks, scored_marks, status, adaptive_difficulty)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'ongoing', ?)`,
    [examId, userId, subjectId, examType, preparedQuestions.length, totalMarks, startingDifficulty]
  );

  // Insert exam questions into DB
  for (const eq of preparedQuestions) {
    await run(
      `INSERT INTO exam_questions (id, exam_id, question_id, question_order, unit_id, topic_id, presented_difficulty, max_marks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [eq.id, examId, eq.question_id, eq.question_order, eq.unit_id, eq.topic_id, eq.presented_difficulty, eq.max_marks]
    );
  }

  return { examId, questions: preparedQuestions };
}
