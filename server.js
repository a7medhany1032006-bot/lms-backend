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

// Parse comma-separated FRONTEND_URL environment variable if provided
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // 1. Allow server-to-server requests or tools like Postman (no origin header)
      if (!origin) return callback(null, true);

      // 2. Allow any Vercel preview/production domain
      const isVercel = origin.endsWith('.vercel.app');

      // 3. Allow local development and LAN IP testing (e.g., mobile devices on wifi)
      const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      const isLAN = origin.startsWith('http://192.168.') || origin.startsWith('http://10.');

      // 4. Allow specific production origins defined in .env
      const isEnvAllowed = envOrigins.includes(origin);

      if (isVercel || isLocalhost || isLAN || isEnvAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        // Return callback(null, false) to reject CORS gracefully WITHOUT throwing an Error.
        // Throwing new Error() here can cause Express unhandled rejections/crashes.
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
