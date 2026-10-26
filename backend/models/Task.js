const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required.'],
    trim: true,
    maxlength: 160
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

taskSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
