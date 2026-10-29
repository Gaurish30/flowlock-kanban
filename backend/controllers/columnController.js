const Column = require('../models/Column');
const Project = require('../models/Project');

// Create a new column in a project
const createColumn = async (req, res) => {
  try {
    const { projectId, title, order } = req.body;

    // Verify the project exists and the user has access
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.userId }, { members: req.userId }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized access.' });
    }

    const newColumn = new Column({
      projectId, // <-- Changed from 'project' to match your schema
      title,
      order: order || 0
    });

    await newColumn.save();

    res.status(201).json({
      message: 'Column created successfully.',
      column: newColumn
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating column.', details: error.message });
  }
};

// Get all columns for a specific project
const getColumnsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project access first
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.userId }, { members: req.userId }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized access.' });
    }

    // Ensure we query using 'projectId' as well
    const columns = await Column.find({ projectId }).sort({ order: 1 });

    res.status(200).json(columns);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching columns.', details: error.message });
  }
};

module.exports = {
  createColumn,
  getColumnsByProject
};