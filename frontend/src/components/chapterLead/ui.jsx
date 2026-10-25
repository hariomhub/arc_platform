/**
 * The shared UI kit moved to components/ui/kit.jsx so every screen (Join page, dashboards,
 * admin, Manage Users) uses one implementation. This file only re-exports it so the existing
 * imports keep working; new code should import from '../ui/kit.jsx'.
 */
export * from '../ui/kit.jsx';
