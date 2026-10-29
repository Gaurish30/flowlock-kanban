const Project = require('../models/Project');
const Column = require('../models/Column');
const Task = require('../models/Task');

// Create a new project and automatically generate default columns
const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;

    let newProject = new Project({
      title,
      description,
      owner: req.userId,
      members: [req.userId]
    });

    await newProject.save();

    // Automatically create the 4 standard Kanban columns for this project
    const defaultColumns = [
      { title: 'To Do', order: 1, projectId: newProject._id },
      { title: 'In Progress', order: 2, projectId: newProject._id },
      { title: 'Under Review', order: 3, projectId: newProject._id },
      { title: 'Finished', order: 4, projectId: newProject._id }
    ];

    await Column.insertMany(defaultColumns);

    // Populate owner and members details
    newProject = await newProject.populate('owner members', 'name email');

    res.status(201).json({
      message: 'Project created successfully with default columns.',
      project: newProject
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating project.', details: error.message });
  }
};

// Get all projects for the logged-in user
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { members: req.userId }
      ]
    })
    .populate('owner', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching projects.', details: error.message });
  }
};

// Delete a project and its associated columns and tasks
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Only allow the project owner to delete the project
    const project = await Project.findOneAndDelete({
      _id: projectId,
      owner: req.userId
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized to delete.' });
    }

    // Delete all columns and tasks associated with this project
    await Column.deleteMany({ projectId });
    await Task.deleteMany({ projectId });

    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting project.', details: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  deleteProject
};