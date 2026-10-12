import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { run, query } from './db';

export interface ExtractedUnit {
  unit_number: number;
  title: string;
  topics: {
    title: string;
    summary: string;
    definitions: string[];
    algorithms: string[];
    formulas: string[];
    exam_points: string[];
  }[];
}

// Patterns of boilerplate lines to ignore
const BOILERPLATE_PATTERNS = [
  /^(dr\.|prof\.|mr\.|mrs\.|ms\.)\s+[a-z\s\.]+/i,
  /college\s+of\s+engineering/i,
  /institute\s+of\s+technology/i,
  /university\s+department/i,
  /submitted\s+by/i,
  /guided\s+by/i,
  /acknowledg(e)?ment/i,
  /certificate\s+of\s+completion/i,
  /all\s+rights\s+reserved/i,
  /copyright\s+©/i,
  /table\s+of\s+contents/i,
  /index\s+page/i,
  /bibliography/i,
  /references/i,
  /page\s+\d+\s+of\s+\d+/i,
  /phone:\s*\+?\d+/i,
  /email:\s*[\w\.-]+@[\w\.-]+/i,
  /signature\s+of/i,
  /head\s+of\s+department/i,
  /principal\s+signature/i,
];

export function cleanEducationalText(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const cleanedLines: string[] = [];

  let isInsideBoilerplateSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check header / section start
    if (/^(acknowledg(e)?ment|certificate|bibliography|references|index)$/i.test(line)) {
      isInsideBoilerplateSection = true;
      continue;
    }

    if (isInsideBoilerplateSection) {
      // If we hit a new clear Unit or Topic heading, we exit the ignored section
      if (/^(unit|module|chapter)\s+[0-9ivx]+/i.test(line)) {
        isInsideBoilerplateSection = false;
      } else {
        continue; // ignore line inside boilerplate
      }
    }

    // Ignore lines matching boilerplate patterns
    const isIgnored = BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line));
    if (isIgnored) continue;

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
}

export async function parseDocumentContent(fileBuffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    if (ext === 'pdf') {
      const data = await pdf(fileBuffer);
      return cleanEducationalText(data.text);
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return cleanEducationalText(result.value);
    } else {
      // txt, notes, pptx text dump
      const text = fileBuffer.toString('utf-8');
      return cleanEducationalText(text);
    }
  } catch (err) {
    console.error('Document parsing error:', err);
    throw new Error(`Failed to extract text from ${fileName}: ${(err as Error).message}`);
  }
}

export function extractHierarchyAndConcepts(cleanText: string): ExtractedUnit[] {
  const lines = cleanText.split('\n');
  const units: ExtractedUnit[] = [];

  let currentUnit: ExtractedUnit = {
    unit_number: 1,
    title: 'Foundational Concepts',
    topics: [],
  };

  let currentTopic = {
    title: 'General Overview',
    summary: '',
    definitions: [] as string[],
    algorithms: [] as string[],
    formulas: [] as string[],
    exam_points: [] as string[],
  };

  const romanToNum: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Unit match: "Unit 1: Relational Algebra" or "MODULE 2: STACKS"
    const unitMatch = line.match(/^(?:unit|module|chapter)\s+([0-9ivx]+)[:\s\-]*(.*)$/i);
    if (unitMatch) {
      if (currentTopic.summary || currentTopic.definitions.length > 0) {
        currentUnit.topics.push({ ...currentTopic });
      }
      if (currentUnit.topics.length > 0) {
        units.push({ ...currentUnit });
      }

      const numStr = unitMatch[1].toLowerCase();
      const num = romanToNum[numStr] || parseInt(numStr, 10) || units.length + 1;
      const title = unitMatch[2]?.trim() || `Unit ${num}`;

      currentUnit = {
        unit_number: num,
        title: title || `Core Subject Area ${num}`,
        topics: [],
      };

      currentTopic = {
        title: title || 'Core Principles',
        summary: '',
        definitions: [],
        algorithms: [],
        formulas: [],
        exam_points: [],
      };
      continue;
    }

    // Topic match: "Topic: ...", "2.1 ...", bullet heading
    const topicMatch = line.match(/^(?:topic[:\s]+|\d+\.\d+\s+)(.*)$/i);
    if (topicMatch) {
      if (currentTopic.summary || currentTopic.definitions.length > 0) {
        currentUnit.topics.push({ ...currentTopic });
      }
      currentTopic = {
        title: topicMatch[1].trim(),
        summary: '',
        definitions: [],
        algorithms: [],
        formulas: [],
        exam_points: [],
      };
      continue;
    }

    // Definitions
    if (/^(definition|defined as|is termed as|is referred to as)/i.test(line) || line.includes('is defined as')) {
      currentTopic.definitions.push(line);
    }
    // Algorithms
    else if (/^(algorithm|step \d+|pseudocode)/i.test(line)) {
      currentTopic.algorithms.push(line);
    }
    // Formulas
    else if (/^(formula|equation|where\s+[a-z]\s*=)/i.test(line) || /[∑∫√=×÷±]/.test(line)) {
      currentTopic.formulas.push(line);
    }
    // Important Exam Points
    else if (/(important|note:|key takeaway|exam point|must remember)/i.test(line)) {
      currentTopic.exam_points.push(line);
    } else {
      if (currentTopic.summary.length < 500) {
        currentTopic.summary += (currentTopic.summary ? ' ' : '') + line;
      }
    }
  }

  // Push last items
  if (currentTopic.summary || currentTopic.definitions.length > 0) {
    currentUnit.topics.push(currentTopic);
  }
  if (currentUnit.topics.length > 0) {
    units.push(currentUnit);
  }

  // Fallback if no unit tags found
  if (units.length === 0) {
    units.push({
      unit_number: 1,
      title: 'Extracted Academic Concepts',
      topics: [
        {
          title: 'Core Fundamentals',
          summary: cleanText.slice(0, 400),
          definitions: ['Foundational concept extracted from uploaded material.'],
          algorithms: [],
          formulas: [],
          exam_points: ['Review key definitions and analytical applications.'],
        },
      ],
    });
  }

  return units;
}

// Persist extracted hierarchy to database for a subject
export async function saveExtractedHierarchyToDb(subjectId: string, units: ExtractedUnit[]): Promise<{ unitsAdded: number; topicsAdded: number }> {
  let unitsAdded = 0;
  let topicsAdded = 0;

  for (const u of units) {
    const unitId = `unt-up-${Date.now()}-${u.unit_number}-${Math.floor(Math.random() * 1000)}`;
    await run(
      `INSERT INTO units (id, subject_id, unit_number, title, description)
       VALUES (?, ?, ?, ?, ?)`,
      [unitId, subjectId, u.unit_number, u.title, `Unit automatically extracted from curriculum upload.`]
    );
    unitsAdded++;

    for (const t of u.topics) {
      const topicId = `top-up-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const summary = `${t.summary}. Definitions: ${t.definitions.join('; ')}. Points: ${t.exam_points.join('; ')}`.slice(0, 1000);
      await run(
        `INSERT INTO topics (id, unit_id, title, concepts_summary, importance, mastery_level)
         VALUES (?, ?, ?, ?, 'High', 50)`,
        [topicId, unitId, t.title, summary]
      );
      topicsAdded++;

      // Also create initial questions for this extracted topic
      const qId = `q-up-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      await run(
        `INSERT INTO questions (id, topic_id, unit_id, subject_id, question_text, question_type, difficulty, options_json, ideal_answer, key_concepts_json, rubric_json)
         VALUES (?, ?, ?, ?, ?, '5_marks', 'medium', NULL, ?, ?, 'Standard academic evaluation rubric')`,
        [
          qId,
          topicId,
          unitId,
          subjectId,
          `Explain the foundational concepts and applications of ${t.title}.`,
          `The concept of ${t.title} provides: ${summary || 'Structured system execution and reliability.'}`,
          JSON.stringify([t.title, 'System Design', 'Application Methodology']),
        ]
      );
    }
  }

  return { unitsAdded, topicsAdded };
}
