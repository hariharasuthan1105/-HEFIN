const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', recordSchema);
