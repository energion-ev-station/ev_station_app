const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stationId: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    energyConsumed: {
        type: Number,
        default: 0,
    },
    amountDeducted: {
        type: Number,
        default: 0,
    },
    maxEnergyLimit: {
        type: Number,
        required: true,
    },
    pricePerUnit: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active',
    },
});

module.exports = mongoose.model('Session', sessionSchema);
