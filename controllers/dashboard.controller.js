const { getPool } = require('../config/db');
const sql = require('mssql');
const ProgressModel = require('../models/progress.model');
const UsersModel = require('../models/users.model');

class DashboardController {

  static async getOverview(req, res) {
    try {
      const userId = req.user.id;
      const pool = getPool();

      // Get all lesson progress for user
      const progressData = await ProgressModel.getProgressByUser(userId);
      const completedLessons = progressData.filter(p => p.is_completed).length;
      const viewedLessonIds = progressData.map(p => p.lesson_id);

      // Get exam submissions for user
      const subsResult = await pool.request()
        .input('user_id', sql.Int, userId)
        .query('SELECT es.*, e.title as exam_title, e.course_id FROM exam_submissions es JOIN exams e ON es.exam_id = e.id WHERE es.user_id = @user_id ORDER BY es.submitted_at DESC');
      const submissions = subsResult.recordset;
      const examsTaken = submissions.length;

      // Determine active courses (from lesson progress + submissions)
      const courseIdsFromProgress = new Set();
      if (viewedLessonIds.length > 0) {
        // Fetch lessons to get their course_ids
        const lessonsResult = await pool.request()
          .query('SELECT id, course_id FROM lessons');
        const allLessons = lessonsResult.recordset;
        allLessons.forEach(l => {
          if (viewedLessonIds.includes(l.id)) {
            courseIdsFromProgress.add(l.course_id);
          }
        });
      }
      submissions.forEach(s => courseIdsFromProgress.add(s.course_id));
      const activeCourses = courseIdsFromProgress.size;

      // Build latest activity
      const activities = [];
      progressData.forEach(p => {
        activities.push({
          type: p.is_completed ? 'completed' : 'viewed',
          label: p.is_completed ? 'أكملت درساً' : 'شاهدت درساً',
          timestamp: p.last_accessed
        });
      });
      submissions.forEach(s => {
        activities.push({
          type: 'exam',
          label: `قدّمت اختبار: ${s.exam_title} (${s.score}/${s.total_questions})`,
          timestamp: s.submitted_at
        });
      });
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.status(200).json({
        success: true,
        data: {
          activeCourses,
          completedLessons,
          examsTaken,
          latestActivity: activities.slice(0, 10)
        }
      });
    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getMyCourses(req, res) {
    try {
      const userId = req.user.id;
      const pool = getPool();

      // Get all lesson progress for user
      const progressData = await ProgressModel.getProgressByUser(userId);
      const viewedLessonIds = progressData.map(p => p.lesson_id);

      // Get exam submissions for course discovery
      const subsResult = await pool.request()
        .input('user_id', sql.Int, userId)
        .query('SELECT es.exam_id, e.course_id FROM exam_submissions es JOIN exams e ON es.exam_id = e.id WHERE es.user_id = @user_id');
      const submissions = subsResult.recordset;

      // All course IDs the student is active in
      const activeCourseIds = new Set();
      submissions.forEach(s => activeCourseIds.add(s.course_id));

      // Get all lessons to map lesson -> course
      const lessonsResult = await pool.request().query('SELECT id, course_id, title FROM lessons');
      const allLessons = lessonsResult.recordset;

      allLessons.forEach(l => {
        if (viewedLessonIds.includes(l.id)) {
          activeCourseIds.add(l.course_id);
        }
      });

      if (activeCourseIds.size === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      // Get all courses
      const coursesResult = await pool.request().query('SELECT * FROM courses');
      const allCourses = coursesResult.recordset;

      // Build enriched course list with progress
      const myCourses = [];
      for (const courseId of activeCourseIds) {
        const course = allCourses.find(c => c.id === courseId);
        if (!course) continue;

        const courseLessons = allLessons.filter(l => l.course_id === courseId);
        const totalLessons = courseLessons.length;

        const completedInCourse = courseLessons.filter(l => {
          const prog = progressData.find(p => p.lesson_id === l.id);
          return prog && prog.is_completed;
        }).length;

        const progress = totalLessons > 0
          ? Math.round((completedInCourse / totalLessons) * 100)
          : 0;

        // Find last accessed lesson in this course
        let lastLessonId = null;
        const courseProgress = progressData
          .filter(p => courseLessons.map(l => l.id).includes(p.lesson_id))
          .sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed));
        if (courseProgress.length > 0) lastLessonId = courseProgress[0].lesson_id;

        myCourses.push({
          ...course,
          totalLessons,
          completedLessons: completedInCourse,
          progress,
          lastLessonId
        });
      }

      res.status(200).json({ success: true, data: myCourses });
    } catch (error) {
      console.error('Dashboard courses error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getExamHistory(req, res) {
    try {
      const userId = req.user.id;
      const pool = getPool();

      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .query(`
          SELECT es.*, e.title as exam_title, e.course_id, c.title as course_title
          FROM exam_submissions es
          JOIN exams e ON es.exam_id = e.id
          JOIN courses c ON e.course_id = c.id
          WHERE es.user_id = @user_id
          ORDER BY es.submitted_at DESC
        `);

      const history = await Promise.all(result.recordset.map(async s => {
        // Fetch essay answers to determine grading status
        const essaysRes = await pool.request()
          .input('submission_id', sql.Int, s.id)
          .query('SELECT * FROM essay_answers WHERE submission_id = @submission_id');
        const essays = essaysRes.recordset;

        let gradingStatus = 'graded'; // assume graded unless proven pending
        let comments = [];

        if (essays.length > 0) {
          const gradedEssays = essays.filter(e => e.essay_score !== null);
          if (gradedEssays.length < essays.length) {
            gradingStatus = 'pending_review';
          }
          
          essays.forEach(e => {
            if (e.teacher_comment) {
              comments.push(e.teacher_comment);
            }
          });
        }

        return {
          id: s.id,
          exam_title: s.exam_title,
          course_title: s.course_title,
          score: s.score,
          total_questions: s.total_questions,
          submitted_at: s.submitted_at,
          passed: s.total_questions > 0 ? (s.score / s.total_questions) >= 0.5 : false,
          gradingStatus,
          teacherComments: comments
        };
      }));

      res.status(200).json({ success: true, data: history });
    } catch (error) {
      console.error('Dashboard exam history error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await UsersModel.getUserById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error('Dashboard profile error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name, email } = req.body;
      if (!full_name || !email) {
        return res.status(400).json({ success: false, message: 'الاسم والبريد الإلكتروني مطلوبان' });
      }
      const pool = getPool();
      await pool.request()
        .input('id', sql.Int, userId)
        .input('full_name', sql.NVarChar, full_name)
        .input('email', sql.NVarChar, email)
        .query('UPDATE users SET full_name = @full_name, email = @email WHERE id = @id');

      res.status(200).json({ success: true, message: 'تم تحديث الملف الشخصي بنجاح' });
    } catch (error) {
      console.error('Dashboard update profile error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = DashboardController;
