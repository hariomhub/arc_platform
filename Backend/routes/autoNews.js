import express from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import {
  getPendingNews,
  getApprovedNews,
  approveArticle,
  rejectArticle,
  bulkApproveArticles,
  bulkRejectArticles,
  deleteApprovedArticle,
  togglePublishStatus,
  toggleTrendingStatus,
  triggerNewsFetch,
  getFetchStats
} from '../controllers/autoNewsController.js';

const router = express.Router();

// ─── Admin Routes (Protected) ─────────────────────────────────────────────────
// All admin routes require authentication and founding_member or council_member role
router.use(auth);
router.use(requireRole('founding_member', 'council_member'));

// Get pending articles for review
router.get('/pending', getPendingNews);

// Get approved articles (for admin management)
router.get('/approved', getApprovedNews);

// Approve/reject single article
router.patch('/:id/approve', approveArticle);
router.patch('/:id/reject', rejectArticle);

// Bulk operations
router.post('/bulk-approve', bulkApproveArticles);
router.post('/bulk-reject', bulkRejectArticles);

// Delete article
router.delete('/:id', deleteApprovedArticle);

// Toggle publish status
router.patch('/:id/toggle-publish', togglePublishStatus);

// Toggle trending status
router.patch('/:id/toggle-trending', toggleTrendingStatus);

// Manual trigger news fetch
router.post('/trigger-fetch', triggerNewsFetch);

// Get fetch statistics
router.get('/stats', getFetchStats);

export default router;
