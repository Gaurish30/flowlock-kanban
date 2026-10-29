const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const verifyToken = require('../middleware/auth');

// Protect all column routes with JWT middleware
router.use(verifyToken);

// GET /api/columns/project/:projectId - Get all columns for a specific project
router.get('/project/:projectId', columnController.getColumnsByProject);

module.exports = router;