const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isTest ? 1000 : 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives d\'inscription, réessayez dans une heure' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10000 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, réessayez dans une minute' },
});

module.exports = { loginLimiter, registerLimiter, apiLimiter };
