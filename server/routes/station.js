const express = require('express');
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');

const router = express.Router();

// Hardcoded station definitions — source of truth for station metadata.
// To add more stations in the future, just push to this array.
const STATIONS = [
    { id: 'station_01', name: 'Station Alpha', location: 'Block A' },
    { id: 'station_02', name: 'Station Beta', location: 'Block B' },
];

// GET /api/stations
// Returns each station with a live status derived from the Sessions collection.
// status: 'busy' if an active session exists for that stationId, else 'available'
router.get('/', protect, async (req, res, next) => {
    try {
        // Single query — fetch all active sessions whose stationId is one of our known stations.
        const activeSessions = await Session.find({
            stationId: { $in: STATIONS.map((s) => s.id) },
            status: 'active',
        })
            .select('stationId')
            .lean();

        // Build a Set of busy station IDs for O(1) lookup
        const busyIds = new Set(activeSessions.map((s) => s.stationId));

        const { plugStatuses } = require('../services/mqttService');
        
        const stations = STATIONS.map((station) => ({
            ...station,
            status: busyIds.has(station.id) ? 'busy' : 'available',
            isPluggedIn: plugStatuses.get(station.id) || false
        }));

        res.json({ stations });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
