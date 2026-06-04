const { getPool } = require('../config/db');
const sql = require('mssql');

class AdminEssaysController {
  
  // GET /admin/essay-submissions
  static async getEssaySubmissions(req, res) {
    try {
      const pool = getPool();
      
      // Fetch submissions that have essay answers
      const result = await pool.request().query(`
        SELECT ea.submission_id, MAX(ea.graded_at) as last_graded_at,
               COUNT(*) as total_essays, 
               SUM(CASE WHEN ea.essay_score IS NOT NULL THEN 1 ELSE 0 END) as graded_essays
        FROM essay_answers ea
        GROUP BY ea.submission_id
      `);
      
      const essayGroups = result.recordset;

      // Now fetch details for each submission
      const submissions = await Promise.all(essayGroups.map(async (group) => {
        const subRes = await pool.request()
          .input('id', sql.Int, group.submission_id)
          .query('SELECT es.id, es.student_name, es.submitted_at, e.title as exam_title, c.title as course_title FROM exam_submissions es JOIN exams e ON es.exam_id = e.id JOIN courses c ON e.course_id = c.id WHERE es.id = @id');
        
        const subDetails = subRes.recordset[0];
        if (!subDetails) return null;

        return {
          id: subDetails.id,
          student_name: subDetails.student_name,
          exam_title: subDetails.exam_title,
          course_title: subDetails.course_title,
          submitted_at: subDetails.submitted_at,
          status: group.graded_essays === group.total_essays ? 'graded' : 'pending_review',
          total_essays: group.total_essays,
          graded_essays: group.graded_essays
        };
      }));

      const validSubmissions = submissions.filter(Boolean).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      res.status(200).json({ success: true, data: validSubmissions });
    } catch (error) {
      console.error('Error fetching essay submissions:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // GET /admin/essay-submissions/:id
  static async getEssaySubmissionById(req, res) {
    try {
      const { id } = req.params;
      const pool = getPool();

      // Get submission info
      const subRes = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT es.id, es.student_name, es.score as mcq_score, es.total_questions, es.submitted_at, e.title as exam_title, c.title as course_title FROM exam_submissions es JOIN exams e ON es.exam_id = e.id JOIN courses c ON e.course_id = c.id WHERE es.id = @id');
      const submission = subRes.recordset[0];

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }

      // Get essay answers
      const essaysRes = await pool.request()
        .input('submission_id', sql.Int, id)
        .query('SELECT ea.*, q.question_text FROM essay_answers ea JOIN questions q ON ea.question_id = q.id WHERE ea.submission_id = @submission_id');
      
      submission.essays = essaysRes.recordset;

      res.status(200).json({ success: true, data: submission });
    } catch (error) {
      console.error('Error fetching essay submission by ID:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  // PUT /admin/essay-submissions/:id/grade
  static async gradeEssay(req, res) {
    try {
      const { id } = req.params;
      const { grades } = req.body; // Array of { essay_answer_id, score, comment }
      const adminId = req.user ? req.user.id : null;

      const pool = getPool();

      let totalEssayScore = 0;

      for (let grade of grades) {
        const { essay_answer_id, score, comment } = grade;

        // Fetch max_score to validate
        const essayRes = await pool.request()
          .input('id', sql.Int, essay_answer_id)
          .query('SELECT max_score FROM essay_answers WHERE id = @id');
        
        const essay = essayRes.recordset[0];
        if (!essay) continue;

        let finalScore = score;
        if (finalScore < 0) finalScore = 0;
        if (finalScore > essay.max_score) finalScore = essay.max_score;

        totalEssayScore += finalScore;

        await pool.request()
          .input('id', sql.Int, essay_answer_id)
          .input('score', sql.Int, finalScore)
          .input('comment', sql.NVarChar, comment || null)
          .input('graded_by', sql.Int, adminId)
          .query(`
            UPDATE essay_answers 
            SET essay_score = @score, teacher_comment = @comment, graded_at = GETDATE(), graded_by = @graded_by
            WHERE id = @id
          `);
      }

      // We need to update the total score in exam_submissions.
      // Wait, the exam_submissions score currently holds the MCQ score.
      // The total score should be MCQ score + Total Essay Score.
      // Since MCQ score is calculated at submission, let's fetch the original MCQ score.
      // We can't simply add totalEssayScore to the current score because it might have been graded before.
      // We need to recalculate:
      // Wait, if it was graded before, adding totalEssayScore again would be wrong.
      // The easiest way is to recalculate the MCQ score, or store mcq_score separately.
      // Let's recalculate the entire score:
      const subRes = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT exam_id, answers_json FROM exam_submissions WHERE id = @id');
      const sub = subRes.recordset[0];

      let mcqScore = 0;
      if (sub) {
        const questionsRes = await pool.request()
          .input('exam_id', sql.Int, sub.exam_id)
          .query('SELECT * FROM questions WHERE exam_id = @exam_id');
        const questions = questionsRes.recordset;

        let parsedAnswers = {};
        try { parsedAnswers = typeof sub.answers_json === 'string' ? JSON.parse(sub.answers_json) : sub.answers_json; } catch (e) {}

        for (let q of questions) {
          if (q.question_type === 'mcq') {
            const studentAnswer = parsedAnswers[q.id];
            if (studentAnswer && studentAnswer === q.correct_answer) {
              mcqScore++;
            }
          }
        }

        // Add all graded essay scores
        const allEssaysRes = await pool.request()
          .input('submission_id', sql.Int, id)
          .query('SELECT SUM(essay_score) as total_essay_score FROM essay_answers WHERE submission_id = @submission_id');
        const allEssayScore = allEssaysRes.recordset[0]?.total_essay_score || 0;

        const newTotalScore = mcqScore + allEssayScore;

        await pool.request()
          .input('id', sql.Int, id)
          .input('score', sql.Int, newTotalScore)
          .query('UPDATE exam_submissions SET score = @score WHERE id = @id');
      }

      res.status(200).json({ success: true, message: 'تم حفظ التقييم بنجاح' });
    } catch (error) {
      console.error('Error grading essay:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = AdminEssaysController;
