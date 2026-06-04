const LessonsModel = require('../models/lessons.model');
const CoursesModel = require('../models/courses.model');
const ProgressModel = require('../models/progress.model');

class LessonsController {
  static async getLessonById(req, res) {
    try {
      const { id } = req.params;
      const lesson = await LessonsModel.getLessonById(id);
      if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
      res.status(200).json({ success: true, data: lesson });
    } catch (error) {
      console.error('Error fetching lesson:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async createLesson(req, res) {
    try {
      const { course_id, title, video_url, pdf_url, order_index } = req.body;

      if (!course_id || !Number.isInteger(Number(course_id))) {
        return res.status(400).json({ success: false, message: 'course_id must be a valid integer' });
      }
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'title is required' });
      }
      if (!video_url || typeof video_url !== 'string' || video_url.trim() === '') {
        return res.status(400).json({ success: false, message: 'video_url is required' });
      }
      if (pdf_url && typeof pdf_url === 'string' && pdf_url.trim() !== '') {
        if (!/^https?:\/\/.+/.test(pdf_url.trim())) {
          return res.status(400).json({ success: false, message: 'pdf_url must be a valid URL starting with http:// or https://' });
        }
      }
      if (!order_index || !Number.isInteger(Number(order_index)) || Number(order_index) < 1) {
        return res.status(400).json({ success: false, message: 'order_index must be an integer >= 1' });
      }

      const course = await CoursesModel.getCourseById(course_id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

      const cleanPdfUrl = pdf_url && pdf_url.trim() !== '' ? pdf_url.trim() : null;
      const lessonId = await LessonsModel.createLesson(course_id, title.trim(), video_url.trim(), cleanPdfUrl, parseInt(order_index));
      res.status(201).json({ success: true, message: 'Lesson created successfully', lessonId });
    } catch (error) {
      console.error('Error creating lesson:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getLessonsByCourseId(req, res) {
    try {
      const { courseId } = req.params;
      const lessons = await LessonsModel.getLessonsByCourseId(courseId);
      res.status(200).json({ success: true, data: lessons });
    } catch (error) {
      console.error('Error fetching lessons:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateLesson(req, res) {
    try {
      const { id } = req.params;
      const { course_id, title, video_url, pdf_url, order_index } = req.body;
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'title is required' });
      }
      if (pdf_url && typeof pdf_url === 'string' && pdf_url.trim() !== '') {
        if (!/^https?:\/\/.+/.test(pdf_url.trim())) {
          return res.status(400).json({ success: false, message: 'pdf_url must be a valid URL starting with http:// or https://' });
        }
      }
      const course = await CoursesModel.getCourseById(course_id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      const cleanPdfUrl = pdf_url && pdf_url.trim() !== '' ? pdf_url.trim() : null;
      await LessonsModel.updateLesson(id, course_id, title, video_url, cleanPdfUrl, order_index);
      res.status(200).json({ success: true, message: 'Lesson updated successfully' });
    } catch (error) {
      console.error('Error updating lesson:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteLesson(req, res) {
    try {
      const { id } = req.params;
      await LessonsModel.deleteLesson(id);
      res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getProgress(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const progress = await ProgressModel.getProgress(userId, id);
      res.status(200).json({ success: true, data: progress || { is_completed: false } });
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { is_completed } = req.body;
      const result = await ProgressModel.updateProgress(userId, id, is_completed);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = LessonsController;
