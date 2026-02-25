// ─── Role constants ───────────────────────────────────────────────────────────
export const ROLES = {
    ADMIN: 'admin',
    EXECUTIVE: 'executive',
    PAID_MEMBER: 'paid_member',
    PRODUCT_COMPANY: 'product_company',
    UNIVERSITY: 'university',
    FREE_MEMBER: 'free_member',
};

export const ROLE_LABELS = {
    admin: 'Admin',
    executive: 'Executive',
    paid_member: 'Paid Member',
    product_company: 'Product Company',
    university: 'University',
    free_member: 'Free Member',
};

// Roles that can download frameworks
export const FRAMEWORK_DOWNLOAD_ROLES = [
    ROLES.ADMIN,
    ROLES.EXECUTIVE,
    ROLES.PAID_MEMBER,
    ROLES.PRODUCT_COMPANY,
];

// ─── Event categories ─────────────────────────────────────────────────────────
export const EVENT_CATEGORIES = ['all', 'webinar', 'seminar', 'workshop', 'podcast'];

// ─── Resource types ───────────────────────────────────────────────────────────
export const RESOURCE_TYPES = {
    FRAMEWORK: 'framework',
    WHITEPAPER: 'whitepaper',
    PRODUCT: 'product',
};

// ─── Routes ──────────────────────────────────────────────────────────────────
export const ROUTES = {
    HOME: '/',
    ABOUT: '/about',
    EVENTS: '/events',
    SERVICES: '/services',
    FRAMEWORK: '/framework',
    ASSESSMENT: '/assessment',
    RESOURCES: '/resources',
    CERTIFICATION: '/certification',
    COMMUNITY: '/community-qna',
    AI_RESEARCH: '/ai-research',
    CONTACT: '/contact',
    MEMBERSHIP: '/membership',
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
    ADMIN: '/admin-dashboard',
    ADMIN_USERS: '/admin-dashboard/users',
};

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
};

// ─── File limits ──────────────────────────────────────────────────────────────
export const FILE_LIMITS = {
    MAX_PDF_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
    ACCEPTED_PDF_TYPES: ['application/pdf'],
    ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    ACCEPTED_PDF_EXTENSIONS: ['.pdf'],
    ACCEPTED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
};

// ─── User status ──────────────────────────────────────────────────────────────
export const USER_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};
