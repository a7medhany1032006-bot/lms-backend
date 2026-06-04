const GradesModel = require('../models/grades.model');

class GradesController {
  static async getAllGrades(req, res) {
    try {
      const grades = await GradesModel.getAllGrades();
      res.status(200).json({ success: true, data: grades });
    } catch (error) {
      console.error('Error fetching grades:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getGradeById(req, res) {
    try {
      const { id } = req.params;
      const grade = await GradesModel.getGradeById(id);
      if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
      res.status(200).json({ success: true, data: grade });
    } catch (error) {
      console.error('Error fetching grade:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getGradeWithCourses(req, res) {
    try {
      const { id } = req.params;
      const grade = await GradesModel.getGradeWithCourses(id);
      if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
      res.status(200).json({ success: true, data: grade });
    } catch (error) {
      console.error('Error fetching grade with courses:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async addGrade(req, res) {
    try {
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'name is required' });
      }
      const id = await GradesModel.addGrade(name.trim(), description);
      res.status(201).json({ success: true, message: 'Grade created successfully', gradeId: id });
    } catch (error) {
      console.error('Error adding grade:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async updateGrade(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'name is required' });
      }
      const existing = await GradesModel.getGradeById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Grade not found' });
      await GradesModel.updateGrade(id, name.trim(), description);
      res.status(200).json({ success: true, message: 'Grade updated successfully' });
    } catch (error) {
      console.error('Error updating grade:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async deleteGrade(req, res) {
    try {
      const { id } = req.params;
      const existing = await GradesModel.getGradeById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Grade not found' });
      await GradesModel.deleteGrade(id);
      res.status(200).json({ success: true, message: 'Grade deleted successfully' });
    } catch (error) {
      console.error('Error deleting grade:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = GradesController;
