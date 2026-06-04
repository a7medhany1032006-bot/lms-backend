const { getPool } = require('../config/db');
const sql = require('mssql');

class GradesModel {
  static async getAllGrades() {
    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM grades ORDER BY id ASC');
    return result.recordset;
  }

  static async getGradeById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM grades WHERE id = @id');
    return result.recordset[0];
  }

  static async getGradeWithCourses(id) {
    const pool = getPool();
    const grade = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM grades WHERE id = @id');
    if (!grade.recordset[0]) return null;
    const courses = await pool.request()
      .input('grade_id', sql.Int, id)
      .query('SELECT * FROM courses WHERE grade_id = @grade_id ORDER BY id ASC');
    return { ...grade.recordset[0], courses: courses.recordset };
  }

  static async addGrade(name, description) {
    const pool = getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || '')
      .query(`INSERT INTO grades (name, description) OUTPUT INSERTED.id VALUES (@name, @description)`);
    return result.recordset[0].id;
  }

  static async updateGrade(id, name, description) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || '')
      .query('UPDATE grades SET name = @name, description = @description WHERE id = @id');
  }

  static async deleteGrade(id) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM grades WHERE id = @id');
  }
}

module.exports = GradesModel;
