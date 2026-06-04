const { getPool } = require('../config/db');
const sql = require('mssql');

class CoursesModel {
  static async getAllCourses(gradeId = null) {
    const pool = getPool();
    if (gradeId) {
      const result = await pool.request()
        .input('grade_id', sql.Int, gradeId)
        .query('SELECT * FROM courses WHERE grade_id = @grade_id ORDER BY id ASC');
      return result.recordset;
    }
    const result = await pool.request().query('SELECT * FROM courses ORDER BY id ASC');
    return result.recordset;
  }

  static async getCourseById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM courses WHERE id = @id');
    return result.recordset[0];
  }

  static async addCourse(title, description, gradeId) {
    const pool = getPool();
    const result = await pool.request()
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || '')
      .input('grade_id', sql.Int, gradeId || null)
      .query(`
        INSERT INTO courses (title, description, grade_id)
        OUTPUT INSERTED.id
        VALUES (@title, @description, @grade_id)
      `);
    return result.recordset[0].id;
  }

  static async updateCourse(id, title, description, gradeId) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || '')
      .input('grade_id', sql.Int, gradeId || null)
      .query('UPDATE courses SET title = @title, description = @description, grade_id = @grade_id WHERE id = @id');
  }

  static async deleteCourse(id) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM courses WHERE id = @id');
  }
}

module.exports = CoursesModel;
