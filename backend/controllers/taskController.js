const Task = require('../models/Task');
const Column = require('../models/Column');
const Project = require('../models/Project');

// Helper function to detect cycles for DAG validation
const hasDependencyCycle = async (taskId, newDepIds) => {
  if (!newDepIds || newDepIds.length === 0) return false;
  
  const stringDepIds = newDepIds.map(id => id.toString());
  if (taskId && stringDepIds.includes(taskId.toString())) return true;

  const visited = new Set();
  const queue = [...stringDepIds];

  while (queue.length > 0) {
    const currentId = queue.pop();
    if (taskId && currentId === taskId.toString()) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const depTask = await Task.findById(currentId);
    if (depTask && depTask.dependencies) {
      queue.push(...depTask.dependencies.map(d => d.toString()));
    }
  }
  return false;
};

// Create a new task
const createTask = async (req, res) => {
  try {
    const { projectId, columnId, title, description, priority, dueDate, assignedTo, dependencies } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.userId }, { members: req.userId }]
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized access.' });
    }

    const column = await Column.findOne({ _id: columnId, projectId });
    if (!column) {
      return res.status(404).json({ error: 'Column not found within this project.' });
    }

    // Validate dependencies belong to the same project
    if (dependencies && dependencies.length > 0) {
      const validDeps = await Task.find({ _id: { $in: dependencies }, projectId });
      if (validDeps.length !== dependencies.length) {
        return res.status(400).json({ error: 'One or more dependency tasks are invalid or belong to a different project.' });
      }
    }

    const newTask = new Task({
      projectId,
      columnId,
      title,
      description,
      priority: priority || 'medium',
      dueDate,
      assignedTo: assignedTo || req.userId,
      createdBy: req.userId,
      dependencies: dependencies || []
    });

    await newTask.save();
    
    const populatedTask = await newTask.populate([
      { path: 'assignedTo createdBy', select: 'name email' },
      { path: 'columnId', select: 'title order' },
      { path: 'dependencies', select: 'title columnId' }
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
      .populate('dependencies', 'title columnId')
      .sort({ createdAt: 1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching tasks.', details: error.message });
  }
};

// Update task details, columns, or dependencies
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, columnId, priority, dueDate, assignedTo, dependencies } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (columnId && columnId !== task.columnId.toString()) {
      const targetColumn = await Column.findOne({ _id: columnId, projectId: task.projectId });
      if (!targetColumn) {
        return res.status(404).json({ error: 'Target column not found.' });
      }
    }

    // Validate dependency cycle if dependencies are being updated
    if (dependencies !== undefined) {
      const isCycle = await hasDependencyCycle(taskId, dependencies);
      if (isCycle) {
        return res.status(400).json({ error: 'Invalid dependencies: Circular dependency detected (DAG violation).' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (columnId !== undefined) updates.columnId = columnId;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (dependencies !== undefined) updates.dependencies = dependencies;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('assignedTo createdBy', 'name email')
      .populate('columnId', 'title order')
      .populate('dependencies', 'title columnId');

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

    // Optional: Pull this deleted task out of other tasks' dependency arrays
    await Task.updateMany(
      { dependencies: taskId },
      { $pull: { dependencies: taskId } }
    );

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