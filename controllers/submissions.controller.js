const SubmissionsModel = require('../models/submissions.model');
const QuestionsModel = require('../models/questions.model');
const ExamsModel = require('../models/exams.model');

class SubmissionsController {
  static async submitExam(req, res) {
    try {
      const { examId } = req.params;
      let { student_name, answers } = req.body;

      if (!student_name || !student_name.trim()) {
        if (req.user && req.user.full_name) {
          student_name = req.user.full_name;
        } else {
          return res.status(400).json({ success: false, message: 'student_name is required' });
        }
      }

      const exam = await ExamsModel.getExamById(examId);
      if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

      const questions = await QuestionsModel.getQuestionsByExamId(examId);
      
      let score = 0;
      let total_questions = questions.length; // Total includes essay, but we score only MCQ

      for (let q of questions) {
        if (q.question_type === 'mcq') {
          const studentAnswer = answers[q.id];
          if (studentAnswer && studentAnswer === q.correct_answer) {
            score++;
          }
        }
      }

      const submissionId = await SubmissionsModel.createSubmission({
        exam_id: parseInt(examId),
        user_id: req.user ? req.user.id : null,
        student_name: student_name.trim(),
        score,
        total_questions,
        answers_json: answers || {}
      });

      // Insert essay answers
      const { getPool } = require('../config/db');
      const sql = require('mssql');
      const pool = getPool();
      
      for (let q of questions) {
        if (q.question_type === 'essay') {
          const studentAnswer = answers[q.id];
          if (studentAnswer) {
            await pool.request()
              .input('submission_id', sql.Int, submissionId)
              .input('question_id', sql.Int, q.id)
              .input('student_answer', sql.NVarChar, studentAnswer)
              .input('max_score', sql.Int, q.max_score || 5) // default max_score to 5 if not set
              .query(`
                INSERT INTO essay_answers (submission_id, question_id, student_answer, max_score)
                VALUES (@submission_id, @question_id, @student_answer, @max_score)
              `);
          }
        }
      }

      res.status(201).json({ 
        success: true, 
        message: 'Exam submitted successfully', 
        data: { submissionId, score, total_questions }
      });
    } catch (error) {
      console.error('Error submitting exam:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getSubmissions(req, res) {
    try {
      const { examId } = req.params;
      const submissions = await SubmissionsModel.getSubmissionsByExamId(examId);
      const questions = await QuestionsModel.getQuestionsByExamId(examId);

      const { getPool } = require('../config/db');
      const pool = getPool();
      const sql = require('mssql');

      const enrichedSubmissions = await Promise.all(submissions.map(async sub => {
        let parsedAnswers = {};
        try {
          parsedAnswers = typeof sub.answers_json === 'string' ? JSON.parse(sub.answers_json) : sub.answers_json;
        } catch (e) {
          parsedAnswers = {};
        }

        // Fetch graded essay answers for this submission
        const essaysResult = await pool.request()
          .input('submission_id', sql.Int, sub.id)
          .query('SELECT * FROM essay_answers WHERE submission_id = @submission_id');
        const essays = essaysResult.recordset;

        const essay_answers = questions
          .filter(q => q.question_type === 'essay')
          .map(q => {
            const gradedEssay = essays.find(e => e.question_id === q.id);
            return {
              question_id: q.id,
              question_text: q.question_text,
              student_answer: parsedAnswers[q.id] || 'لم يجب',
              essay_score: gradedEssay ? gradedEssay.essay_score : null,
              max_score: gradedEssay ? gradedEssay.max_score : (q.max_score || 5),
              teacher_comment: gradedEssay ? gradedEssay.teacher_comment : null,
              graded_at: gradedEssay ? gradedEssay.graded_at : null
            };
          });

        return {
          ...sub,
          essay_answers
        };
      }));

      res.status(200).json({ success: true, data: enrichedSubmissions });
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = SubmissionsController;
