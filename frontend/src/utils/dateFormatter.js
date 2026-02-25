// ─── dateFormatter.js ─────────────────────────────────────────────────────────

const safeDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Format: "March 15, 2025"
 */
export const formatDate = (dateStr) => {
    const d = safeDate(dateStr);
    if (!d) return 'Invalid date';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Format: "Mar 15, 2025 10:30 AM"
 */
export const formatDateTime = (dateStr) => {
    const d = safeDate(dateStr);
    if (!d) return 'Invalid date';
    return d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

/**
 * Format: "2 hours ago", "3 days ago", "1 month ago"
 */
export const timeAgo = (dateStr) => {
    const d = safeDate(dateStr);
    if (!d) return '';
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
    ];

    for (const { label, seconds: s } of intervals) {
        const count = Math.floor(seconds / s);
        if (count >= 1) return `${count} ${label}${count !== 1 ? 's' : ''} ago`;
    }
    return 'just now';
};

/**
 * Format: "2025-03-15" for input[type=date]
 */
export const toInputDate = (dateStr) => {
    const d = safeDate(dateStr);
    if (!d) return '';
    return d.toISOString().split('T')[0];
};

/**
 * Format: "2025-03-15T10:30" for input[type=datetime-local]
 */
export const toInputDateTime = (dateStr) => {
    const d = safeDate(dateStr);
    if (!d) return '';
    // Remove seconds and offset
    return d.toISOString().slice(0, 16);
};
