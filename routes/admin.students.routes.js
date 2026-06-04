const express = require('express');
const router = express.Router();
const AdminStudentsController = require('../controllers/admin.students.controller');
const { isAdmin } = require('../middleware/auth');

// All routes require admin
router.use(isAdmin);

router.get('/overview', AdminStudentsController.getOverview);
router.get('/pending', AdminStudentsController.getPendingStudents);
router.get('/', AdminStudentsController.getStudents);
router.get('/:id', AdminStudentsController.getStudentById);
router.get('/:id/progress', AdminStudentsController.getStudentProgress);
router.get('/:id/exams', AdminStudentsController.getStudentExams);
router.put('/:id/approve', AdminStudentsController.approveStudent);
router.put('/:id/reject', AdminStudentsController.rejectStudent);

module.exports = router;
