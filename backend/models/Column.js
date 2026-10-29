const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Column title is required.'],
    trim: true,
    maxlength: 50
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required.']
  },
  order: {
    type: Number,
    required: [true, 'Column order is required.'],
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Column', columnSchema);