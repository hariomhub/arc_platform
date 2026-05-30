import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import * as eventsController from '../controllers/eventsController.js';
import * as regController from '../controllers/eventRegistrationsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// ── Multer: image upload — memory storage; blob upload in controller ──────────
const upload = multer({
    storage: multer.memoryStorage(),
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
    body('title')
        .trim().notEmpty().withMessage('Event title is required.')
        .isLength({ max: 255 }).withMessage('Title must be 255 characters or fewer.'),
    body('date')
        .notEmpty().withMessage('Event date is required.')
        .isISO8601().withMessage('Date must be a valid ISO 8601 datetime.'),
    body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be 255 characters or fewer.'),
    body('description').optional().trim(),
    body('link').optional({ checkFalsy: true }).trim().isURL().withMessage('Event link must be a valid URL.'),
    body('event_category')
        .notEmpty().withMessage('Event category is required.')
        .isIn(['webinar', 'seminar', 'workshop', 'podcast', 'conference'])
        .withMessage('Category must be one of: webinar, seminar, workshop, podcast, conference.'),
    body('is_upcoming').optional().isBoolean().withMessage('is_upcoming must be true or false.'),
    body('is_published').optional().isBoolean().withMessage('is_published must be true or false.'),
    body('recording_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Recording URL must be a valid URL.'),
    body('banner_image').optional({ checkFalsy: true }).trim(),
    // New fields
    body('thumbnail_url').optional({ checkFalsy: true }).trim(),
    body('speaker_name').optional().trim().isLength({ max: 255 }),
    body('speaker_title').optional().trim().isLength({ max: 255 }),
    body('speaker_bio').optional().trim(),
    body('speaker_linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Speaker LinkedIn must be a valid URL.'),
    body('event_mode').optional().isIn(['online', 'in_person', 'hybrid']).withMessage('event_mode must be online, in_person, or hybrid.'),
    body('time_zone').optional().trim().isLength({ max: 100 }),
    body('agenda').optional().trim(),
    body('max_capacity').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Capacity must be a positive integer.'),
];

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', eventsController.getEvents);

// ── Registration routes (auth required) — must be before /:id ─────────────────
router.get('/my-registrations', auth, regController.getMyRegistrations);

router.get('/:id', eventsController.getEventById);

// ── User registration for an event ───────────────────────────────────────────
router.post('/:id/register', auth, regController.registerForEvent);
router.delete('/:id/register', auth, regController.cancelRegistration);

// ── Admin + Council Member: view all registrations for an event ───────────────
router.get('/:id/registrations', auth, requireRole('founding_member', 'council_member'), regController.getEventRegistrations);

// ── Admin (founding_member) + Council Member: create, update, upload, delete ──
router.post('/', auth, requireRole('founding_member', 'council_member'), eventValidation, validate, eventsController.createEvent);
router.put('/:id', auth, requireRole('founding_member', 'council_member'), eventValidation, validate, eventsController.updateEvent);

// Publish toggle: founding_member ONLY
router.patch('/:id/publish', auth, requireRole('founding_member'), eventsController.togglePublishEvent);

// Image uploads
router.post('/:id/upload-banner',        auth, requireRole('founding_member', 'council_member'), upload.single('banner'),        eventsController.uploadBanner);
router.post('/:id/upload-thumbnail',     auth, requireRole('founding_member', 'council_member'), upload.single('thumbnail'),     eventsController.uploadThumbnail);
router.post('/:id/upload-speaker-photo', auth, requireRole('founding_member', 'council_member'), upload.single('speaker_photo'), eventsController.uploadSpeakerPhoto);

router.delete('/:id', auth, requireRole('founding_member', 'council_member'), eventsController.deleteEvent);

export default router;
