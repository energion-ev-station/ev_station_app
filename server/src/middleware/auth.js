'use strict';

const { verifyToken } = require('../utils/jwtUtils');

/**
 * Middleware to protect routes with JWT authentication.
 * Expects: Authorization: Bearer <token>
 */
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        req.user = verifyToken(token);
        next();
    } catch (err) {
        const message =
            err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(401).json({ success: false, message });
    }
};

/**
 * Role-based access control middleware.
 * Usage: restrict('admin') or restrict('admin', 'operator')
 */
const restrict = (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action',
            });
        }
        next();
    };

module.exports = { protect, restrict };
