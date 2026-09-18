const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const healthRouter = require('./routes/health');

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

app.use('/api/health', healthRouter);

module.exports = app;
