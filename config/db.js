const sql = require('mssql');
require('dotenv').config();

let pool;
let isMockDB = false;

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockGrades = [
  { id: 1, name: 'الصف الأول', description: 'المرحلة الابتدائية الأولى' },
  { id: 2, name: 'الصف الثاني', description: 'المرحلة الابتدائية الثانية' },
];
const mockExams = [
  { id: 1, course_id: 1, title: 'اختبار أساسيات اللغة العربية', description: 'اختبار شامل لقياس مستوى الطالب في اللغة العربية.', time_limit: 30, created_at: new Date().toISOString() },
  { id: 2, course_id: 2, title: 'اختبار الرياضيات الأساسية', description: 'اختبار في العمليات الحسابية الأساسية.', time_limit: 20, created_at: new Date().toISOString() },
];
const mockQuestions = [
  { id: 1, exam_id: 1, question_text: 'ما هو أول حرف في الأبجدية العربية؟', question_type: 'mcq', option_a: 'ب', option_b: 'أ', option_c: 'ت', option_d: 'ث', correct_answer: 'B' },
  { id: 2, exam_id: 1, question_text: 'اكتب فقرة قصيرة عن أهمية اللغة العربية.', question_type: 'essay', option_a: null, option_b: null, option_c: null, option_d: null, correct_answer: null },
];
const mockSubmissions = [];
const mockLessonProgress = [];
const mockEssayAnswers = [];

// Hardcoded hash for 'admin123' using bcryptjs (salt rounds: 10)
const defaultAdminHash = '$2a$10$Ar7YRHSCvjUn6trFngRSduw12civCyP52zB7zLZ3PUnweb2S/M1MK'; 
const mockUsers = [
  { id: 1, full_name: 'مدير النظام', email: 'admin@lms.com', password_hash: defaultAdminHash, role: 'admin', status: 'approved', created_at: new Date('2025-01-01').toISOString() }
];

const mockCourses = [
  { id: 1, grade_id: 1, title: 'أساسيات اللغة العربية', description: 'دورة شاملة للمبتدئين.' },
  { id: 2, grade_id: 1, title: 'الرياضيات الأساسية', description: 'مقدمة في الأرقام والعمليات.' },
  { id: 3, grade_id: 2, title: 'المحادثة المتقدمة', description: 'تطوير مهارات التحدث.' },
];
const mockLessons = [
  { id: 1, course_id: 1, title: 'الدرس الأول: الحروف الأبجدية', video_url: 'https://www.youtube.com/watch?v=Scj34_nEnI4', pdf_url: null, order_index: 1 },
  { id: 2, course_id: 1, title: 'الدرس الثاني: الكلمات', video_url: 'https://www.youtube.com/watch?v=F3w2d-mH2V4', pdf_url: null, order_index: 2 },
  { id: 3, course_id: 2, title: 'الأرقام من 1 إلى 10', video_url: 'https://www.youtube.com/watch?v=Scj34_nEnI4', pdf_url: null, order_index: 1 },
];

// ─── Mock Request ────────────────────────────────────────────────────────────
class MockRequest {
  constructor() { this.inputs = {}; }
  input(name, type, value) { this.inputs[name] = value; return this; }

  async query(sqlStr) {
    const s = sqlStr.trim();

    // ══════════════════════════════════════════════════════════════════
    // DELETE handlers
    // ══════════════════════════════════════════════════════════════════

    if (s.startsWith('DELETE FROM grades')) {
      const idx = mockGrades.findIndex(g => String(g.id) === String(this.inputs.id));
      if (idx !== -1) mockGrades.splice(idx, 1);
      return { recordset: [] };
    }
    if (s.startsWith('DELETE FROM courses')) {
      const courseId = String(this.inputs.id);
      const idx = mockCourses.findIndex(c => String(c.id) === courseId);
      if (idx !== -1) {
        mockCourses.splice(idx, 1);
        // Cascade: remove all lessons belonging to this course
        for (let i = mockLessons.length - 1; i >= 0; i--) {
          if (String(mockLessons[i].course_id) === courseId) mockLessons.splice(i, 1);
        }
      }
      return { recordset: [] };
    }
    if (s.startsWith('DELETE FROM lessons')) {
      const idx = mockLessons.findIndex(l => String(l.id) === String(this.inputs.id));
      if (idx !== -1) mockLessons.splice(idx, 1);
      return { recordset: [] };
    }
    if (s.startsWith('DELETE FROM exams')) {
      const examId = String(this.inputs.id);
      const idx = mockExams.findIndex(e => String(e.id) === examId);
      if (idx !== -1) {
        mockExams.splice(idx, 1);
        // Cascade: remove related questions
        for (let i = mockQuestions.length - 1; i >= 0; i--) {
          if (String(mockQuestions[i].exam_id) === examId) mockQuestions.splice(i, 1);
        }
      }
      return { recordset: [] };
    }
    if (s.startsWith('DELETE FROM questions')) {
      const idx = mockQuestions.findIndex(q => String(q.id) === String(this.inputs.id));
      if (idx !== -1) mockQuestions.splice(idx, 1);
      return { recordset: [] };
    }

    // ══════════════════════════════════════════════════════════════════
    // UPDATE handlers
    // ══════════════════════════════════════════════════════════════════

    if (s.startsWith('UPDATE grades')) {
      const grade = mockGrades.find(g => String(g.id) === String(this.inputs.id));
      if (grade) {
        if (this.inputs.name !== undefined) grade.name = this.inputs.name;
        if (this.inputs.description !== undefined) grade.description = this.inputs.description;
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE courses')) {
      const course = mockCourses.find(c => String(c.id) === String(this.inputs.id));
      if (course) {
        if (this.inputs.title !== undefined) course.title = this.inputs.title;
        if (this.inputs.description !== undefined) course.description = this.inputs.description;
        if (this.inputs.grade_id !== undefined) course.grade_id = this.inputs.grade_id;
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE lessons')) {
      const lesson = mockLessons.find(l => String(l.id) === String(this.inputs.id));
      if (lesson) {
        if (this.inputs.course_id !== undefined) lesson.course_id = this.inputs.course_id;
        if (this.inputs.title !== undefined) lesson.title = this.inputs.title;
        if (this.inputs.video_url !== undefined) lesson.video_url = this.inputs.video_url;
        if (this.inputs.pdf_url !== undefined) lesson.pdf_url = this.inputs.pdf_url;
        if (this.inputs.order_index !== undefined) lesson.order_index = this.inputs.order_index;
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE exams')) {
      const exam = mockExams.find(e => String(e.id) === String(this.inputs.id));
      if (exam) {
        if (this.inputs.course_id !== undefined) exam.course_id = this.inputs.course_id;
        if (this.inputs.title !== undefined) exam.title = this.inputs.title;
        if (this.inputs.description !== undefined) exam.description = this.inputs.description;
        if (this.inputs.time_limit !== undefined) exam.time_limit = this.inputs.time_limit;
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE questions')) {
      const q = mockQuestions.find(q => String(q.id) === String(this.inputs.id));
      if (q) {
        if (this.inputs.question_text !== undefined) q.question_text = this.inputs.question_text;
        if (this.inputs.question_type !== undefined) q.question_type = this.inputs.question_type;
        if (this.inputs.option_a !== undefined) q.option_a = this.inputs.option_a;
        if (this.inputs.option_b !== undefined) q.option_b = this.inputs.option_b;
        if (this.inputs.option_c !== undefined) q.option_c = this.inputs.option_c;
        if (this.inputs.option_d !== undefined) q.option_d = this.inputs.option_d;
        if (this.inputs.correct_answer !== undefined) q.correct_answer = this.inputs.correct_answer;
      }
      return { recordset: [] };
    }
    if (s.includes('UPDATE exam_submissions') && s.includes('score = @score')) {
      const sub = mockSubmissions.find(s => String(s.id) === String(this.inputs.id));
      if (sub) sub.score = this.inputs.score;
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE exam_submissions')) {
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE essay_answers')) {
      const ans = mockEssayAnswers.find(a => String(a.id) === String(this.inputs.id));
      if (ans) {
        ans.essay_score = this.inputs.essay_score;
        ans.teacher_comment = this.inputs.teacher_comment;
        ans.graded_at = this.inputs.graded_at || new Date().toISOString();
        ans.graded_by = this.inputs.graded_by;
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE lesson_progress')) {
      const prog = mockLessonProgress.find(p => p.user_id == this.inputs.user_id && p.lesson_id == this.inputs.lesson_id);
      if (prog) {
        prog.is_completed = this.inputs.is_completed !== undefined ? this.inputs.is_completed : prog.is_completed;
        prog.last_accessed = new Date().toISOString();
      }
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE users') && s.includes('status')) {
      const user = mockUsers.find(u => String(u.id) === String(this.inputs.id));
      if (user && this.inputs.status) user.status = this.inputs.status;
      return { recordset: [] };
    }
    if (s.startsWith('UPDATE users')) {
      const user = mockUsers.find(u => String(u.id) === String(this.inputs.id));
      if (user) {
        if (this.inputs.full_name) user.full_name = this.inputs.full_name;
        if (this.inputs.email) user.email = this.inputs.email;
      }
      return { recordset: [] };
    }

    // ══════════════════════════════════════════════════════════════════
    // INSERT handlers
    // ══════════════════════════════════════════════════════════════════

    if (s.includes('INSERT INTO grades')) {
      const id = Date.now();
      mockGrades.push({ id, name: this.inputs.name, description: this.inputs.description });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO courses')) {
      const id = Date.now();
      mockCourses.push({ id, grade_id: this.inputs.grade_id, title: this.inputs.title, description: this.inputs.description });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO lessons')) {
      const id = Date.now();
      mockLessons.push({ id, course_id: this.inputs.course_id, title: this.inputs.title, video_url: this.inputs.video_url, pdf_url: this.inputs.pdf_url || null, order_index: this.inputs.order_index });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO exams')) {
      const id = Date.now();
      mockExams.push({ id, course_id: this.inputs.course_id, title: this.inputs.title, description: this.inputs.description, time_limit: this.inputs.time_limit, created_at: new Date().toISOString() });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO questions')) {
      const id = Date.now();
      mockQuestions.push({
        id,
        exam_id: this.inputs.exam_id,
        question_text: this.inputs.question_text,
        question_type: this.inputs.question_type,
        option_a: this.inputs.option_a,
        option_b: this.inputs.option_b,
        option_c: this.inputs.option_c,
        option_d: this.inputs.option_d,
        correct_answer: this.inputs.correct_answer
      });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO exam_submissions')) {
      const id = Date.now();
      mockSubmissions.push({
        id,
        exam_id: this.inputs.exam_id,
        user_id: this.inputs.user_id || null,
        student_name: this.inputs.student_name,
        score: this.inputs.score,
        total_questions: this.inputs.total_questions,
        answers_json: this.inputs.answers_json,
        submitted_at: new Date().toISOString()
      });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO essay_answers')) {
      const id = Date.now();
      mockEssayAnswers.push({
        id,
        submission_id: this.inputs.submission_id,
        question_id: this.inputs.question_id,
        student_answer: this.inputs.student_answer,
        essay_score: this.inputs.essay_score || null,
        max_score: this.inputs.max_score,
        teacher_comment: this.inputs.teacher_comment || null,
        graded_at: this.inputs.graded_at || null,
        graded_by: this.inputs.graded_by || null
      });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO lesson_progress')) {
      const id = Date.now();
      mockLessonProgress.push({
        id,
        user_id: this.inputs.user_id,
        lesson_id: this.inputs.lesson_id,
        is_completed: this.inputs.is_completed || 0,
        last_accessed: new Date().toISOString()
      });
      return { recordset: [{ id }] };
    }
    if (s.includes('INSERT INTO users')) {
      const id = Date.now();
      mockUsers.push({
        id,
        full_name: this.inputs.full_name,
        email: this.inputs.email,
        password_hash: this.inputs.password_hash,
        role: this.inputs.role || 'student',
        status: this.inputs.status || 'pending',
        created_at: new Date().toISOString()
      });
      return { recordset: [{ id }] };
    }

    // ══════════════════════════════════════════════════════════════════
    // SELECT handlers
    // ══════════════════════════════════════════════════════════════════

    // ── GRADES ──
    if (s.includes('FROM grades') && s.includes('WHERE id = @id')) {
      const g = mockGrades.find(g => String(g.id) === String(this.inputs.id));
      return { recordset: g ? [g] : [] };
    }
    if (s.includes('FROM grades')) {
      return { recordset: [...mockGrades] };
    }

    // ── COURSES ──
    if (s.includes('FROM courses') && s.includes('WHERE id = @id')) {
      const c = mockCourses.find(c => String(c.id) === String(this.inputs.id));
      return { recordset: c ? [c] : [] };
    }
    if (s.includes('FROM courses') && s.includes('WHERE grade_id = @grade_id')) {
      return { recordset: mockCourses.filter(c => String(c.grade_id) === String(this.inputs.grade_id)) };
    }
    if (s.includes('FROM courses') && s.includes('WHERE c.grade_id = @grade_id')) {
      return { recordset: mockCourses.filter(c => String(c.grade_id) === String(this.inputs.grade_id)) };
    }
    if (s.includes('FROM courses c') && s.includes('@gradeId')) {
      return { recordset: mockCourses.filter(c => String(c.grade_id) === String(this.inputs.gradeId)) };
    }
    if (s.includes('SELECT id, course_id FROM lessons') || s.includes('SELECT id, course_id, title FROM lessons')) {
      return { recordset: mockLessons.map(l => ({ id: l.id, course_id: l.course_id, title: l.title })) };
    }
    if (s.includes('SELECT * FROM courses')) {
      return { recordset: [...mockCourses] };
    }
    if (s.includes('FROM courses')) {
      return { recordset: [...mockCourses] };
    }

    // ── LESSONS ──
    if (s.includes('FROM lessons') && s.includes('WHERE id = @id')) {
      const l = mockLessons.find(l => String(l.id) === String(this.inputs.id));
      return { recordset: l ? [l] : [] };
    }
    if (s.includes('FROM lessons') && (s.includes('WHERE course_id') || s.includes('course_id = @course_id'))) {
      return { recordset: mockLessons.filter(l => String(l.course_id) === String(this.inputs.course_id)).sort((a, b) => a.order_index - b.order_index) };
    }
    if (s.includes('SELECT * FROM lessons')) {
      return { recordset: [...mockLessons] };
    }
    if (s.includes('FROM lessons')) {
      return { recordset: [...mockLessons] };
    }

    // ── EXAMS ──
    if (s.includes('FROM exams') && s.includes('WHERE id = @id')) {
      const e = mockExams.find(e => String(e.id) === String(this.inputs.id));
      return { recordset: e ? [e] : [] };
    }
    if (s.includes('FROM exams') && s.includes('WHERE course_id = @course_id')) {
      return { recordset: mockExams.filter(e => String(e.course_id) === String(this.inputs.course_id)) };
    }
    if (s.includes('FROM exams')) {
      return { recordset: [...mockExams] };
    }

    // ── QUESTIONS ──
    if (s.includes('FROM questions') && s.includes('WHERE id = @id')) {
      const q = mockQuestions.find(q => String(q.id) === String(this.inputs.id));
      return { recordset: q ? [q] : [] };
    }
    if (s.includes('FROM questions') && s.includes('WHERE exam_id = @exam_id')) {
      return { recordset: mockQuestions.filter(q => String(q.exam_id) === String(this.inputs.exam_id)) };
    }
    if (s.includes('FROM questions')) {
      return { recordset: [...mockQuestions] };
    }

    // ── SUBMISSIONS ──
    if (s.includes('FROM exam_submissions') && s.includes('JOIN exams') && s.includes('WHERE es.id = @id')) {
      const sub = mockSubmissions.find(sub => String(sub.id) === String(this.inputs.id));
      if (!sub) return { recordset: [] };
      const exam = mockExams.find(e => String(e.id) === String(sub.exam_id));
      const course = mockCourses.find(c => String(c.id) === String(exam ? exam.course_id : null));
      return { recordset: [{ id: sub.id, student_name: sub.student_name, mcq_score: sub.score, total_questions: sub.total_questions, submitted_at: sub.submitted_at, exam_title: exam ? exam.title : '', course_title: course ? course.title : '' }] };
    }
    if (s.includes('FROM exam_submissions es') && s.includes('JOIN courses c')) {
      const results = mockSubmissions.filter(sub => String(sub.user_id) === String(this.inputs.user_id)).map(sub => {
        const exam = mockExams.find(e => String(e.id) === String(sub.exam_id)) || {};
        const course = mockCourses.find(c => String(c.id) === String(exam.course_id)) || {};
        return { ...sub, exam_title: exam.title, course_id: exam.course_id, course_title: course.title };
      });
      return { recordset: results };
    }
    if (s.includes('FROM exam_submissions') && s.includes('JOIN exams')) {
      const results = mockSubmissions.filter(sub => String(sub.user_id) === String(this.inputs.user_id)).map(sub => {
        const exam = mockExams.find(e => String(e.id) === String(sub.exam_id)) || {};
        return { ...sub, exam_title: exam.title, course_id: exam.course_id };
      });
      return { recordset: results };
    }
    if (s.includes('FROM exam_submissions') && s.includes('WHERE exam_id = @exam_id')) {
      return { recordset: mockSubmissions.filter(sub => String(sub.exam_id) === String(this.inputs.exam_id)) };
    }

    // ── ESSAY ANSWERS ──
    if (s.includes('SELECT SUM(essay_score)') && s.includes('FROM essay_answers')) {
      const results = mockEssayAnswers.filter(e => String(e.submission_id) === String(this.inputs.submission_id) && e.essay_score !== null);
      const sum = results.reduce((a, b) => a + b.essay_score, 0);
      return { recordset: [{ total_essay_score: sum }] };
    }
    if (s.includes('GROUP BY') && s.includes('essay_answers')) {
      const submissionsWithEssays = new Set(mockEssayAnswers.map(e => String(e.submission_id)));
      const results = Array.from(submissionsWithEssays).map(subId => {
        const essays = mockEssayAnswers.filter(e => String(e.submission_id) === subId);
        const gradedCount = essays.filter(e => e.essay_score !== null).length;
        return { submission_id: subId, last_graded_at: essays[0].graded_at, total_essays: essays.length, graded_essays: gradedCount };
      });
      return { recordset: results };
    }
    if (s.includes('FROM essay_answers') && s.includes('WHERE submission_id = @submission_id')) {
      if (s.includes('JOIN questions')) {
        const results = mockEssayAnswers.filter(ans => String(ans.submission_id) === String(this.inputs.submission_id)).map(ans => {
          const q = mockQuestions.find(q => String(q.id) === String(ans.question_id));
          return { ...ans, question_text: q ? q.question_text : '' };
        });
        return { recordset: results };
      }
      return { recordset: mockEssayAnswers.filter(ans => String(ans.submission_id) === String(this.inputs.submission_id)) };
    }
    if (s.includes('FROM essay_answers') && s.includes('WHERE id = @id')) {
      const result = mockEssayAnswers.find(ans => String(ans.id) === String(this.inputs.id));
      return { recordset: result ? [result] : [] };
    }

    // ── LESSON PROGRESS ──
    if (s.includes('FROM lesson_progress') && s.includes('WHERE user_id = @user_id') && s.includes('AND lesson_id = @lesson_id')) {
      const progress = mockLessonProgress.find(p => String(p.user_id) === String(this.inputs.user_id) && String(p.lesson_id) === String(this.inputs.lesson_id));
      return { recordset: progress ? [progress] : [] };
    }
    if (s.includes('FROM lesson_progress') && s.includes('WHERE user_id = @user_id')) {
      return { recordset: mockLessonProgress.filter(p => String(p.user_id) === String(this.inputs.user_id)) };
    }

    // ── USERS ──
    if (s.includes('SELECT') && s.includes('FROM users') && s.includes('WHERE role') && s.includes('status = @status')) {
      const students = mockUsers.filter(u => u.role !== 'admin' && u.status === this.inputs.status);
      return { recordset: students.map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, status: u.status || 'approved', created_at: u.created_at || new Date().toISOString() })) };
    }
    if (s.includes('SELECT') && s.includes('FROM users') && s.includes('WHERE role')) {
      const students = mockUsers.filter(u => u.role !== 'admin');
      return { recordset: students.map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, status: u.status || 'approved', created_at: u.created_at || new Date().toISOString() })) };
    }
    if (s.includes('SELECT COUNT') && s.includes('FROM users')) {
      const count = mockUsers.filter(u => u.role !== 'admin').length;
      return { recordset: [{ total: count }] };
    }
    if (s.includes('SELECT COUNT') && s.includes('FROM lesson_progress')) {
      if (this.inputs.user_id) {
        const count = mockLessonProgress.filter(p => String(p.user_id) === String(this.inputs.user_id) && p.is_completed).length;
        return { recordset: [{ total: count }] };
      }
      const count = mockLessonProgress.filter(p => p.is_completed).length;
      return { recordset: [{ total: count }] };
    }
    if (s.includes('SELECT COUNT') && s.includes('FROM exam_submissions')) {
      return { recordset: [{ total: mockSubmissions.length }] };
    }
    if (s.includes('FROM users') && s.includes('WHERE email = @email')) {
      const user = mockUsers.find(u => u.email === this.inputs.email);
      return { recordset: user ? [{ ...user, status: user.status || 'approved' }] : [] };
    }
    if (s.includes('FROM users') && s.includes('WHERE id = @id')) {
      const user = mockUsers.find(u => String(u.id) === String(this.inputs.id));
      return { recordset: user ? [{ ...user, status: user.status || 'approved' }] : [] };
    }

    // ── FALLBACK ──
    return { recordset: [] };
  }
}

class MockPool {
  request() { return new MockRequest(); }
}

// ─── Real DB Init ─────────────────────────────────────────────────────────────
async function initDB() {
  try {
    const dbName = process.env.DB_DATABASE;
    const masterConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: 'master',
      port: parseInt(process.env.DB_PORT || '1433'),
      options: { encrypt: true, trustServerCertificate: true }
    };

    let masterPool = await sql.connect(masterConfig);
    const dbCheck = await masterPool.request()
      .input('dbName', sql.NVarChar, dbName)
      .query(`SELECT name FROM master.sys.databases WHERE name = @dbName`);

    if (dbCheck.recordset.length === 0) {
      await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
      console.log(`Database '${dbName}' created.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
    await masterPool.close();

    const appConfig = { ...masterConfig, database: dbName };
    pool = await sql.connect(appConfig);
    console.log(`Connected to SQL Server database '${dbName}'.`);

    // grades table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='grades' AND xtype='U')
      CREATE TABLE grades (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX)
      );
    `);
    console.log("Table 'grades' ready.");

    // courses table (with grade_id)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='courses' AND xtype='U')
      CREATE TABLE courses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        grade_id INT,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL
      );
    `);
    // Add grade_id column if it doesn't exist (migration for existing installs)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('courses') AND name = 'grade_id')
      ALTER TABLE courses ADD grade_id INT NULL;
    `);
    console.log("Table 'courses' ready.");

    // lessons table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lessons' AND xtype='U')
      CREATE TABLE lessons (
        id INT IDENTITY(1,1) PRIMARY KEY,
        course_id INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        video_url NVARCHAR(MAX) NOT NULL,
        pdf_url NVARCHAR(MAX) NULL,
        order_index INT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);
    // Add pdf_url column if it doesn't exist (migration for existing installs)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('lessons') AND name = 'pdf_url')
      ALTER TABLE lessons ADD pdf_url NVARCHAR(MAX) NULL;
    `);
    console.log("Table 'lessons' ready.");

    // exams table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exams' AND xtype='U')
      CREATE TABLE exams (
        id INT IDENTITY(1,1) PRIMARY KEY,
        course_id INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        time_limit INT,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);
    console.log("Table 'exams' ready.");

    // questions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
      CREATE TABLE questions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        question_text NVARCHAR(MAX) NOT NULL,
        question_type NVARCHAR(50) NOT NULL, -- 'mcq' or 'essay'
        option_a NVARCHAR(MAX),
        option_b NVARCHAR(MAX),
        option_c NVARCHAR(MAX),
        option_d NVARCHAR(MAX),
        correct_answer NVARCHAR(10),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
      );
    `);
    console.log("Table 'questions' ready.");

    // exam_submissions table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='exam_submissions' AND xtype='U')
      CREATE TABLE exam_submissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        exam_id INT NOT NULL,
        user_id INT NULL,
        student_name NVARCHAR(255) NOT NULL,
        score INT NOT NULL,
        total_questions INT NOT NULL,
        answers_json NVARCHAR(MAX),
        submitted_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
      );
    `);
    console.log("Table 'exam_submissions' ready.");

    // users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) DEFAULT 'student',
        created_at DATETIME DEFAULT GETDATE()
      );
    `);
    console.log("Table 'users' ready.");

    // lesson_progress table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lesson_progress' AND xtype='U')
      CREATE TABLE lesson_progress (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        is_completed BIT DEFAULT 0,
        last_accessed DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE (user_id, lesson_id)
      );
    `);
    console.log("Table 'lesson_progress' ready.");

  } catch (error) {
    console.warn('⚠️ WARNING: Failed to connect to SQL Server. Falling back to in-memory Mock Database for development.');
    isMockDB = true;
    pool = new MockPool();
  }
}

function getPool() {
  if (!pool) throw new Error('Database pool not initialized. Call initDB first.');
  return pool;
}

module.exports = { initDB, getPool };
