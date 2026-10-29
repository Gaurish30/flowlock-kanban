const Task = require('../models/Task');
const Column = require('../models/Column');
const Project = require('../models/Project');

// Create a new task in a column
const createTask = async (req, res) => {
  try {
    const { projectId, columnId, title, description, priority, dueDate, assignedTo } = req.body;

    // Verify project access
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.userId }, { members: req.userId }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized access.' });
    }

    // Verify column belongs to this project
    const column = await Column.findOne({ _id: columnId, projectId });
    if (!column) {
      return res.status(404).json({ error: 'Column not found within this project.' });
    }

    const newTask = new Task({
      projectId,
      columnId,
      title,
      description,
      priority: priority || 'medium',
      dueDate,
      assignedTo: assignedTo || req.userId,
      createdBy: req.userId
    });

    await newTask.save();
    
    // Populate column details along with user details
    const populatedTask = await newTask.populate([
      { path: 'assignedTo createdBy', select: 'name email' },
      { path: 'columnId', select: 'title order' }
    ]);

    res.status(201).json({
      message: 'Task created successfully.',
      task: populatedTask
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating task.', details: error.message });
  }
};

// Get all tasks for a project
const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project access
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.userId }, { members: req.userId }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized access.' });
    }

    const tasks = await Task.find({ projectId })
      .populate('assignedTo createdBy', 'name email')
      .populate('columnId', 'title order')
      .sort({ createdAt: 1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching tasks.', details: error.message });
  }
};

// Update task details or move task to another column
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, columnId, priority, dueDate, assignedTo } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // If moving to a new column, verify the target column belongs to the project
    if (columnId && columnId !== task.columnId.toString()) {
      const targetColumn = await Column.findOne({ _id: columnId, projectId: task.projectId });
      if (!targetColumn) {
        return res.status(404).json({ error: 'Target column not found.' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (columnId !== undefined) updates.columnId = columnId;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('assignedTo createdBy', 'name email')
      .populate('columnId', 'title order');

    res.status(200).json({
      message: 'Task updated successfully.',
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating task.', details: error.message });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting task.', details: error.message });
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  updateTask,
  deleteTask
};