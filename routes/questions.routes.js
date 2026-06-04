const express = require('express');
const router = express.Router();
const QuestionsController = require('../controllers/questions.controller');
const { isAdmin } = require('../middleware/auth');

router.get('/exam/:examId', QuestionsController.getQuestionsByExamId);
router.get('/:id', QuestionsController.getQuestionById);
router.post('/', isAdmin, QuestionsController.createQuestion);
router.put('/:id', isAdmin, QuestionsController.updateQuestion);
router.delete('/:id', isAdmin, QuestionsController.deleteQuestion);

module.exports = router;
