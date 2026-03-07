'use strict';

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        station: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Station',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'cancelled', 'failed'],
            default: 'pending',
        },
        startTime: { type: Date },
        endTime: { type: Date },
        energyDeliveredKWh: { type: Number, default: 0, min: 0 },
        totalCost: { type: Number, default: 0, min: 0 },
        transactionId: { type: String, unique: true, sparse: true },
    },
    { timestamps: true }
);

// Virtual: duration in minutes
sessionSchema.virtual('durationMinutes').get(function () {
    if (!this.startTime || !this.endTime) return null;
    return Math.round((this.endTime - this.startTime) / 60000);
});

sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

// Index for user history queries
sessionSchema.index({ user: 1, createdAt: -1 });
sessionSchema.index({ station: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
