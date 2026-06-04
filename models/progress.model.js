const { getPool } = require('../config/db');
const sql = require('mssql');

class ProgressModel {
  static async getProgressByUser(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT * FROM lesson_progress WHERE user_id = @user_id');
    return result.recordset;
  }

  static async getProgress(userId, lessonId) {
    const pool = getPool();
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('lesson_id', sql.Int, lessonId)
      .query('SELECT * FROM lesson_progress WHERE user_id = @user_id AND lesson_id = @lesson_id');
    return result.recordset[0];
  }

  static async updateProgress(userId, lessonId, isCompleted = false) {
    const pool = getPool();
    
    // Check if progress already exists
    const existing = await this.getProgress(userId, lessonId);
    
    if (existing) {
      // Update
      const newStatus = isCompleted || existing.is_completed;
      await pool.request()
        .input('user_id', sql.Int, userId)
        .input('lesson_id', sql.Int, lessonId)
        .input('is_completed', sql.Bit, newStatus)
        .query(`
          UPDATE lesson_progress 
          SET is_completed = @is_completed, last_accessed = GETDATE()
          WHERE user_id = @user_id AND lesson_id = @lesson_id
        `);
      return { action: 'updated', is_completed: newStatus };
    } else {
      // Insert
      const result = await pool.request()
        .input('user_id', sql.Int, userId)
        .input('lesson_id', sql.Int, lessonId)
        .input('is_completed', sql.Bit, isCompleted)
        .query(`
          INSERT INTO lesson_progress (user_id, lesson_id, is_completed)
          OUTPUT INSERTED.id
          VALUES (@user_id, @lesson_id, @is_completed)
        `);
      return { action: 'inserted', id: result.recordset[0].id, is_completed: isCompleted };
    }
  }
}

module.exports = ProgressModel;
