const express = require('express');
const path = require('node:path');
const helmet = require('helmet');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const bibliothequesRouter = require('./routes/bibliotheques');
const villesRouter = require('./routes/villes');
const imagesRouter = require('./routes/images');
const adminRouter = require('./routes/admin');
const avisRouter = require('./routes/avis');
const statsRouter = require('./routes/stats');
const signalementsRouter = require('./routes/signalements');
const notificationsRouter = require('./routes/notifications');
const activitesRouter = require('./routes/activites');

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.set('trust proxy', 2);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Disposition', 'inline');
  },
}));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/bibliotheques', bibliothequesRouter);
app.use('/api/villes', villesRouter);
app.use('/api/images', imagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/avis', avisRouter);
app.use('/api/stats', statsRouter);
app.use('/api/signalements', signalementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/activites', activitesRouter);

app.use(errorHandler);

module.exports = app;
