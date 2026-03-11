const express = require('express');
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');
const StationConfig = require('../models/StationConfig');
const User = require('../models/User');
const { publishCommand, subscribeToStation } = require('../services/mqttService');
const { endSession } = require('../services/billingService');
const { MINIMUM_WALLET_BALANCE } = require('../config/constants');
const { getIo } = require('../socket/socketHandler');

const router = express.Router();

// ─── START SESSION ────────────────────────────────────────────────────────────

// POST /api/session/start
// Body: { stationId }
router.post('/start', protect, async (req, res) => {
    try {
        const { stationId } = req.body;
        const userId = req.user._id;

        // 1. Check if user already has an active session
        const existingUserSession = await Session.findOne({ userId, status: 'active' });
        if (existingUserSession) {
            return res.status(400).json({ message: 'You already have an active charging session.' });
        }

        // 2. Check if station is busy (already has an active session by anyone)
        const busyStation = await Session.findOne({ stationId, status: 'active' });
        if (busyStation) {
            return res.status(400).json({ message: 'Station is busy.' });
        }

        // 3. Fetch current pricing from global config
        const config = await StationConfig.getConfig();
        const pricePerUnit = config.pricePerUnit;

        // 4. Verify minimum wallet balance
        const user = await User.findById(userId).select('walletBalance');
        if (user.walletBalance < MINIMUM_WALLET_BALANCE) {
            return res.status(400).json({
                message: `Insufficient wallet balance. Minimum ₹${MINIMUM_WALLET_BALANCE} required.`,
            });
        }

        // 5. Calculate max energy limit based on their exact balance
        const maxEnergyLimit = user.walletBalance / pricePerUnit;

        // 6. Create the Session document
        const session = await Session.create({
            userId,
            stationId,
            maxEnergyLimit,
            pricePerUnit,
            status: 'active',
        });

        // 7. Subscribe MQTT listener to this station's topics so we can receive telemetry
        subscribeToStation(stationId);

        // 8. Publish the START command to the hardware
        publishCommand(stationId, 'START', {
            sessionId: session._id,
            maxEnergyLimit
        });

        // 9. Start 60-second grace period timer (Virtual Plug Detection)
        setTimeout(async () => {
            try {
                const checkSession = await Session.findById(session._id);
                // If after 60s the session is still active but hasn't drawn any meaningful energy, cancel it
                if (checkSession && checkSession.status === 'active' && checkSession.energyConsumed === 0) {
                    console.log(`[Session] Auto-cancelling session ${session._id} due to 60s grace period timeout (0 energy drawn).`);
                    
                    publishCommand(stationId, 'STOP');
                    await endSession(session._id, getIo(), 'Timeout - No vehicle detected');
                }
            } catch (err) {
                console.error('[Session] Grace period check error:', err);
            }
        }, 60000);

        res.status(201).json({
            message: 'Charging session started successfully',
            session
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── STOP SESSION ─────────────────────────────────────────────────────────────

// POST /api/session/stop
router.post('/stop', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Find user's active session
        const session = await Session.findOne({ userId, status: 'active' });

        if (!session) {
            return res.status(404).json({ message: 'No active session found to stop.' });
        }

        // 2. Trigger the shutdown (which locks the station, bills the user, and emits to Socket.IO)
        const io = getIo();
        await endSession(session._id, io, 'Stopped by user');

        res.json({ message: 'Stop command issued successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET ACTIVE SESSION ───────────────────────────────────────────────────────

// GET /api/session/active
// Returns the user's active session (if any) populated with current wallet balance
router.get('/active', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find the active session
        const session = await Session.findOne({ userId, status: 'active' }).lean();

        if (!session) {
            return res.status(200).json({ session: null });
        }

        // Attach current wallet balance so the frontend UI can initialize accurately
        const user = await User.findById(userId).select('walletBalance').lean();
        session.walletBalance = user ? user.walletBalance : 0;

        res.status(200).json({ session });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
