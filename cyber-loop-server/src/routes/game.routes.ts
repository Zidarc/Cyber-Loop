import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { answerRateLimiter } from '../middleware/rateLimiter';
import {
  getState,
  getQuestion,
  submitAnswer,
  getQuestionFile,
} from '../controllers/game.controller';
import {
  handleValidation,
  nodeQuestionValidation,
  questionFileValidation,
  gameAnswerValidation,
} from '../middleware/validate';

const router = Router();

router.use(verifyToken);

router.get('/state', getState);
router.get('/node/:nodeId/question', nodeQuestionValidation, handleValidation, getQuestion);
router.get('/question/:questionId/file', questionFileValidation, handleValidation, getQuestionFile);

// answerRateLimiter runs AFTER verifyToken (so req.user is already set),
// keyed per participantId to avoid cross-team interference on shared IPs.
router.post('/answer', answerRateLimiter, gameAnswerValidation, handleValidation, submitAnswer);

export default router;