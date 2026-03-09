const mongoose = require('mongoose');

const stationConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        unique: true,
    },
    pricePerUnit: {
        type: Number,
        required: true,
        default: 5,
    },
    isPluggedIn: {
        type: Boolean,
        default: false,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

stationConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne({ key: 'global' });
    if (!config) {
        config = await this.create({ key: 'global', pricePerUnit: 5 });
    }
    return config;
};

module.exports = mongoose.model('StationConfig', stationConfigSchema);
