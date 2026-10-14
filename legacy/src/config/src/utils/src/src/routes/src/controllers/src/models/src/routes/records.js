const express = require('express');
const { getRecords, addRecord } = require('../controllers/recordsController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', auth, getRecords);
router.post('/', auth, addRecord);

module.exports = router;
