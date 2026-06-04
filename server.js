require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
const coursesRoutes = require('./routes/courses.routes');
const lessonsRoutes = require('./routes/lessons.routes');
const gradesRoutes = require('./routes/grades.routes');
const examsRoutes = require('./routes/exams.routes');
const questionsRoutes = require('./routes/questions.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminStudentsRoutes = require('./routes/admin.students.routes');
const adminEssaysRoutes = require('./routes/admin.essays.routes');
const { verifyToken } = require('./middleware/auth');

const app = express();

// Build allowed origins list:
// 1. Always include local dev origins so localhost always works
// 2. Add any production URLs from FRONTEND_URL env var (trim whitespace + trailing slashes)
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const PROD_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [...new Set([...DEV_ORIGINS, ...PROD_ORIGINS])];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests (no origin header) and all listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        // Return error string (not an Error object) to avoid unhandled crashes
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/auth', authRoutes);

app.use(verifyToken);

app.use('/grades', gradesRoutes);
app.use('/courses', coursesRoutes);
app.use('/lessons', lessonsRoutes);
app.use('/exams', examsRoutes);
app.use('/questions', questionsRoutes);
app.use('/submissions', submissionsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin/students', adminStudentsRoutes);
app.use('/admin/essay-submissions', adminEssaysRoutes);

app.get('/', (req, res) => {
  res.send('هاني دويدار - عربي بالأرقام API is running');
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
