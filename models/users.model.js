const { getPool } = require('../config/db');
const sql = require('mssql');

class UsersModel {
  static async getUserByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');
    return result.recordset[0];
  }

  static async getUserById(id) {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, full_name, email, role, status, created_at FROM users WHERE id = @id');
    return result.recordset[0];
  }

  static async createUser({ full_name, email, password_hash, role = 'student', status = 'pending' }) {
    const pool = getPool();
    const result = await pool.request()
      .input('full_name', sql.NVarChar, full_name)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('role', sql.NVarChar, role)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO users (full_name, email, password_hash, role, status)
        OUTPUT INSERTED.id
        VALUES (@full_name, @email, @password_hash, @role, @status)
      `);
    return result.recordset[0].id;
  }

  static async updateStatus(id, status) {
    const pool = getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE users SET status = @status WHERE id = @id');
  }
}

module.exports = UsersModel;
