'use strict';

const Session = require('../models/Session');
const Station = require('../models/Station');
const { emitToRoom } = require('../config/socket');

// POST /api/sessions/start
const startSession = async (req, res, next) => {
    try {
        const { stationId } = req.body;
        const station = await Station.findById(stationId);

        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
        if (station.status !== 'available') {
            return res.status(409).json({ success: false, message: `Station is ${station.status}` });
        }

        const session = await Session.create({
            user: req.user.id,
            station: stationId,
            status: 'active',
            startTime: new Date(),
        });

        // Mark station as in_use
        station.status = 'in_use';
        await station.save();

        // Notify subscribers via Socket.IO
        emitToRoom(`station:${station._id}`, 'station:status', { status: 'in_use', sessionId: session._id });
        emitToRoom(`user:${req.user.id}`, 'session:started', { session });

        return res.status(201).json({ success: true, session });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/sessions/:id/stop
const stopSession = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id).populate('station');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        if (String(session.user) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        if (session.status !== 'active') {
            return res.status(409).json({ success: false, message: 'Session is not active' });
        }

        const endTime = new Date();
        const { energyDeliveredKWh = 0 } = req.body;
        const totalCost = energyDeliveredKWh * (session.station.pricePerKWh || 0);

        session.status = 'completed';
        session.endTime = endTime;
        session.energyDeliveredKWh = energyDeliveredKWh;
        session.totalCost = totalCost;
        await session.save();

        // Release station
        await Station.findByIdAndUpdate(session.station._id, { status: 'available' });

        emitToRoom(`station:${session.station._id}`, 'station:status', { status: 'available' });
        emitToRoom(`user:${req.user.id}`, 'session:completed', { session });

        return res.status(200).json({ success: true, session });
    } catch (err) {
        next(err);
    }
};

// GET /api/sessions  – authenticated user's history
const getMySessions = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const [sessions, total] = await Promise.all([
            Session.find({ user: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10))
                .populate('station', 'name stationId location'),
            Session.countDocuments({ user: req.user.id }),
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page, 10),
            pages: Math.ceil(total / parseInt(limit, 10)),
            sessions,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/sessions/:id
const getSession = async (req, res, next) => {
    try {
        const session = await Session.findById(req.params.id).populate('station user');
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        if (String(session.user._id) !== String(req.user.id) && req.user.role === 'user') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        return res.status(200).json({ success: true, session });
    } catch (err) {
        next(err);
    }
};

module.exports = { startSession, stopSession, getMySessions, getSession };
