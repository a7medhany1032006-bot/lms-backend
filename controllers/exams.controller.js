const ExamsModel = require('../models/exams.model');
const CoursesModel = require('../models/courses.model');

class ExamsController {
  static async getAllExams(req, res) {
    try {
      const { courseId } = req.query;
      const exams = await ExamsModel.getAllExams(courseId ? parseInt(courseId) : null);
      res.status(200).json({ success: true, data: exams });
    } catch (error) {
      console.error('Error fetching exams:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getExamById(req, res) {
    try {
      const { id } = req.params;
      const exam = await ExamsModel.getExamById(id);
      if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
      res.status(200).json({ success: true, data: exam });
    } catch (error) {
      console.error('Error fetching exam:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async createExam(req, res) {
    try {
      const { course_id, title, description, time_limit } = req.body;
      if (!course_id || !Number.isInteger(Number(course_id))) {
        return res.status(400).json({ success: false, message: 'course_id must be a valid integer' });
      }
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'title is required' });
      }
      const course = await CoursesModel.getCourseById(course_id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      const examId = await ExamsModel.createExam(
        parseInt(course_id), title.trim(), description,
        time_limit ? parseInt(time_limit) : null
      );
      res.status(201).json({ success: true, message: 'Exam created successfully', examId });
    } catch (error) {
      console.error('Error creating exam:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateExam(req, res) {
    try {
      const { id } = req.params;
      const { course_id, title, description, time_limit } = req.body;
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'title is required' });
      }
      const existing = await ExamsModel.getExamById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Exam not found' });
      const course = await CoursesModel.getCourseById(course_id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      await ExamsModel.updateExam(id, course_id, title.trim(), description, time_limit ? parseInt(time_limit) : null);
      res.status(200).json({ success: true, message: 'Exam updated successfully' });
    } catch (error) {
      console.error('Error updating exam:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteExam(req, res) {
    try {
      const { id } = req.params;
      const existing = await ExamsModel.getExamById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Exam not found' });
      await ExamsModel.deleteExam(id);
      res.status(200).json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
      console.error('Error deleting exam:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = ExamsController;
