import express from 'express';
import multer from 'multer';
import * as frameworkController from '../controllers/frameworkController.js';
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// ─── File Upload Configuration — memory storage; blob upload in controller ────
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel, Word, and Text files are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (No authentication required)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pillars', frameworkController.getPillars);
router.get('/maturity-levels', frameworkController.getMaturityLevels);
router.get('/implementation-guide', frameworkController.getImplementationGuide);
router.get('/audit-templates', frameworkController.getAuditTemplates);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (Require authentication + admin role)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Framework Pillars (Admin) ────────────────────────────────────────────────
router.get('/admin/pillars', authenticate, requireRole('founding_member'), frameworkController.getAllPillarsAdmin);
router.post('/admin/pillars', authenticate, requireRole('founding_member'), frameworkController.createPillar);
router.put('/admin/pillars/:id', authenticate, requireRole('founding_member'), frameworkController.updatePillar);
router.delete('/admin/pillars/:id', authenticate, requireRole('founding_member'), frameworkController.deletePillar);

// ─── Maturity Levels (Admin) ──────────────────────────────────────────────────
router.get('/admin/maturity-levels', authenticate, requireRole('founding_member'), frameworkController.getAllMaturityLevelsAdmin);
router.post('/admin/maturity-levels', authenticate, requireRole('founding_member'), frameworkController.createMaturityLevel);
router.put('/admin/maturity-levels/:id', authenticate, requireRole('founding_member'), frameworkController.updateMaturityLevel);
router.delete('/admin/maturity-levels/:id', authenticate, requireRole('founding_member'), frameworkController.deleteMaturityLevel);

// ─── Implementation Phases (Admin) ────────────────────────────────────────────
router.get('/admin/phases', authenticate, requireRole('founding_member'), frameworkController.getAllPhasesAdmin);
router.post('/admin/phases', authenticate, requireRole('founding_member'), frameworkController.createPhase);
router.put('/admin/phases/:id', authenticate, requireRole('founding_member'), frameworkController.updatePhase);
router.delete('/admin/phases/:id', authenticate, requireRole('founding_member'), frameworkController.deletePhase);

// ─── Implementation Steps (Admin) ─────────────────────────────────────────────
router.get('/admin/phases/:phaseId/steps', authenticate, requireRole('founding_member'), frameworkController.getStepsByPhase);
router.post('/admin/steps', authenticate, requireRole('founding_member'), frameworkController.createStep);
router.put('/admin/steps/:id', authenticate, requireRole('founding_member'), frameworkController.updateStep);
router.delete('/admin/steps/:id', authenticate, requireRole('founding_member'), frameworkController.deleteStep);

// ─── Audit Templates (Admin) ──────────────────────────────────────────────────
router.get('/admin/audit-templates', authenticate, requireRole('founding_member'), frameworkController.getAllAuditTemplatesAdmin);
router.post('/admin/audit-templates', authenticate, requireRole('founding_member'), upload.single('file'), frameworkController.createAuditTemplate);
router.put('/admin/audit-templates/:id', authenticate, requireRole('founding_member'), upload.single('file'), frameworkController.updateAuditTemplate);
router.delete('/admin/audit-templates/:id', authenticate, requireRole('founding_member'), frameworkController.deleteAuditTemplate);

export default router;
