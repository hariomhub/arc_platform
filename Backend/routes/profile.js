import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as profileController from '../controllers/profileController.js';
import auth from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, message: errors.array()[0].msg });
    }
    next();
};

// Multer for profile photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `avatar-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for profile photos.'), false);
        }
    },
});

// All profile routes require authentication
router.use(auth);

router.get('/', profileController.getProfile);

router.put(
    '/',
    upload.single('photo'),
    [
        body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 255 }),
        body('bio').optional().trim(),
        body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
        body('organization_name').optional().trim().isLength({ max: 255 }),
    ],
    validate,
    profileController.updateProfile
);

router.put(
    '/password',
    [
        body('currentPassword').notEmpty().withMessage('Current password is required.'),
        body('newPassword')
            .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
            .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
            .matches(/[0-9]/).withMessage('New password must contain at least one number.'),
    ],
    validate,
    profileController.changePassword
);

// GET /api/profile/my-resources
router.get('/my-resources', profileController.getMyResources);

// DELETE /api/profile/resources/:id  — only own resources
router.delete('/resources/:id', profileController.deleteMyResource);

export default router;
