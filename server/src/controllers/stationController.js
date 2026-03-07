'use strict';

const Station = require('../models/Station');
const { publish, TOPICS } = require('../config/mqtt');

// GET /api/stations
const getAllStations = async (req, res, next) => {
    try {
        const { status, lat, lng, radius = 5000, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        // Proximity search if lat/lng provided
        if (lat && lng) {
            filter.location = {
                $near: {
                    $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: parseInt(radius, 10),
                },
            };
        }

        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [stations, total] = await Promise.all([
            Station.find(filter).skip(skip).limit(parseInt(limit, 10)).lean(),
            Station.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            total,
            page: parseInt(page, 10),
            pages: Math.ceil(total / parseInt(limit, 10)),
            stations,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/stations/:id
const getStation = async (req, res, next) => {
    try {
        const station = await Station.findById(req.params.id);
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
        return res.status(200).json({ success: true, station });
    } catch (err) {
        next(err);
    }
};

// POST /api/stations  (admin only)
const createStation = async (req, res, next) => {
    try {
        const station = await Station.create(req.body);
        return res.status(201).json({ success: true, station });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/stations/:id  (admin/operator)
const updateStation = async (req, res, next) => {
    try {
        const station = await Station.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
        return res.status(200).json({ success: true, station });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/stations/:id  (admin only)
const deleteStation = async (req, res, next) => {
    try {
        const station = await Station.findByIdAndDelete(req.params.id);
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
        return res.status(204).send();
    } catch (err) {
        next(err);
    }
};

// POST /api/stations/:id/command  – publish MQTT command to station
const sendCommand = async (req, res, next) => {
    try {
        const station = await Station.findById(req.params.id);
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });

        const topic = `ev/station/${station.stationId}/command`;
        publish(topic, { command: req.body.command, payload: req.body.payload });

        return res.status(200).json({ success: true, message: 'Command sent', topic });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllStations, getStation, createStation, updateStation, deleteStation, sendCommand };
