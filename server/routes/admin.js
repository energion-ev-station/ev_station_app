const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const StationConfig = require('../models/StationConfig');

const router = express.Router();

// All admin routes require a valid JWT AND admin role
router.use(protect, adminOnly);

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /api/admin/users
// Returns all users with role 'user'.
// Supports optional ?search= for case-insensitive name or email filter.
router.get('/users', async (req, res) => {
    try {
        const { search } = req.query;

        const query = { role: 'user' };

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [{ name: regex }, { email: regex }];
        }

        const users = await User.find(query)
            .select('_id name email walletBalance')
            .lean();

        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/admin/users/:userId/balance
// Returns the wallet balance of a specific user.
router.get('/users/:userId/balance', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('_id name walletBalance')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ userId: user._id, name: user.name, walletBalance: user.walletBalance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

// POST /api/admin/wallet/recharge
// Body: { userId, amount }
// Atomically increments user walletBalance and creates a Transaction record.
router.post('/wallet/recharge', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        // Validate amount
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number' });
        }

        // Verify user exists and has role 'user'
        const user = await User.findOne({ _id: userId, role: 'user' });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Atomic increment — safe against concurrent recharge requests
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { walletBalance: amount } },
            { new: true, select: 'walletBalance' }
        );

        // Record the transaction
        await Transaction.create({
            userId,
            adminId: req.user._id,
            amount,
            type: 'recharge',
            description: `Wallet recharged by admin`,
        });

        res.json({
            message: 'Wallet recharged successfully',
            walletBalance: updatedUser.walletBalance,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Price ────────────────────────────────────────────────────────────────────

// GET /api/admin/price
// Returns current pricePerUnit from global StationConfig.
router.get('/price', async (req, res) => {
    try {
        const config = await StationConfig.getConfig();
        res.json({ pricePerUnit: config.pricePerUnit });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/admin/price
// Body: { pricePerUnit }
// Updates the global StationConfig pricing.
router.put('/price', async (req, res) => {
    try {
        const { pricePerUnit } = req.body;

        // Validate — must be a positive number
        if (!pricePerUnit || typeof pricePerUnit !== 'number' || pricePerUnit <= 0) {
            return res.status(400).json({ message: 'pricePerUnit must be a positive number' });
        }

        const config = await StationConfig.findOneAndUpdate(
            { key: 'global' },
            { pricePerUnit, updatedAt: new Date() },
            { new: true, upsert: true }
        );

        res.json({
            message: 'Price updated successfully',
            pricePerUnit: config.pricePerUnit,
            updatedAt: config.updatedAt,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

// GET /api/admin/sessions/active
// Returns the count of currently active sessions across all stations.
router.get('/sessions/active', async (req, res) => {
    try {
        const Session = require('../models/Session');
        const count = await Session.countDocuments({ status: 'active' });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
