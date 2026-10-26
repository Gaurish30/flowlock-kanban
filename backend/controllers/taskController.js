const mongoose = require('mongoose');
const Task = require('../models/Task');
const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
function validId(id) { return mongoose.isValidObjectId(id); }

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ count: tasks.length, data: tasks });
  } catch (error) { next(error); }
};
exports.getOne = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task ID.' });
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ data: task });
  } catch (error) { next(error); }
};
exports.create = async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Task title is required.' });
    const task = await Task.create({
      title,
      description: String(req.body.description || '').trim(),
      status: req.body.status || 'todo',
      priority: req.body.priority || 'medium',
      dueDate: req.body.dueDate || null
    });
    res.status(201).json({ message: 'Task created successfully.', data: task });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: error.message });
    next(error);
  }
};
exports.update = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task ID.' });
    const updates = {};
    for (const key of allowedFields) if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || !updates.title.trim()) return res.status(400).json({ error: 'Task title cannot be empty.' });
      updates.title = updates.title.trim();
    }
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.dueDate === '') updates.dueDate = null;
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task updated successfully.', data: task });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({ error: error.message });
    next(error);
  }
};
exports.remove = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid task ID.' });
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task deleted successfully.', id: task._id });
  } catch (error) { next(error); }
};
