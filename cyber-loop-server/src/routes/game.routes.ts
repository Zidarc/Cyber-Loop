import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { getState, getQuestion, submitAnswer } from '../controllers/game.controller';

const router = Router();

router.use(verifyToken);

router.get('/state', getState);
router.get('/node/:nodeId/question', getQuestion);
router.post('/answer', submitAnswer);

export default router;
