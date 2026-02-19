import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { login, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/logout', logout);

export default router;
