const { getPool } = require('../config/db');
const sql = require('mssql');

class ExamsModel {
  static async getAllExams(courseId = null) {
    const pool = getPool();
    if (courseId) {
      const result = await pool.request()
        .input('course_id', sql.Int, courseId)
        .query('SELECT * FROM exams WHERE course_id = @course_id ORDER BY created_at DESC');
      return result.recordset;
    }
    const result = await pool.request().query('SELECT * FROM exams ORDER BY created_at DESC');
    return result.recordset;
  }

  static async getExamById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM exams WHERE id = @id');
    return result.recordset[0];
  }

  static async createExam(courseId, title, description, timeLimit) {
    const pool = getPool();
    const result = await pool.request()
      .input('course_id', sql.Int, courseId)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || '')
      .input('time_limit', sql.Int, timeLimit || null)
      .query(`
        INSERT INTO exams (course_id, title, description, time_limit)
        OUTPUT INSERTED.id
        VALUES (@course_id, @title, @description, @time_limit)
      `);
    return result.recordset[0].id;
  }

  static async updateExam(id, courseId, title, description, timeLimit) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('course_id', sql.Int, courseId)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || '')
      .input('time_limit', sql.Int, timeLimit || null)
      .query(`
        UPDATE exams
        SET course_id = @course_id, title = @title, description = @description, time_limit = @time_limit
        WHERE id = @id
      `);
  }

  static async deleteExam(id) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM exams WHERE id = @id');
  }
}

module.exports = ExamsModel;
