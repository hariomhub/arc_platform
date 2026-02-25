import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as eventsController from '../controllers/eventsController.js';
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

const eventValidation = [
    body('title').trim().notEmpty().withMessage('Event title is required.').isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer.'),
    body('date').notEmpty().withMessage('Event date is required.').isISO8601().withMessage('Date must be a valid ISO 8601 datetime.'),
    body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be 255 characters or fewer.'),
    body('description').optional().trim(),
    body('link').optional({ checkFalsy: true }).trim().isURL().withMessage('Event link must be a valid URL.'),
    body('event_category')
        .notEmpty().withMessage('Event category is required.')
        .isIn(['webinar', 'seminar', 'workshop', 'podcast']).withMessage('Category must be one of: webinar, seminar, workshop, podcast.'),
    body('is_upcoming').optional().isBoolean().withMessage('is_upcoming must be true or false.'),
    body('recording_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Recording URL must be a valid URL.'),
];

// Public routes
router.get('/', eventsController.getEvents);
router.get('/:id', eventsController.getEventById);

// Admin only
router.post('/', auth, requireRole('admin'), eventValidation, validate, eventsController.createEvent);
router.put('/:id', auth, requireRole('admin'), eventValidation, validate, eventsController.updateEvent);
router.delete('/:id', auth, requireRole('admin'), eventsController.deleteEvent);

export default router;
