import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { handleValidation, loginValidation } from '../middleware/validate';
import { verifyToken } from '../middleware/auth.middleware';
import { login, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimiter, loginValidation, handleValidation, login);
router.post('/logout', verifyToken, logout);

export default router;
