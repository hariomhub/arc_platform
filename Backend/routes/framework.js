import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as frameworkController from '../controllers/frameworkController.js';
import authenticate from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── File Upload Configuration ────────────────────────────────────────────────

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/framework/templates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel, Word, and Text files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (No authentication required)
// ═══════════════════════════════════════════════════════════════════════════════

// Get all published framework pillars
router.get('/pillars', frameworkController.getPillars);

// Get all published maturity levels
router.get('/maturity-levels', frameworkController.getMaturityLevels);

// Get complete implementation guide (phases + steps)
router.get('/implementation-guide', frameworkController.getImplementationGuide);

// Get all published audit templates
router.get('/audit-templates', frameworkController.getAuditTemplates);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES (Require authentication + admin role)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Framework Pillars (Admin) ────────────────────────────────────────────────

router.get('/admin/pillars', authenticate, requireRole('admin'), frameworkController.getAllPillarsAdmin);
router.post('/admin/pillars', authenticate, requireRole('admin'), frameworkController.createPillar);
router.put('/admin/pillars/:id', authenticate, requireRole('admin'), frameworkController.updatePillar);
router.delete('/admin/pillars/:id', authenticate, requireRole('admin'), frameworkController.deletePillar);

// ─── Maturity Levels (Admin) ──────────────────────────────────────────────────

router.get('/admin/maturity-levels', authenticate, requireRole('admin'), frameworkController.getAllMaturityLevelsAdmin);
router.post('/admin/maturity-levels', authenticate, requireRole('admin'), frameworkController.createMaturityLevel);
router.put('/admin/maturity-levels/:id', authenticate, requireRole('admin'), frameworkController.updateMaturityLevel);
router.delete('/admin/maturity-levels/:id', authenticate, requireRole('admin'), frameworkController.deleteMaturityLevel);

// ─── Implementation Phases (Admin) ────────────────────────────────────────────

router.get('/admin/phases', authenticate, requireRole('admin'), frameworkController.getAllPhasesAdmin);
router.post('/admin/phases', authenticate, requireRole('admin'), frameworkController.createPhase);
router.put('/admin/phases/:id', authenticate, requireRole('admin'), frameworkController.updatePhase);
router.delete('/admin/phases/:id', authenticate, requireRole('admin'), frameworkController.deletePhase);

// ─── Implementation Steps (Admin) ─────────────────────────────────────────────

router.get('/admin/phases/:phaseId/steps', authenticate, requireRole('admin'), frameworkController.getStepsByPhase);
router.post('/admin/steps', authenticate, requireRole('admin'), frameworkController.createStep);
router.put('/admin/steps/:id', authenticate, requireRole('admin'), frameworkController.updateStep);
router.delete('/admin/steps/:id', authenticate, requireRole('admin'), frameworkController.deleteStep);

// ─── Audit Templates (Admin) ──────────────────────────────────────────────────

router.get('/admin/audit-templates', authenticate, requireRole('admin'), frameworkController.getAllAuditTemplatesAdmin);
router.post('/admin/audit-templates', authenticate, requireRole('admin'), upload.single('file'), frameworkController.createAuditTemplate);
router.put('/admin/audit-templates/:id', authenticate, requireRole('admin'), upload.single('file'), frameworkController.updateAuditTemplate);
router.delete('/admin/audit-templates/:id', authenticate, requireRole('admin'), frameworkController.deleteAuditTemplate);

export default router;
