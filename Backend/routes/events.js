import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as eventsController from '../controllers/eventsController.js';
import * as regController from '../controllers/eventRegistrationsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// ── Multer: banner image upload ───────────────────────────────────────────────
const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/events';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `event-${req.params.id}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage: bannerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed.'), false);
    },
});

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
        .isIn(['webinar', 'seminar', 'workshop', 'podcast', 'conference']).withMessage('Category must be one of: webinar, seminar, workshop, podcast, conference.'),
    body('is_upcoming').optional().isBoolean().withMessage('is_upcoming must be true or false.'),
    body('is_published').optional().isBoolean().withMessage('is_published must be true or false.'),
    body('recording_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Recording URL must be a valid URL.'),
    body('banner_image').optional({ checkFalsy: true }).trim(),
];

// Public routes
router.get('/', eventsController.getEvents);

// ── Registration routes (auth required) — must be before /:id ─────────────────
router.get('/my-registrations', auth, regController.getMyRegistrations);

router.get('/:id', eventsController.getEventById);

// User registration for an event
router.post('/:id/register', auth, regController.registerForEvent);
router.delete('/:id/register', auth, regController.cancelRegistration);

// Admin: view all registrations for an event
router.get('/:id/registrations', auth, requireRole('admin'), regController.getEventRegistrations);

// Admin only
router.post('/', auth, requireRole('admin'), eventValidation, validate, eventsController.createEvent);
router.put('/:id', auth, requireRole('admin'), eventValidation, validate, eventsController.updateEvent);
router.patch('/:id/publish', auth, requireRole('admin'), eventsController.togglePublishEvent);
router.post('/:id/upload-banner', auth, requireRole('admin'), upload.single('banner'), eventsController.uploadBanner);
router.delete('/:id', auth, requireRole('admin'), eventsController.deleteEvent);

export default router;
