const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const cfgMain = require('./config');
const loggerMain = require('./utils/logger');

const authRoutes = require('./routes/auth');
const recordsRoutes = require('./routes/records');
const financeRoutes = require('./routes/finance');
const aiRoutes = require('./routes/ai');

const app = express();

// Middleware
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => res.json({ ok: true, service: 'HEFIN Backend', uptime: process.uptime() }));
app.get('/healthz', (req, res) => res.sendStatus(200));

// Error handler
app.use((err, req, res, next) => {
  loggerMain.info(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Connect to DB and start
mongoose.connect(cfgMain.mongoUri, { autoIndex: false })
  .then(() => {
    loggerMain.info('MongoDB connected');
    app.listen(cfgMain.port, () => loggerMain.info(`Server listening on port ${cfgMain.port}`));
  })
  .catch((err) => {
    loggerMain.info('MongoDB connection error: ' + err.message);
    process.exit(1);
  });
