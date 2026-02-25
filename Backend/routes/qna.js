import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as qnaController from '../controllers/qnaController.js';
import auth from '../middleware/auth.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// Public
router.get('/', qnaController.getPosts);
router.get('/:id', qnaController.getPostById);

// Authenticated users only
router.post(
    '/',
    auth,
    [
        body('title').trim().notEmpty().withMessage('Post title is required.').isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer.'),
        body('body').trim().notEmpty().withMessage('Post body is required.'),
        body('tags').optional().trim().isLength({ max: 500 }).withMessage('Tags must be 500 characters or fewer.'),
    ],
    validate,
    qnaController.createPost
);

router.delete('/:id', auth, qnaController.deletePost);

// Answers
router.post(
    '/:id/answers',
    auth,
    [
        body('body').trim().notEmpty().withMessage('Answer body is required.'),
    ],
    validate,
    qnaController.createAnswer
);

router.delete('/answers/:id', auth, qnaController.deleteAnswer);

// Voting
router.post('/:id/vote', auth, qnaController.votePost);

export default router;
