# SmartViva Examiner - Production-Ready AI Academic Examination Platform

SmartViva Examiner is an AI-powered practice and examination platform that functions as an intelligent university professor and rigorous digital examiner. Rather than simple question-answer matching, SmartViva evaluates conceptual understanding, identifies knowledge gaps, provides actionable feedback, and actively teaches after mistakes.

---

## 🌟 Key Highlights & Architectural Features

### 1. Dynamic Academic Hierarchy (Beyond SPPU 2025)
The platform is completely unconstrained by single university patterns:
- **Hierarchy:** `Pattern → Branch → Year/Semester → Subject → Unit → Topic`
- **Supported Academic Frameworks:**
  - **SPPU 2024 Pattern (NEP-2020 Aligned)**
  - **Autonomous Colleges Pattern** (COEP, VJTI, VIT, etc.)
  - **Polytechnic Diploma** (MSBTE I-Scheme)
  - **Degree Engineering** (National AICTE Model)
  - **MCA** (Master of Computer Applications)
  - **MBA** (Master of Business Administration)
  - **Custom Patterns** (Create any departmental/institutional structure via Admin Console)

### 2. Educational File Cleaner & Hierarchy Extractor
- **File Formats Supported:** PDF, DOCX, PPT/PPTX, TXT Notes, Question Banks.
- **Automated Boilerplate Stripping:** Automatically identifies and strips cover pages, faculty/professor names, college names, university headers, acknowledgments, certificates, signatures, copyright notices, indexes, and bibliographies.
- **Pure Concept Extraction:** Extracts syllabus units, topics, definitions, algorithms, formulas, and exam points, automatically linking them into the SQLite database.

### 3. Smart Question Flow Engine
- **2-Questions-Per-Unit Rule:** Asks exactly 2 questions from one unit, then automatically shifts to another unit.
- **Randomized Unit Traversal:** Unit order is randomized for every exam session (e.g. Unit 3 → Unit 1 → Unit 5).
- **Anti-Repetition:** Tracks past asked questions to avoid frequent repeats.

### 4. Hidden Unit System
- **During Question Presentation:** Only the question prompt is shown (e.g., *"Explain Normalization"*). The unit number and topic title are hidden to test independent conceptual recall.
- **After AI Evaluation:** Reveals: `Source: Unit 3, Topic: Normalization`.

### 5. AI Digital Examiner Modes
- **Voice Viva Mode:** Oral examination via microphone speech-to-text with Web Speech API and text-to-speech AI Professor readout.
- **MCQ Mode:** 4-choice conceptual dilemmas without obvious elimination tricks.
- **Descriptive Mode:** 2 Marks, 5 Marks, and 10 Marks university-style questions.
- **Mixed Mode:** Dynamic combination across all modes.

### 6. Strict Semantic Marking System (Zero Keyword Hacks)
- **Evaluation Parameters:**
  - Concept Accuracy %
  - Completeness %
  - Technical Correctness %
  - Relevance %
  - Real-World Examples & Algorithms Used
- **Marking Rules:**
  - **Correct Answer:** Full Marks
  - **Partially Correct:** Proportional to conceptual quality
  - **Incorrect Answer:** 0 Marks
  - **Unrelated / Off-Topic:** 0 Marks
  - **Random Text / Gibberish:** 0 Marks
  - **"I Don't Know":** 0 Marks
  - **No Grace Marks & No Participation Marks**

### 7. 6-Step Post-Mistake Tutoring (Learning Mode)
Triggered whenever a student scores 0, provides an incorrect answer, or clicks **"I Don't Know"**:
1. **Step 1:** Strict 0 Marks assigned and explained.
2. **Step 2:** Deep conceptual explanation of the underlying principle.
3. **Step 3:** Official university model answer.
4. **Step 4:** Intuitive real-world analogy.
5. **Step 5:** Memory trick / mnemonic.
6. **Step 6:** Interactive easier follow-up question verifying immediate recovery.

### 8. Mistakes Vault & Concept Mastery Tracker
- Stores past mistakes: Question, Student Answer, Ideal Answer, Feedback, Unit, Topic, Date.
- **Concept Mastery:** A concept is marked *Mastered* only after **3 consecutive correct answers** in revision exams.

### 9. Exam Readiness Score (0-100) & AI Study Planner
- **Readiness Meter:** Weighted calculation based on accuracy rate, study streak consistency, recent exam performance, and active mistakes penalty.
- **AI Study Planner:** Automatically schedules daily tasks using detected weak topics (e.g. *"Today: DBMS Unit 2"*, *"Tomorrow: DBMS Unit 5"*, *"Friday: CN Unit 3"*).

### 10. Gamification & Authentication
- **XP, Levels & Badges:** Century Club (100 correct), DBMS Master, 7-Day Streak, Oral Viva Ace, First Flight.
- **Authentication:** Email Registration, Email Login, Google Login, Forgot Password, and Instant Guest Mode (no PRN/ERP/university login).

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend:** Next.js Route Handlers (Node.js runtime).
- **Database:** SQLite with `sql.js` (WebAssembly SQLite, persistent durable file `smartviva.db`).
- **AI Engine:** Google Gemini API (`@google/generative-ai`) with built-in high-fidelity Semantic Evaluation & Tutoring Engine fallback.
- **Audio:** Web Speech API (`SpeechRecognition` & `SpeechSynthesis`).
- **Document Processing:** `pdf-parse`, `mammoth`.

---

## 🚀 Getting Started

### 1. Installation & Environment Setup
\`\`\`bash
cd smartviva-examiner
npm install
\`\`\`

### 2. Optional: Gemini API Key Configuration
Create a `.env.local` file to use online Gemini model:
\`\`\`env
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`
*(Note: If no key is set, the application automatically uses the built-in local semantic evaluation and tutoring engine with full functionality!)*

### 3. Run Automated Test Suite
\`\`\`bash
npx tsx test-runner.js
\`\`\`
*(Runs 39/39 automated verification checks)*

### 4. Run Development / Production Server
\`\`\`bash
# Production server
npm run build
npm start

# Or dev server
npm run dev
\`\`\`
Visit **http://localhost:3000** in your browser.

---

## 🏛️ Database Tables (SQLite)
- `users`: User profiles, XP, level, streak, guest flags.
- `patterns`: Dynamic university/institutional patterns.
- `branches`: Academic branches (Computer, AIDS, IT, MCA, etc.).
- `years`: Academic years & semesters.
- `subjects`: Courses with credits and syllabus links.
- `units`: Units (Unit 1 to Unit 6).
- `topics`: Granular academic concepts.
- `questions`: Question banks (Viva, MCQ, 2m, 5m, 10m).
- `exams`: Exam sessions with adaptive difficulty and scores.
- `exam_questions`: Per-question state with hidden unit masking.
- `answers`: Raw answers and voice transcripts.
- `feedback`: Detailed semantic scores, radar metrics, and model answers.
- `mistakes`: Revision mistakes vault with consecutive correct counter.
- `performance`: Aggregated accuracy, exam count, readiness metrics.
- `study_plans`: Auto-generated study schedule.
- `achievements`: Unlocked gamification badges and XP milestones.
