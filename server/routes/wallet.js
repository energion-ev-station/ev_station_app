const express = require('express');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

// GET /api/wallet/balance
router.get('/balance', protect, async (req, res) => {
    try {
        res.json({ balance: req.user.walletBalance });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/wallet/transactions
// Returns last 20 transactions for the authenticated user, newest first
router.get('/transactions', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ timestamp: -1 })
            .limit(20)
            .populate('adminId', 'name')
            .lean();

        res.json({ transactions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
