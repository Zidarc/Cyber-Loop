import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param } from 'express-validator';

export const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters'),
];

export const gameAnswerValidation = [
  body('questionId')
    .isInt({ min: 1 })
    .withMessage('questionId must be a positive integer'),
  body('answer')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Answer must be 1-500 characters'),
];

export const nodeQuestionValidation = [
  param('nodeId')
    .isInt({ min: 1 })
    .withMessage('nodeId must be a positive integer'),
];

export const questionFileValidation = [
  param('questionId')
    .isInt({ min: 1 })
    .withMessage('questionId must be a positive integer'),
];

export function handleValidation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
}
