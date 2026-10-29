const mongoose = require('mongoose');

const dependencySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required.']
  },
  predecessorTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Predecessor task ID is required.']
  },
  successorTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Successor task ID is required.']
  }
}, { timestamps: true });

module.exports = mongoose.model('Dependency', dependencySchema);