const express = require('express');
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimiter');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth');

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticateToken, asyncHandler(authController.me));

module.exports = router;
