const QuestionsModel = require('../models/questions.model');
const ExamsModel = require('../models/exams.model');

class QuestionsController {
  static async getQuestionsByExamId(req, res) {
    try {
      const { examId } = req.params;
      const questions = await QuestionsModel.getQuestionsByExamId(examId);
      res.status(200).json({ success: true, data: questions });
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await QuestionsModel.getQuestionById(id);
      if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
      res.status(200).json({ success: true, data: question });
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async createQuestion(req, res) {
    try {
      const { exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer } = req.body;
      
      if (!exam_id || !question_text || !question_type) {
        return res.status(400).json({ success: false, message: 'exam_id, question_text, and question_type are required' });
      }

      if (question_type !== 'mcq' && question_type !== 'essay') {
        return res.status(400).json({ success: false, message: 'question_type must be mcq or essay' });
      }

      if (question_type === 'mcq') {
        if (!option_a || !option_b || !option_c || !option_d || !correct_answer) {
          return res.status(400).json({ success: false, message: 'MCQ questions require all 4 options and a correct_answer' });
        }
      }

      const exam = await ExamsModel.getExamById(exam_id);
      if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

      const questionId = await QuestionsModel.createQuestion({
        exam_id: parseInt(exam_id),
        question_text: question_text.trim(),
        question_type,
        option_a: question_type === 'mcq' ? option_a.trim() : null,
        option_b: question_type === 'mcq' ? option_b.trim() : null,
        option_c: question_type === 'mcq' ? option_c.trim() : null,
        option_d: question_type === 'mcq' ? option_d.trim() : null,
        correct_answer: question_type === 'mcq' ? correct_answer : null,
      });

      res.status(201).json({ success: true, message: 'Question created successfully', questionId });
    } catch (error) {
      console.error('Error creating question:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const { exam_id, question_text, question_type, option_a, option_b, option_c, option_d, correct_answer } = req.body;

      if (!exam_id || !question_text || !question_type) {
        return res.status(400).json({ success: false, message: 'exam_id, question_text, and question_type are required' });
      }

      if (question_type !== 'mcq' && question_type !== 'essay') {
        return res.status(400).json({ success: false, message: 'question_type must be mcq or essay' });
      }

      if (question_type === 'mcq') {
        if (!option_a || !option_b || !option_c || !option_d || !correct_answer) {
          return res.status(400).json({ success: false, message: 'MCQ questions require all 4 options and a correct_answer' });
        }
      }

      const existing = await QuestionsModel.getQuestionById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Question not found' });

      await QuestionsModel.updateQuestion(id, {
        exam_id: parseInt(exam_id),
        question_text: question_text.trim(),
        question_type,
        option_a: question_type === 'mcq' ? option_a.trim() : null,
        option_b: question_type === 'mcq' ? option_b.trim() : null,
        option_c: question_type === 'mcq' ? option_c.trim() : null,
        option_d: question_type === 'mcq' ? option_d.trim() : null,
        correct_answer: question_type === 'mcq' ? correct_answer : null,
      });

      res.status(200).json({ success: true, message: 'Question updated successfully' });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const existing = await QuestionsModel.getQuestionById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Question not found' });
      await QuestionsModel.deleteQuestion(id);
      res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Error deleting question:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = QuestionsController;
