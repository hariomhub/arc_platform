-- ═══════════════════════════════════════════════════════════════════════════
-- Fix Character Encoding Issues in Framework Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- This script fixes emojis and special characters (en-dashes) that were
-- incorrectly encoded during initial import.
-- Run this if you see garbled text in the Implementation Phases.
-- ═══════════════════════════════════════════════════════════════════════════

USE arc_platform;

-- Set connection charset to UTF-8
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Fix Implementation Phases - Update emojis and en-dashes
UPDATE framework_implementation_phases SET 
  duration = '0–3 months',
  icon = '🏛️'
WHERE phase_number = 1;

UPDATE framework_implementation_phases SET 
  duration = '3–6 months',
  icon = '🔍'
WHERE phase_number = 2;

UPDATE framework_implementation_phases SET 
  duration = '6–12 months',
  icon = '🛡️'
WHERE phase_number = 3;

UPDATE framework_implementation_phases SET 
  duration = 'Ongoing',
  icon = '📊'
WHERE phase_number = 4;

-- Verify the fixes
SELECT phase_number, phase_label, title, duration, icon, status 
FROM framework_implementation_phases 
ORDER BY phase_number;
