const express = require('express');
const router = express.Router();
const AdminEssaysController = require('../controllers/admin.essays.controller');
const { isAdmin } = require('../middleware/auth');

// All routes require admin
router.use(isAdmin);

router.get('/', AdminEssaysController.getEssaySubmissions);
router.get('/:id', AdminEssaysController.getEssaySubmissionById);
router.put('/:id/grade', AdminEssaysController.gradeEssay);

module.exports = router;
