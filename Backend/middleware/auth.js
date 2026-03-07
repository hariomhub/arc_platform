import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    const token = req.cookies?.arc_token;

    // Debug logging
    console.log('[Auth] Request to:', req.method, req.originalUrl);
    console.log('[Auth] Token present:', !!token);
    console.log('[Auth] All cookies:', Object.keys(req.cookies || {}));

    if (!token) {
        console.log('[Auth] ❌ No token found');
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('[Auth] ✅ Token valid for user:', decoded.email, 'role:', decoded.role);
        next();
    } catch (error) {
        console.log('[Auth] ❌ Token verification failed:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
    }
};

export default auth;