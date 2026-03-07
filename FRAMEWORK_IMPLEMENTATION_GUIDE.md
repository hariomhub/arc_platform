# Framework Content Management System - Implementation Guide

## Overview
This implementation transforms the hardcoded AI Risk Framework content into a fully dynamic, admin-manageable system with database integration. Admins can now manage all Framework content (Pillars, Maturity Levels, Implementation Guide, Audit Templates) directly through the AdminDashboard without code changes.

## What Was Changed

### 1. Database Schema (`Backend/db/framework_schema.sql`)
Created 5 new tables to store Framework content:

- **framework_pillars**: Core 6 pillars of AI governance
  - Fields: title, description, tags (JSON), insight, display_order, status, audit fields
  
- **framework_maturity_levels**: 4 maturity levels (Foundational, Defined, Managed, Optimized)
  - Fields: level, name, colors, description, characteristics (JSON), actions (JSON), percentage
  
- **framework_implementation_phases**: 4-phase implementation roadmap
  - Fields: phase_number, phase_label, title, duration, icon, display_order
  
- **framework_implementation_steps**: Detailed steps within each phase
  - Fields: phase_id (FK), step_number, title, description, display_order
  
- **framework_audit_templates**: 6 downloadable audit templates
  - Fields: template_id, title, category, format, description, fields (JSON), file_url, file handling
  
- **framework_security_tools** (optional): Security tools reference
  - For future expansion if security tools need to become dynamic

**Key Features:**
- All tables include `status` ENUM ('draft', 'published', 'archived') for workflow control
- `display_order` fields allow admins to control UI sequence
- `created_by` and `updated_by` FKs to users table for audit trail
- JSON columns for array data (tags, characteristics, actions, fields)
- Comprehensive seed data migrating existing hardcoded content
- Foreign keys with CASCADE DELETE for data integrity

### 2. Backend API

#### Controllers (`Backend/controllers/frameworkController.js`)
**Public Endpoints** (no auth required):
- `getPillars()` - Get published pillars ordered by display_order
- `getMaturityLevels()` - Get published maturity levels
- `getImplementationGuide()` - Get phases with nested steps
- `getAuditTemplates()` - Get published templates

**Admin Endpoints** (require admin role):
- **Pillars**: `getAllPillarsAdmin`, `createPillar`, `updatePillar`, `deletePillar`
- **Maturity Levels**: `getAllMaturityLevelsAdmin`, `createMaturityLevel`, `updateMaturityLevel`, `deleteMaturityLevel`
- **Phases**: `getAllPhasesAdmin`, `createPhase`, `updatePhase`, `deletePhase`
- **Steps**: `getStepsByPhase`, `createStep`, `updateStep`, `deleteStep`
- **Audit Templates**: `getAllAuditTemplatesAdmin`, `createAuditTemplate`, `updateAuditTemplate`, `deleteAuditTemplate`

**Features:**
- JSON parsing for array fields
- File upload handling for audit templates via multer
- Proper error handling with HTTP status codes
- Data transformation to match frontend expectations

#### Routes (`Backend/routes/framework.js`)
- Public routes: `/api/framework/*` (GET only)
- Admin routes: `/api/framework/admin/*` (all HTTP methods)
- File upload middleware configured for audit templates
- Accepts: PDF, Excel, Word, Text files (10MB limit)
- Proper authentication and role-based access control

#### Server Configuration (`Backend/server.js`)
- Added framework routes import
- Registered `/api/framework` route
- Added static file serving for `/uploads/framework/`

### 3. Frontend Updates

#### API Layer (`frontend/src/api/framework.js`)
Complete API wrapper with functions matching all backend endpoints:
- Public getters for Framework data
- Admin CRUD operations with proper FormData handling for file uploads
- Consistent error handling via axios interceptors

#### Framework Page (`frontend/src/pages/Framework.jsx`)
**Major Changes:**
1. Added state management for dynamic content:
   ```javascript
   const [pillars, setPillars] = useState([]);
   const [maturityLevels, setMaturityLevels] = useState([]);
   const [implementationGuide, setImplementationGuide] = useState([]);
   const [auditTemplates, setAuditTemplates] = useState([]);
   const [loading, setLoading] = useState(true);
   ```

2. Added `useEffect` hook to fetch data from API on component mount

3. Updated all section components to accept props:
   - `CorePillarsSection({ pillars = PILLARS })`
   - `MaturityLevelsSection({ maturityLevels = MATURITY_LEVELS })`
   - `ImplementationGuideSection({ implementationGuide = IMPLEMENTATION_GUIDE })`
   - `AuditTemplatesSection({ auditTemplates = AUDIT_TEMPLATES })`

4. Changed all section components from using hardcoded constants to props:
   - `PILLARS.map` → `pillars.map`
   - `MATURITY_LEVELS.map` → `maturityLevels.map`
   - etc.

5. Added loading spinner with graceful fallback to hardcoded data if API fails

6. Hardcoded constants remain as fallback data for backwards compatibility

#### Admin Dashboard (`frontend/src/pages/AdminDashboard.jsx`)
- Added new tab: "Framework Content" with Shield icon
- Imported and integrated `FrameworkManagement` component
- Tab accessible via `/admin?tab=framework`

#### Framework Management Component (`frontend/src/components/admin/FrameworkManagement.jsx`)
**Comprehensive admin interface (600+ lines) with:**

**Features:**
- Tabbed interface for managing each Framework entity type
- Full CRUD operations for all entities
- Inline editing with form validation
- Drag-and-drop reordering via display_order field
- Status management (draft/published/archived)
- File upload for audit templates
- Tag/array field handling (comma-separated input)
- JSON field parsing for characteristics, actions, fields
- Color picker integration for maturity levels
- Icon/emoji selector for implementation phases
- Real-time search and filtering
- Toast notifications for success/error feedback
- Responsive grid layouts
- Audit information display (creator, updater, timestamps)

**Form Components:**
- `PillarForm`: Title, description, tags, insight, display order, status
- `MaturityLevelForm`: Level number, name, colors (3 hex codes), description, characteristics, actions, percentage
- `PhaseForm`: Phase number, label, title, duration, icon, display order
- `TemplateForm`: Template ID, category, format, description, fields, file upload

**UI/UX:**
- Consistent navy blue (#003366) theme matching site design
- Card-based layouts with hover effects
- Expandable sections for detailed content
- Visual status indicators (published=green, draft=orange)
- Edit/Delete action buttons with confirmation dialogs
- Disabled state management to prevent concurrent edits

## Installation & Migration

### Step 1: Database Migration
```bash
cd Backend/db

# Option A: Run migration script
mysql -u your_user -p your_database < migrate_framework.sql

# Option B: Run schema directly
mysql -u your_user -p your_database < framework_schema.sql
```

### Step 2: Verify Migration
```sql
USE ai_risk_council;

-- Check tables exist
SHOW TABLES LIKE 'framework_%';

-- Verify seed data
SELECT COUNT(*) FROM framework_pillars WHERE status = 'published';           -- Should be 6
SELECT COUNT(*) FROM framework_maturity_levels WHERE status = 'published';  -- Should be 4
SELECT COUNT(*) FROM framework_implementation_phases WHERE status = 'published'; -- Should be 4
SELECT COUNT(*) FROM framework_implementation_steps WHERE status = 'published';  -- Should be 11
SELECT COUNT(*) FROM framework_audit_templates WHERE status = 'published';  -- Should be 6
```

### Step 3: Backend Setup
```bash
cd Backend

# Install dependencies (if not already done)
npm install

# Ensure multer is installed for file uploads
npm install multer

# Start server
npm start
```

### Step 4: Frontend Setup
```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

### Step 5: Test the System

1. **Test Public API** (no auth):
   ```
   GET http://localhost:5000/api/framework/pillars
   GET http://localhost:5000/api/framework/maturity-levels
   GET http://localhost:5000/api/framework/implementation-guide
   GET http://localhost:5000/api/framework/audit-templates
   ```

2. **Test Framework Page**:
   - Navigate to `/framework`
   - Verify all 6 pillars display
   - Check maturity levels section
   - Confirm implementation guide shows 4 phases
   - Verify audit templates render correctly

3. **Test Admin Interface**:
   - Login as admin
   - Navigate to `/admin`
   - Click "Framework Content" tab
   - Try creating a new pillar (set status to 'draft')
   - Edit an existing maturity level
   - Upload a template file for audit templates
   - Change display order and verify reordering works
   - Publish a draft item and verify it appears on public page

## API Documentation

### Public Endpoints

**GET /api/framework/pillars**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Risk Identification & Taxonomy",
      "description": "Systematically catalogue all AI risks...",
      "tags": ["NIST AI RMF", "ISO 23894", "Taxonomy"],
      "insight": "A shared taxonomy eliminates ambiguity...",
      "display_order": 1,
      "status": "published"
    }
  ]
}
```

**GET /api/framework/maturity-levels**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "level": 1,
      "name": "Foundational",
      "color": "#64748B",
      "lightBg": "#F8FAFC",
      "borderColor": "#E2E8F0",
      "description": "Ad-hoc risk management...",
      "characteristics": ["No dedicated AI risk policy or owner", ...],
      "actions": ["Appoint an AI Risk Owner or Committee", ...],
      "pct": 25
    }
  ]
}
```

**GET /api/framework/implementation-guide**
```json
{
  "success": true,
  "data": [
    {
      "phase": "Phase 1",
      "title": "Governance Foundation",
      "duration": "0–3 months",
      "icon": "🏛️",
      "steps": [
        {
          "step": "1.1",
          "title": "Establish an AI Risk Committee",
          "desc": "Form a cross-functional committee..."
        }
      ]
    }
  ]
}
```

**GET /api/framework/audit-templates**
```json
{
  "success": true,
  "data": [
    {
      "id": "T-01",
      "title": "AI System Intake & Classification Form",
      "category": "Governance",
      "format": "Excel / PDF",
      "description": "Used at the point of procuring...",
      "fields": ["System Name & Owner", "Business Use Case", ...],
      "fileUrl": "/uploads/framework/templates/template-123456.xlsx",
      "fileName": "AI_System_Intake_Form.xlsx"
    }
  ]
}
```

### Admin Endpoints (Require Admin Auth)

**POST /api/framework/admin/pillars**
```json
{
  "title": "New Pillar",
  "description": "Detailed description",
  "tags": ["Tag1", "Tag2"],
  "insight": "Key insight",
  "displayOrder": 7,
  "status": "draft"
}
```

**PUT /api/framework/admin/maturity-levels/:id**
```json
{
  "level": 1,
  "name": "Updated Name",
  "color": "#003366",
  "lightBg": "#EFF6FF",
  "borderColor": "#BFDBFE",
  "description": "Updated description",
  "characteristics": ["Char 1", "Char 2"],
  "actions": ["Action 1", "Action 2"],
  "percentage": 25,
  "status": "published"
}
```

**DELETE /api/framework/admin/pillars/:id**
```json
{
  "success": true,
  "message": "Pillar deleted successfully"
}
```

## File Upload Configuration

**Supported File Types:**
- PDF: `application/pdf`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Text: `text/plain`

**Storage:**
- Files saved to: `Backend/uploads/framework/templates/`
- Naming: `template-{timestamp}-{random}.{ext}`
- Max size: 10MB
- Served publicly via: `http://localhost:5000/uploads/framework/`

## Security Considerations

1. **Authentication**: All admin endpoints protected by `authenticate` middleware
2. **Authorization**: Admin role required via `requireRole('admin')`
3. **File Validation**: Type and size restrictions on uploads
4. **SQL Injection**: Parameterized queries used throughout
5 **XSS Prevention**: JSON fields properly escaped
6. **Audit Trail**: All changes tracked with created_by/updated_by user IDs
7. **Status Control**: Draft items not visible on public endpoints

## Future Enhancements

1. **Versioning**: Track historical changes to Framework content
2. **Approval Workflow**: Multi-step approval for publishing changes
3. **Preview Mode**: Preview draft content before publishing
4. **Template Builder**: Visual editor for audit template fields
5. **Import/Export**: Bulk import/export Framework data as JSON
6. **Internationalization**: Multi-language support for Framework content
7. **Analytics**: Track which templates are most downloaded
8. **Notifications**: Email admins when Framework content needs review
9. **Revision History**: Show complete edit history for each item
10. **Security Tools**: Make security tools section dynamic (schema already created)

## Troubleshooting

**Problem: Frontend shows "Loading framework content..." indefinitely**
- Check backend server is running on port 5000
- Verify database connection in `Backend/db/connection.js`
- Check browser console for CORS errors
- Confirm framework tables exist in database

**Problem: Admin tab shows blank/empty**
- Verify admin user role is 'admin' in users table
- Check browser console for JavaScript errors
- Ensure `FrameworkManagement` component imported correctly

**Problem: File upload fails**
- Check `uploads/framework/templates/` directory exists and is writable
- Verify file size under 10MB
- Confirm file type is supported
- Check multer middleware configuration in routes

**Problem: Changes not appearing on Framework page**
- Ensure item status is set to 'published' (not 'draft')
- Hard refresh browser (Ctrl+Shift+R) to clear cache
- Check display_order field matches intended sequence

## Code Architecture

```
Request Flow:
User → Framework.jsx → frameworkAPI.js → axios → Backend Routes → Controllers → Database
                                                                           ↓
Response Flow:
Database → Controllers → Routes → axios → frameworkAPI.js → Framework.jsx → User

Admin Flow:
Admin → AdminDashboard.jsx → FrameworkManagement.jsx → frameworkAPI.js → Backend
```

## Support & Maintenance

**Regular Maintenance:**
- Backup framework tables before major changes
- Review draft content monthly and archive outdated items
- Update audit templates as regulations change
- Monitor upload directory size

**Performance:**
- Framework content cached in frontend state
- Database indexes on status, display_order for fast queries
- JSON fields used sparingly to balance flexibility vs performance

## Conclusion

This implementation successfully transforms the AI Risk Framework from static hardcoded content to a fully dynamic, admin-manageable system while maintaining backwards compatibility and user experience. The system is production-ready with proper error handling, security controls, and extensibility for future enhancements.
