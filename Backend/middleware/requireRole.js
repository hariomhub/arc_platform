const requireRole = (...roles) => {
    return (req, res, next) => {
        console.log('[RequireRole] User role:', req.user?.role, '| Required roles:', roles);
        
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        if (!roles.includes(req.user.role)) {
            console.log('[RequireRole] ❌ Access denied - user has role:', req.user.role, 'needs one of:', roles);
            return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to perform this action.' });
        }

        console.log('[RequireRole] ✅ Access granted for role:', req.user.role);
        next();
    };
};

export default requireRole;
