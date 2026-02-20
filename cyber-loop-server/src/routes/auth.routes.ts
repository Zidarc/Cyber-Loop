import { Router } from 'express';
import { body } from 'express-validator';
import { authRateLimiter } from '../middleware/rateLimiter';
import { handleValidation } from '../middleware/validate';
import { verifyToken } from '../middleware/auth.middleware';
import { login, logout } from '../controllers/auth.controller';

const router = Router();

const loginValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
];

router.post('/login', authRateLimiter, loginValidation, handleValidation, login);
router.post('/logout', verifyToken, logout);

export default router;
