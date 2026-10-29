const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const verifyToken = require('../middleware/auth');

// Protect all project routes with JWT middleware
router.use(verifyToken);

// POST /api/projects - Create a project
router.post('/', projectController.createProject);

// GET /api/projects - Get all projects for the logged-in user
router.get('/', projectController.getProjects);

// DELETE /api/projects/:projectId - Delete a project by ID
router.delete('/:projectId', projectController.deleteProject);

module.exports = router;