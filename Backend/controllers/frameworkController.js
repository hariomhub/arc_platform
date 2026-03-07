import db from '../db/connection.js';

// ─── Helper function to safely parse JSON fields ──────────────────────────────
const safeJSONParse = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value; // Already parsed
  if (typeof value === 'object') return value; // Already an object
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('JSON parse error:', error, 'Value:', value);
    return defaultValue;
  }
};

// ─── Get All Framework Pillars ────────────────────────────────────────────────
export const getPillars = async (req, res) => {
  try {
    const [pillars] = await db.query(
      `SELECT id, title, description, tags, insight, display_order, status, 
              created_by, updated_by, created_at, updated_at
       FROM framework_pillars 
       WHERE status = 'published' 
       ORDER BY display_order ASC`
    );
    
    // Parse JSON fields
    const parsedPillars = pillars.map(pillar => ({
      ...pillar,
      tags: safeJSONParse(pillar.tags, [])
    }));
    
    res.json({ success: true, data: parsedPillars });
  } catch (error) {
    console.error('Error fetching pillars:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch framework pillars' });
  }
};

// ─── Get All Maturity Levels ──────────────────────────────────────────────────
export const getMaturityLevels = async (req, res) => {
  try {
    const [levels] = await db.query(
      `SELECT id, level, name, color, light_bg, border_color, description, 
              characteristics, actions, percentage, status,
              created_by, updated_by, created_at, updated_at
       FROM framework_maturity_levels 
       WHERE status = 'published' 
       ORDER BY level ASC`
    );
    
    // Parse JSON fields
    const parsedLevels = levels.map(lvl => ({
      ...lvl,
      lightBg: lvl.light_bg,
      borderColor: lvl.border_color,
      pct: lvl.percentage,
      characteristics: safeJSONParse(lvl.characteristics, []),
      actions: safeJSONParse(lvl.actions, [])
    }));
    
    res.json({ success: true, data: parsedLevels });
  } catch (error) {
    console.error('Error fetching maturity levels:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maturity levels' });
  }
};

// ─── Get Implementation Guide (Phases + Steps) ────────────────────────────────
export const getImplementationGuide = async (req, res) => {
  try {
    // First get all phases
    const [phases] = await db.query(
      `SELECT id, phase_number, phase_label, title, duration, icon, display_order, status
       FROM framework_implementation_phases 
       WHERE status = 'published' 
       ORDER BY display_order ASC`
    );
    
    // For each phase, get its steps
    const guide = await Promise.all(
      phases.map(async (phase) => {
        const [steps] = await db.query(
          `SELECT id, step_number, title, description, display_order
           FROM framework_implementation_steps 
           WHERE phase_id = ? AND status = 'published' 
           ORDER BY display_order ASC`,
          [phase.id]
        );
        
        return {
          phase: phase.phase_label,
          title: phase.title,
          duration: phase.duration,
          icon: phase.icon,
          steps: steps.map(s => ({
            step: s.step_number,
            title: s.title,
            desc: s.description
          }))
        };
      })
    );
    
    res.json({ success: true, data: guide });
  } catch (error) {
    console.error('Error fetching implementation guide:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch implementation guide' });
  }
};

// ─── Get All Audit Templates ──────────────────────────────────────────────────
export const getAuditTemplates = async (req, res) => {
  try {
    const [templates] = await db.query(
      `SELECT id, template_id, title, category, format, description, fields,
              file_url, file_name, file_type, file_size, display_order, status,
              created_by, updated_by, created_at, updated_at
       FROM framework_audit_templates 
       WHERE status = 'published' 
       ORDER BY display_order ASC`
    );
    
    // Parse JSON fields
    const parsedTemplates = templates.map(tmpl => ({
      id: tmpl.template_id,
      title: tmpl.title,
      category: tmpl.category,
      format: tmpl.format,
      description: tmpl.description,
      fields: safeJSONParse(tmpl.fields, []),
      fileUrl: tmpl.file_url,
      fileName: tmpl.file_name,
      fileType: tmpl.file_type,
      fileSize: tmpl.file_size
    }));
    
    res.json({ success: true, data: parsedTemplates });
  } catch (error) {
    console.error('Error fetching audit templates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit templates' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CRUD OPERATIONS (Protected by requireRole middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PILLARS ──────────────────────────────────────────────────────────────────

export const createPillar = async (req, res) => {
  try {
    const { title, description, tags, insight, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    if (!title || !description || !insight) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const [result] = await db.query(
      `INSERT INTO framework_pillars 
       (title, description, tags, insight, display_order, status, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, 
        description, 
        JSON.stringify(tags || []), 
        insight, 
        displayOrder || 0,
        status || 'draft',
        userId,
        userId
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Pillar created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating pillar:', error);
    res.status(500).json({ success: false, message: 'Failed to create pillar' });
  }
};

export const updatePillar = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, insight, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    const [result] = await db.query(
      `UPDATE framework_pillars 
       SET title = ?, description = ?, tags = ?, insight = ?, 
           display_order = ?, status = ?, updated_by = ?
       WHERE id = ?`,
      [
        title, 
        description, 
        JSON.stringify(tags || []), 
        insight, 
        displayOrder,
        status,
        userId,
        id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pillar not found' });
    }
    
    res.json({ success: true, message: 'Pillar updated successfully' });
  } catch (error) {
    console.error('Error updating pillar:', error);
    res.status(500).json({ success: false, message: 'Failed to update pillar' });
  }
};

export const deletePillar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM framework_pillars WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pillar not found' });
    }
    
    res.json({ success: true, message: 'Pillar deleted successfully' });
  } catch (error) {
    console.error('Error deleting pillar:', error);
    res.status(500).json({ success: false, message: 'Failed to delete pillar' });
  }
};

export const getAllPillarsAdmin = async (req, res) => {
  try {
    const [pillars] = await db.query(
      `SELECT p.*, 
              u1.name as creator_name, 
              u2.name as updater_name
       FROM framework_pillars p
       LEFT JOIN users u1 ON p.created_by = u1.id
       LEFT JOIN users u2 ON p.updated_by = u2.id
       ORDER BY p.display_order ASC`
    );
    
    const parsedPillars = pillars.map(pillar => ({
      ...pillar,
      tags: safeJSONParse(pillar.tags, [])
    }));
    
    res.json({ success: true, data: parsedPillars });
  } catch (error) {
    console.error('Error fetching pillars (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pillars' });
  }
};

// ─── MATURITY LEVELS ──────────────────────────────────────────────────────────

export const createMaturityLevel = async (req, res) => {
  try {
    const { level, name, color, lightBg, borderColor, description, characteristics, actions, percentage, status } = req.body;
    const userId = req.user.id;
    
    if (!level || !name || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const [result] = await db.query(
      `INSERT INTO framework_maturity_levels 
       (level, name, color, light_bg, border_color, description, characteristics, actions, percentage, status, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level, 
        name, 
        color || '#64748B',
        lightBg || '#F8FAFC',
        borderColor || '#E2E8F0',
        description, 
        JSON.stringify(characteristics || []),
        JSON.stringify(actions || []),
        percentage || 25,
        status || 'draft',
        userId,
        userId
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Maturity level created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating maturity level:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Maturity level number already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create maturity level' });
  }
};

export const updateMaturityLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, name, color, lightBg, borderColor, description, characteristics, actions, percentage, status } = req.body;
    const userId = req.user.id;
    
    const [result] = await db.query(
      `UPDATE framework_maturity_levels 
       SET level = ?, name = ?, color = ?, light_bg = ?, border_color = ?,
           description = ?, characteristics = ?, actions = ?, percentage = ?,
           status = ?, updated_by = ?
       WHERE id = ?`,
      [
        level, 
        name, 
        color,
        lightBg,
        borderColor,
        description, 
        JSON.stringify(characteristics || []),
        JSON.stringify(actions || []),
        percentage,
        status,
        userId,
        id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Maturity level not found' });
    }
    
    res.json({ success: true, message: 'Maturity level updated successfully' });
  } catch (error) {
    console.error('Error updating maturity level:', error);
    res.status(500).json({ success: false, message: 'Failed to update maturity level' });
  }
};

export const deleteMaturityLevel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM framework_maturity_levels WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Maturity level not found' });
    }
    
    res.json({ success: true, message: 'Maturity level deleted successfully' });
  } catch (error) {
    console.error('Error deleting maturity level:', error);
    res.status(500).json({ success: false, message: 'Failed to delete maturity level' });
  }
};

export const getAllMaturityLevelsAdmin = async (req, res) => {
  try {
    const [levels] = await db.query(
      `SELECT l.*, 
              u1.name as creator_name, 
              u2.name as updater_name
       FROM framework_maturity_levels l
       LEFT JOIN users u1 ON l.created_by = u1.id
       LEFT JOIN users u2 ON l.updated_by = u2.id
       ORDER BY l.level ASC`
    );
    
    const parsedLevels = levels.map(lvl => ({
      ...lvl,
      characteristics: safeJSONParse(lvl.characteristics, []),
      actions: safeJSONParse(lvl.actions, [])
    }));
    
    res.json({ success: true, data: parsedLevels });
  } catch (error) {
    console.error('Error fetching maturity levels (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maturity levels' });
  }
};

// ─── IMPLEMENTATION PHASES ────────────────────────────────────────────────────

export const createPhase = async (req, res) => {
  try {
    const { phaseNumber, phaseLabel, title, duration, icon, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    if (!phaseNumber || !phaseLabel || !title || !duration) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const [result] = await db.query(
      `INSERT INTO framework_implementation_phases 
       (phase_number, phase_label, title, duration, icon, display_order, status, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [phaseNumber, phaseLabel, title, duration, icon || '🏛️', displayOrder || 0, status || 'draft', userId, userId]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Implementation phase created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating phase:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Phase number already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create phase' });
  }
};

export const updatePhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { phaseNumber, phaseLabel, title, duration, icon, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    const [result] = await db.query(
      `UPDATE framework_implementation_phases 
       SET phase_number = ?, phase_label = ?, title = ?, duration = ?, icon = ?,
           display_order = ?, status = ?, updated_by = ?
       WHERE id = ?`,
      [phaseNumber, phaseLabel, title, duration, icon, displayOrder, status, userId, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Phase not found' });
    }
    
    res.json({ success: true, message: 'Phase updated successfully' });
  } catch (error) {
    console.error('Error updating phase:', error);
    res.status(500).json({ success: false, message: 'Failed to update phase' });
  }
};

export const deletePhase = async (req, res) => {
  try {
    const { id } = req.params;
    
    // This will cascade delete associated steps
    const [result] = await db.query('DELETE FROM framework_implementation_phases WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Phase not found' });
    }
    
    res.json({ success: true, message: 'Phase and associated steps deleted successfully' });
  } catch (error) {
    console.error('Error deleting phase:', error);
    res.status(500).json({ success: false, message: 'Failed to delete phase' });
  }
};

export const getAllPhasesAdmin = async (req, res) => {
  try {
    const [phases] = await db.query(
      `SELECT p.*, 
              u1.name as creator_name, 
              u2.name as updater_name
       FROM framework_implementation_phases p
       LEFT JOIN users u1 ON p.created_by = u1.id
       LEFT JOIN users u2 ON p.updated_by = u2.id
       ORDER BY p.display_order ASC`
    );
    
    res.json({ success: true, data: phases });
  } catch (error) {
    console.error('Error fetching phases (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch phases' });
  }
};

// ─── IMPLEMENTATION STEPS ─────────────────────────────────────────────────────

export const createStep = async (req, res) => {
  try {
    const { phaseId, stepNumber, title, description, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    if (!phaseId || !stepNumber || !title || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const [result] = await db.query(
      `INSERT INTO framework_implementation_steps 
       (phase_id, step_number, title, description, display_order, status, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [phaseId, stepNumber, title, description, displayOrder || 0, status || 'draft', userId, userId]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Implementation step created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating step:', error);
    res.status(500).json({ success: false, message: 'Failed to create step' });
  }
};

export const updateStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { phaseId, stepNumber, title, description, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    const [result] = await db.query(
      `UPDATE framework_implementation_steps 
       SET phase_id = ?, step_number = ?, title = ?, description = ?,
           display_order = ?, status = ?, updated_by = ?
       WHERE id = ?`,
      [phaseId, stepNumber, title, description, displayOrder, status, userId, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Step not found' });
    }
    
    res.json({ success: true, message: 'Step updated successfully' });
  } catch (error) {
    console.error('Error updating step:', error);
    res.status(500).json({ success: false, message: 'Failed to update step' });
  }
};

export const deleteStep = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM framework_implementation_steps WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Step not found' });
    }
    
    res.json({ success: true, message: 'Step deleted successfully' });
  } catch (error) {
    console.error('Error deleting step:', error);
    res.status(500).json({ success: false, message: 'Failed to delete step' });
  }
};

export const getStepsByPhase = async (req, res) => {
  try {
    const { phaseId } = req.params;
    
    const [steps] = await db.query(
      `SELECT s.*, 
              u1.name as creator_name, 
              u2.name as updater_name
       FROM framework_implementation_steps s
       LEFT JOIN users u1 ON s.created_by = u1.id
       LEFT JOIN users u2 ON s.updated_by = u2.id
       WHERE s.phase_id = ?
       ORDER BY s.display_order ASC`,
      [phaseId]
    );
    
    res.json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching steps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch steps' });
  }
};

// ─── AUDIT TEMPLATES ──────────────────────────────────────────────────────────

export const createAuditTemplate = async (req, res) => {
  try {
    const { templateId, title, category, format, description, fields, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    if (!templateId || !title || !category || !format || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Handle file upload if present
    let fileUrl = null, fileName = null, fileType = null, fileSize = null;
    if (req.file) {
      fileUrl = `/uploads/framework/templates/${req.file.filename}`;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      fileSize = req.file.size;
    }
    
    const [result] = await db.query(
      `INSERT INTO framework_audit_templates 
       (template_id, title, category, format, description, fields, file_url, file_name, file_type, file_size, display_order, status, created_by, updated_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId, 
        title, 
        category, 
        format, 
        description, 
        JSON.stringify(fields || []),
        fileUrl,
        fileName,
        fileType,
        fileSize,
        displayOrder || 0, 
        status || 'draft', 
        userId, 
        userId
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Audit template created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating audit template:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Template ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create audit template' });
  }
};

export const updateAuditTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { templateId, title, category, format, description, fields, displayOrder, status } = req.body;
    const userId = req.user.id;
    
    // Handle file upload if present
    let fileUpdateQuery = '';
    let params = [templateId, title, category, format, description, JSON.stringify(fields || []), displayOrder, status, userId];
    
    if (req.file) {
      fileUpdateQuery = ', file_url = ?, file_name = ?, file_type = ?, file_size = ?';
      params.push(
        `/uploads/framework/templates/${req.file.filename}`,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );
    }
    
    params.push(id);
    
    const [result] = await db.query(
      `UPDATE framework_audit_templates 
       SET template_id = ?, title = ?, category = ?, format = ?, description = ?,
           fields = ?, display_order = ?, status = ?, updated_by = ?${fileUpdateQuery}
       WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Audit template updated successfully' });
  } catch (error) {
    console.error('Error updating audit template:', error);
    res.status(500).json({ success: false, message: 'Failed to update audit template' });
  }
};

export const deleteAuditTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM framework_audit_templates WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Audit template deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit template:', error);
    res.status(500).json({ success: false, message: 'Failed to delete audit template' });
  }
};

export const getAllAuditTemplatesAdmin = async (req, res) => {
  try {
    const [templates] = await db.query(
      `SELECT t.*, 
              u1.name as creator_name, 
              u2.name as updater_name
       FROM framework_audit_templates t
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.updated_by = u2.id
       ORDER BY t.display_order ASC`
    );
    
    const parsedTemplates = templates.map(tmpl => ({
      ...tmpl,
      fields: safeJSONParse(tmpl.fields, [])
    }));
    
    res.json({ success: true, data: parsedTemplates });
  } catch (error) {
    console.error('Error fetching audit templates (admin):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit templates' });
  }
};
