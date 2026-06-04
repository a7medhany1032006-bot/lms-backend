const { getPool } = require('../config/db');
const sql = require('mssql');
const UsersModel = require('../models/users.model');

class AdminStudentsController {

  // GET /admin/students — list all students with enriched stats
  static async getStudents(req, res) {
    try {
      const pool = getPool();

      // Fetch all non-admin users
      const usersResult = await pool.request()
        .query(`SELECT id, full_name, email, role, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC`);
      const students = usersResult.recordset;

      if (students.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      // For each student, compute enriched stats from mock data
      const enriched = await Promise.all(students.map(async (s) => {
        const progressResult = await pool.request()
          .input('user_id', sql.Int, s.id)
          .query('SELECT COUNT(*) as total FROM lesson_progress WHERE user_id = @user_id AND is_completed = 1');
        const completedLessons = progressResult.recordset[0]?.total || 0;

        const subsResult = await pool.request()
          .input('user_id', sql.Int, s.id)
          .query('SELECT es.score, es.total_questions, es.submitted_at FROM exam_submissions es WHERE es.user_id = @user_id ORDER BY es.submitted_at DESC');
        const submissions = subsResult.recordset;
        const examsTaken = submissions.length;
        const avgScore = examsTaken > 0
          ? Math.round(submissions.reduce((sum, sub) => sum + (sub.total_questions > 0 ? (sub.score / sub.total_questions) * 100 : 0), 0) / examsTaken)
          : null;

        // Active courses from lesson_progress
        const progResult = await pool.request()
          .input('user_id', sql.Int, s.id)
          .query('SELECT lesson_id, last_accessed FROM lesson_progress WHERE user_id = @user_id ORDER BY last_accessed DESC');
        const progressRows = progResult.recordset;

        // Map lessons to courses
        const lessonsResult = await pool.request()
          .query('SELECT id, course_id FROM lessons');
        const allLessons = lessonsResult.recordset;
        const activeCourseIds = new Set(
          progressRows.map(p => allLessons.find(l => l.id === p.lesson_id)?.course_id).filter(Boolean)
        );

        // Also count from exam submissions
        const examSubsResult = await pool.request()
          .input('user_id', sql.Int, s.id)
          .query('SELECT e.course_id FROM exam_submissions es JOIN exams e ON es.exam_id = e.id WHERE es.user_id = @user_id');
        examSubsResult.recordset.forEach(r => r.course_id && activeCourseIds.add(r.course_id));

        const lastActivity = progressRows[0]?.last_accessed || submissions[0]?.submitted_at || null;

        return {
          ...s,
          completedLessons,
          examsTaken,
          avgScore,
          activeCourses: activeCourseIds.size,
          lastActivity
        };
      }));

      res.status(200).json({ success: true, data: enriched });
    } catch (error) {
      console.error('Admin students list error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/students/overview — platform-wide stats
  static async getOverview(req, res) {
    try {
      const pool = getPool();

      const usersResult = await pool.request()
        .query(`SELECT COUNT(*) as total FROM users WHERE role != 'admin'`);
      const totalStudents = usersResult.recordset[0]?.total || 0;

      const activeResult = await pool.request()
        .query('SELECT COUNT(DISTINCT user_id) as total FROM lesson_progress');
      const activeStudents = activeResult.recordset[0]?.total || 0;

      const examsResult = await pool.request()
        .query('SELECT COUNT(*) as total FROM exam_submissions');
      const totalExamAttempts = examsResult.recordset[0]?.total || 0;

      const lessonsResult = await pool.request()
        .query('SELECT COUNT(*) as total FROM lesson_progress WHERE is_completed = 1');
      const totalCompletedLessons = lessonsResult.recordset[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: { totalStudents, activeStudents, totalExamAttempts, totalCompletedLessons }
      });
    } catch (error) {
      console.error('Admin overview error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/students/:id — single student full detail
  static async getStudentById(req, res) {
    try {
      const { id } = req.params;
      const pool = getPool();

      const userResult = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT id, full_name, email, role, created_at FROM users WHERE id = @id');
      const student = userResult.recordset[0];
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

      res.status(200).json({ success: true, data: student });
    } catch (error) {
      console.error('Admin student detail error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/students/:id/progress — lesson progress for student
  static async getStudentProgress(req, res) {
    try {
      const { id } = req.params;
      const pool = getPool();

      // Get lesson progress
      const progressResult = await pool.request()
        .input('user_id', sql.Int, id)
        .query('SELECT * FROM lesson_progress WHERE user_id = @user_id ORDER BY last_accessed DESC');
      const progressRows = progressResult.recordset;

      // Get all lessons and courses
      const lessonsResult = await pool.request().query('SELECT id, course_id, title FROM lessons');
      const coursesResult = await pool.request().query('SELECT * FROM courses');
      const allLessons = lessonsResult.recordset;
      const allCourses = coursesResult.recordset;

      // Group by course
      const courseMap = {};
      progressRows.forEach(p => {
        const lesson = allLessons.find(l => l.id === p.lesson_id);
        if (!lesson) return;
        const courseId = lesson.course_id;
        if (!courseMap[courseId]) {
          const course = allCourses.find(c => c.id === courseId) || {};
          const totalLessonsInCourse = allLessons.filter(l => l.course_id === courseId).length;
          courseMap[courseId] = {
            course_id: courseId,
            course_title: course.title || 'دورة غير معروفة',
            totalLessons: totalLessonsInCourse,
            completedLessons: 0,
            lessons: []
          };
        }
        courseMap[courseId].lessons.push({
          lesson_id: p.lesson_id,
          lesson_title: lesson.title,
          is_completed: p.is_completed,
          last_accessed: p.last_accessed
        });
        if (p.is_completed) courseMap[courseId].completedLessons++;
      });

      const courses = Object.values(courseMap).map(c => ({
        ...c,
        progress: c.totalLessons > 0 ? Math.round((c.completedLessons / c.totalLessons) * 100) : 0
      }));

      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      console.error('Admin student progress error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/students/:id/exams — exam submissions for student
  static async getStudentExams(req, res) {
    try {
      const { id } = req.params;
      const pool = getPool();

      const subsResult = await pool.request()
        .input('user_id', sql.Int, id)
        .query(`
          SELECT es.*, e.title as exam_title, e.course_id, c.title as course_title
          FROM exam_submissions es
          JOIN exams e ON es.exam_id = e.id
          JOIN courses c ON e.course_id = c.id
          WHERE es.user_id = @user_id
          ORDER BY es.submitted_at DESC
        `);

      const exams = subsResult.recordset.map(s => {
        let essayAnswers = [];
        try {
          const answers = typeof s.answers_json === 'string' ? JSON.parse(s.answers_json) : s.answers_json;
          // We would need questions to parse essay answers — handled below
          essayAnswers = answers;
        } catch { essayAnswers = {}; }

        return {
          id: s.id,
          exam_id: s.exam_id,
          exam_title: s.exam_title,
          course_title: s.course_title,
          score: s.score,
          total_questions: s.total_questions,
          submitted_at: s.submitted_at,
          passed: s.total_questions > 0 ? (s.score / s.total_questions) >= 0.5 : false,
          answers_json: essayAnswers
        };
      });

      res.status(200).json({ success: true, data: exams });
    } catch (error) {
      console.error('Admin student exams error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/students/pending — list students awaiting approval
  static async getPendingStudents(req, res) {
    try {
      const pool = getPool();
      const result = await pool.request()
        .input('status', sql.NVarChar, 'pending')
        .query(`SELECT id, full_name, email, role, status, created_at FROM users WHERE role != 'admin' AND status = @status ORDER BY created_at DESC`);
      res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
      console.error('Pending students error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // PUT /admin/students/:id/approve
  static async approveStudent(req, res) {
    try {
      const { id } = req.params;
      await UsersModel.updateStatus(parseInt(id), 'approved');
      res.status(200).json({ success: true, message: 'تمت الموافقة على الطالب بنجاح' });
    } catch (error) {
      console.error('Approve student error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // PUT /admin/students/:id/reject
  static async rejectStudent(req, res) {
    try {
      const { id } = req.params;
      await UsersModel.updateStatus(parseInt(id), 'rejected');
      res.status(200).json({ success: true, message: 'تم رفض الطالب' });
    } catch (error) {
      console.error('Reject student error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = AdminStudentsController;
