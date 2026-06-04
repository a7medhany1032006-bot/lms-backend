const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/users.model');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    try {
      const { full_name, email, password } = req.body;
      
      if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      // Check if user exists
      const existingUser = await UsersModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const userId = await UsersModel.createUser({
        full_name,
        email,
        password_hash,
        role: 'student'
      });

      res.status(201).json({ success: true, message: 'User registered successfully', data: { id: userId } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await UsersModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, full_name: user.full_name, status: user.status || 'approved' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            status: user.status || 'approved'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    try {
      const userId = req.user.id;
      const user = await UsersModel.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error('Get Me error:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = AuthController;
