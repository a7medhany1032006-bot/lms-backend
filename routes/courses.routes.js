const express = require('express');
const CoursesController = require('../controllers/courses.controller');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', CoursesController.getAllCourses);
router.post('/', isAdmin, CoursesController.addCourse);
router.get('/:id', CoursesController.getCourseById);
router.put('/:id', isAdmin, CoursesController.updateCourse);
router.delete('/:id', isAdmin, CoursesController.deleteCourse);

module.exports = router;
