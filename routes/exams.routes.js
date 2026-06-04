const express = require('express');
const router = express.Router();
const ExamsController = require('../controllers/exams.controller');
const { isAdmin } = require('../middleware/auth');

router.get('/', ExamsController.getAllExams);
router.post('/', isAdmin, ExamsController.createExam);
router.get('/:id', ExamsController.getExamById);
router.put('/:id', isAdmin, ExamsController.updateExam);
router.delete('/:id', isAdmin, ExamsController.deleteExam);

module.exports = router;
