'use strict';

const User = require('../models/User');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password });
        const token = signToken({ id: user._id, role: user.role });
        const refreshToken = signRefreshToken({ id: user._id });

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return res.status(201).json({ success: true, token, refreshToken, user });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password +refreshToken');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account suspended' });
        }

        const token = signToken({ id: user._id, role: user.role });
        const refreshToken = signRefreshToken({ id: user._id });
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        return res.status(200).json({ success: true, token, refreshToken, user });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token mismatch' });
        }

        const newToken = signToken({ id: user._id, role: user.role });
        const newRefreshToken = signRefreshToken({ id: user._id });
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        return res.status(200).json({ success: true, token: newToken, refreshToken: newRefreshToken });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('+refreshToken');
        if (user) {
            user.refreshToken = undefined;
            await user.save({ validateBeforeSave: false });
        }
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        return res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout, getMe };
