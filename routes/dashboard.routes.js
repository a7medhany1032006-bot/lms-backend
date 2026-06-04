const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');

router.get('/overview', DashboardController.getOverview);
router.get('/courses', DashboardController.getMyCourses);
router.get('/exams', DashboardController.getExamHistory);
router.get('/profile', DashboardController.getProfile);
router.put('/profile', DashboardController.updateProfile);

module.exports = router;
