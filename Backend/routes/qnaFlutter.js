import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as qnaController from '../controllers/qnaFlutterController.js';
import auth from '../middleware/auth.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// FEED
router.get('/feed', auth, qnaController.getFeed);
router.get('/saved/all', auth, qnaController.getSavedPosts);
router.get('/:id', auth, qnaController.getPostById);
router.get('/:id/comments', qnaController.getComments);

// CREATE POST (Chapter Lead only)
router.post(
    '/',
    auth,
    [
        body('title').trim().notEmpty(),
        body('body').trim().notEmpty(),
        body('post_type').isIn(['insight', 'question', 'case_study', 'news']),
    ],
    validate,
    qnaController.createPost
);

// DELETE POST
router.delete('/:id', auth, qnaController.deletePost);

// COMMENTS
router.post(
    '/:id/comments',
    auth,
    [body('body').trim().notEmpty()],
    validate,
    qnaController.createComment
);

// LIKE SYSTEM
router.post('/:id/like', auth, qnaController.likePost);
router.delete('/:id/like', auth, qnaController.unlikePost);

// SAVE / COLLECTION
router.post('/:id/save', auth, qnaController.savePost);
router.delete('/:id/save', auth, qnaController.unsavePost);

export default router;
