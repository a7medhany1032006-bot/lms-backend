const { getPool } = require('../config/db');
const sql = require('mssql');

class SubmissionsModel {
  static async getSubmissionsByExamId(examId) {
    const pool = getPool();
    const result = await pool.request()
      .input('exam_id', sql.Int, examId)
      .query('SELECT * FROM exam_submissions WHERE exam_id = @exam_id ORDER BY submitted_at DESC');
    return result.recordset;
  }

  static async createSubmission(data) {
    const pool = getPool();
    const result = await pool.request()
      .input('exam_id', sql.Int, data.exam_id)
      .input('user_id', sql.Int, data.user_id)
      .input('student_name', sql.NVarChar, data.student_name)
      .input('score', sql.Int, data.score)
      .input('total_questions', sql.Int, data.total_questions)
      .input('answers_json', sql.NVarChar, JSON.stringify(data.answers_json))
      .query(`
        INSERT INTO exam_submissions (exam_id, user_id, student_name, score, total_questions, answers_json)
        OUTPUT INSERTED.id
        VALUES (@exam_id, @user_id, @student_name, @score, @total_questions, @answers_json)
      `);
    return result.recordset[0].id;
  }
}

module.exports = SubmissionsModel;
