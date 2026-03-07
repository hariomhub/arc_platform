import jwt from 'jsonwebtoken';

/**
 * Optional authentication middleware
 * Sets req.user if valid token exists, but doesn't fail if no token
 * Useful for endpoints that support both authenticated and anonymous access
 */
const optionalAuth = (req, res, next) => {
    const token = req.cookies?.arc_token;

    if (!token) {
        // No token present, continue without user
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        // Invalid token, but don't fail - treat as anonymous
        req.user = null;
        next();
    }
};

export default optionalAuth;
