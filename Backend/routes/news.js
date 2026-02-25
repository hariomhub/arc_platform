import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as newsController from '../controllers/newsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

const newsValidation = [
    body('title').trim().notEmpty().withMessage('News title is required.').isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer.'),
    body('summary').optional().trim(),
    body('link').optional({ checkFalsy: true }).trim().isURL().withMessage('Link must be a valid URL.'),
];

// Public
router.get('/', newsController.getNews);
router.get('/:id', newsController.getNewsById);

// Admin only
router.post('/', auth, requireRole('admin'), newsValidation, validate, newsController.createNews);
router.put('/:id', auth, requireRole('admin'), newsValidation, validate, newsController.updateNews);
router.delete('/:id', auth, requireRole('admin'), newsController.deleteNews);

export default router;
