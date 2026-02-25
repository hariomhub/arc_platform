import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as teamController from '../controllers/teamController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

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

// Multer for team member photos (images only, 5MB)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `team-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for team member photos.'), false);
        }
    },
});

const teamValidation = [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 255 }).withMessage('Name must be 255 characters or fewer.'),
    body('role').trim().notEmpty().withMessage('Role/title is required.').isLength({ max: 255 }).withMessage('Role must be 255 characters or fewer.'),
    body('bio').optional().trim(),
    body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('LinkedIn URL must be a valid URL.'),
];

// Public
router.get('/', teamController.getTeam);
router.get('/:id', teamController.getTeamMemberById);

// Admin only
router.post('/', auth, requireRole('admin'), upload.single('photo'), teamValidation, validate, teamController.createTeamMember);
router.put('/:id', auth, requireRole('admin'), upload.single('photo'), teamValidation, validate, teamController.updateTeamMember);
router.delete('/:id', auth, requireRole('admin'), teamController.deleteTeamMember);

export default router;
