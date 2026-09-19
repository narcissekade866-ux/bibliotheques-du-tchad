const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

module.exports = router;
