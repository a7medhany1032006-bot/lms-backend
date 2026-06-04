const express = require('express');
const router = express.Router();
const SubmissionsController = require('../controllers/submissions.controller');
const { isAdmin } = require('../middleware/auth');

router.post('/:examId/submit', SubmissionsController.submitExam);
router.get('/:examId', isAdmin, SubmissionsController.getSubmissions);

module.exports = router;
