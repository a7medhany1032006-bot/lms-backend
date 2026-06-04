const { getPool } = require('../config/db');
const sql = require('mssql');

class LessonsModel {
  static async getLessonById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM lessons WHERE id = @id');
    return result.recordset[0];
  }

  static async getLessonsByCourseId(courseId) {
    const pool = getPool();
    const result = await pool.request()
      .input('course_id', sql.Int, courseId)
      .query(`
        SELECT * FROM lessons
        WHERE course_id = @course_id
        ORDER BY order_index ASC
      `);
    return result.recordset;
  }

  static async createLesson(courseId, title, videoUrl, pdfUrl, orderIndex) {
    const pool = getPool();
    const result = await pool.request()
      .input('course_id', sql.Int, courseId)
      .input('title', sql.NVarChar, title)
      .input('video_url', sql.NVarChar, videoUrl)
      .input('pdf_url', sql.NVarChar, pdfUrl || null)
      .input('order_index', sql.Int, orderIndex)
      .query(`
        INSERT INTO lessons (course_id, title, video_url, pdf_url, order_index)
        OUTPUT INSERTED.id
        VALUES (@course_id, @title, @video_url, @pdf_url, @order_index)
      `);
    return result.recordset[0].id;
  }

  static async updateLesson(id, courseId, title, videoUrl, pdfUrl, orderIndex) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('course_id', sql.Int, courseId)
      .input('title', sql.NVarChar, title)
      .input('video_url', sql.NVarChar, videoUrl)
      .input('pdf_url', sql.NVarChar, pdfUrl || null)
      .input('order_index', sql.Int, orderIndex)
      .query(`
        UPDATE lessons
        SET course_id = @course_id, title = @title, video_url = @video_url, pdf_url = @pdf_url, order_index = @order_index
        WHERE id = @id
      `);
  }

  static async deleteLesson(id) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM lessons WHERE id = @id');
  }
}

module.exports = LessonsModel;
