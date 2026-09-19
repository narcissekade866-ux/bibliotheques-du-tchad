const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const bibliothequesRouter = require('./routes/bibliotheques');
const villesRouter = require('./routes/villes');

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
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/bibliotheques', bibliothequesRouter);
app.use('/api/villes', villesRouter);

module.exports = app;
