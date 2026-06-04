const { getPool } = require('../config/db');
const sql = require('mssql');

class QuestionsModel {
  static async getQuestionsByExamId(examId) {
    const pool = getPool();
    const result = await pool.request()
      .input('exam_id', sql.Int, examId)
      .query('SELECT * FROM questions WHERE exam_id = @exam_id ORDER BY id ASC');
    return result.recordset;
  }

  static async getQuestionById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM questions WHERE id = @id');
    return result.recordset[0];
  }

  static async createQuestion(data) {
    const pool = getPool();
    const result = await pool.request()
      .input('exam_id', sql.Int, data.exam_id)
      .input('question_text', sql.NVarChar, data.question_text)
      .input('question_type', sql.NVarChar, data.question_type)
      .input('option_a', sql.NVarChar, data.option_a || null)
      .input('option_b', sql.NVarChar, data.option_b || null)
      .input('option_c', sql.NVarChar, data.option_c || null)
      .input('option_d', sql.NVarChar, data.option_d || null)
      .input('correct_answer', sql.NVarChar, data.correct_answer || null)
      .query(`
        INSERT INTO questions (exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer)
        OUTPUT INSERTED.id
        VALUES (@exam_id, @question_text, @question_type, @option_a, @option_b, @option_c, @option_d, @correct_answer)
      `);
    return result.recordset[0].id;
  }

  static async updateQuestion(id, data) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('exam_id', sql.Int, data.exam_id)
      .input('question_text', sql.NVarChar, data.question_text)
      .input('question_type', sql.NVarChar, data.question_type)
      .input('option_a', sql.NVarChar, data.option_a || null)
      .input('option_b', sql.NVarChar, data.option_b || null)
      .input('option_c', sql.NVarChar, data.option_c || null)
      .input('option_d', sql.NVarChar, data.option_d || null)
      .input('correct_answer', sql.NVarChar, data.correct_answer || null)
      .query(`
        UPDATE questions
        SET exam_id = @exam_id,
            question_text = @question_text,
            question_type = @question_type,
            option_a = @option_a,
            option_b = @option_b,
            option_c = @option_c,
            option_d = @option_d,
            correct_answer = @correct_answer
        WHERE id = @id
      `);
  }

  static async deleteQuestion(id) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM questions WHERE id = @id');
  }
}

module.exports = QuestionsModel;
