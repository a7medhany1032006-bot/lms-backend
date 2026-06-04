const express = require('express');
const router = express.Router();
const LessonsController = require('../controllers/lessons.controller');
const { isAdmin } = require('../middleware/auth');

// IMPORTANT: Specific routes must come BEFORE parameterized routes
router.post('/', isAdmin, LessonsController.createLesson);
router.get('/course/:courseId', LessonsController.getLessonsByCourseId);  // must be before /:id
router.get('/:id', LessonsController.getLessonById);
router.get('/:id/progress', LessonsController.getProgress);
router.post('/:id/progress', LessonsController.updateProgress);
router.put('/:id', isAdmin, LessonsController.updateLesson);
router.delete('/:id', isAdmin, LessonsController.deleteLesson);

module.exports = router;
