const CoursesModel = require('../models/courses.model');
const LessonsModel = require('../models/lessons.model');

class CoursesController {
  static async getAllCourses(req, res) {
    try {
      const { gradeId } = req.query;
      const courses = await CoursesModel.getAllCourses(gradeId ? parseInt(gradeId) : null);
      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getCourseById(req, res) {
    try {
      const { id } = req.params;
      const course = await CoursesModel.getCourseById(id);
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      const lessons = await LessonsModel.getLessonsByCourseId(id);
      res.status(200).json({ success: true, data: { ...course, lessons } });
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async addCourse(req, res) {
    try {
      const { title, description, grade_id } = req.body;
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'title is required' });
      }
      const id = await CoursesModel.addCourse(title.trim(), description, grade_id || null);
      res.status(201).json({ success: true, message: 'Course created successfully', courseId: id });
    } catch (error) {
      console.error('Error adding course:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const { title, description, grade_id } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
      await CoursesModel.updateCourse(id, title, description, grade_id || null);
      res.status(200).json({ success: true, message: 'Course updated successfully' });
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      await CoursesModel.deleteCourse(id);
      res.status(200).json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = CoursesController;
