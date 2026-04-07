import { Router } from 'express';
import * as notificationsController from '../controllers/notificationsController.js';
import auth from '../middleware/auth.js';

const router = Router();

// All notification routes require authentication
router.use(auth);

// ── Token management ──────────────────────────────────────────────────────────
router.post('/register-token',   notificationsController.registerToken);
router.delete('/register-token', notificationsController.removeToken);

// ── Bell icon feed ────────────────────────────────────────────────────────────
router.get('/',             notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);

// ── Read receipts ─────────────────────────────────────────────────────────────
router.patch('/read-all',    notificationsController.markAllAsRead);
router.patch('/:id/read',    notificationsController.markAsRead);

export default router;