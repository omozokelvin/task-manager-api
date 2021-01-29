const mongoose = require('mongoose');

mongoose.Schema.Types.Boolean.convertToFalse = new Set([false, 'false']);
mongoose.Schema.Types.Boolean.convertToTrue = new Set([true, 'true']);

const taskSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);


const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
