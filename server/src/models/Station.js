'use strict';

const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
    {
        stationId: {
            type: String,
            required: [true, 'Station ID is required'],
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Station name is required'],
            trim: true,
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
            address: { type: String, trim: true },
        },
        status: {
            type: String,
            enum: ['available', 'in_use', 'offline', 'fault'],
            default: 'offline',
        },
        connectorType: {
            type: String,
            enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T'],
            required: true,
        },
        maxPowerKW: { type: Number, required: true, min: 0 },
        pricePerKWh: { type: Number, required: true, min: 0 },
        lastHeartbeat: { type: Date },
        mqttTopic: { type: String },
    },
    { timestamps: true }
);

// Geospatial index for proximity queries
stationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', stationSchema);
