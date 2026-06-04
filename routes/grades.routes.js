const express = require('express');
const router = express.Router();
const GradesController = require('../controllers/grades.controller');
const { isAdmin } = require('../middleware/auth');

// IMPORTANT: Specific routes must come BEFORE parameterized routes
router.get('/', GradesController.getAllGrades);
router.post('/', isAdmin, GradesController.addGrade);
router.get('/:id/courses', GradesController.getGradeWithCourses);  // must be before /:id
router.get('/:id', GradesController.getGradeById);
router.put('/:id', isAdmin, GradesController.updateGrade);
router.delete('/:id', isAdmin, GradesController.deleteGrade);

module.exports = router;
