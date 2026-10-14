const Record = require('../models/Record');

exports.getRecords = async (req, res) => {
  const records = await Record.find({ userId: req.user.id });
  res.json(records);
};

exports.addRecord = async (req, res) => {
  const record = await Record.create({ ...req.body, userId: req.user.id });
  res.status(201).json(record);
};
