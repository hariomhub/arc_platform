import { debugAuth } from '../utils/debugLog.js';

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            debugAuth('[RequireRole] Access denied - user has role:', req.user.role, 'needs one of:', roles);
            return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to perform this action.' });
        }

        next();
    };
};

export default requireRole;
