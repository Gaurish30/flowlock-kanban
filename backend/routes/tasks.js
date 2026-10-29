const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const verifyToken = require('../middleware/auth');

// Protect all task routes with JWT middleware
router.use(verifyToken);

// POST /api/tasks - Create a task
router.post('/', taskController.createTask);

// GET /api/tasks/project/:projectId - Get all tasks for a project
router.get('/project/:projectId', taskController.getTasksByProject);

// PUT /api/tasks/:taskId - Update a task (edit details or move columns)
router.put('/:taskId', taskController.updateTask);

// DELETE /api/tasks/:taskId - Delete a task
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;