import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as adminController from '../controllers/adminController.js';
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

// All admin routes require authentication AND admin role
router.use(auth, requireRole('admin'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', adminController.getStats);

// ─── User Management ─────────────────────────────────────────────────────────

// GET /api/admin/pending-users  — users awaiting approval
router.get('/pending-users', adminController.getPendingUsers);

// GET /api/admin/all-users  — full user list with optional filters
router.get('/all-users', adminController.getUsers);

// POST /api/admin/users  — create user directly (admin sets role/status)
router.post(
    '/users',
    [
        body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 255 }),
        body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
        body('role')
            .optional()
            .isIn(['admin', 'free_member', 'paid_member', 'executive', 'university', 'product_company'])
            .withMessage('Invalid role.'),
        body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status.'),
        body('organization_name').optional().trim().isLength({ max: 255 }),
        body('linkedin_url').optional({ checkFalsy: true }).trim().isURL().withMessage('Must be a valid URL.'),
    ],
    validate,
    adminController.createUser
);

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', adminController.approveUser);

// PATCH /api/admin/users/:id/reject
router.patch('/users/:id/reject', adminController.rejectUser);

// PATCH /api/admin/users/:id/status  — general status update (pending/approved/rejected)
router.patch(
    '/users/:id/status',
    [
        body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Status must be: pending, approved, or rejected.'),
    ],
    validate,
    adminController.updateUserStatus
);

// PATCH /api/admin/users/:id/role
router.patch(
    '/users/:id/role',
    [
        body('role')
            .isIn(['admin', 'free_member', 'paid_member', 'executive', 'university', 'product_company'])
            .withMessage('Invalid role.'),
    ],
    validate,
    adminController.updateUserRole
);

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminController.deleteUser);

export default router;