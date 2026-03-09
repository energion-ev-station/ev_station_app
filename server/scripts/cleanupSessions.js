const mongoose = require('mongoose');
const Session = require('../models/Session');
require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB. Clearing orphaned active sessions...');
        const result = await Session.updateMany({ status: 'active' }, { status: 'completed', endTime: new Date() });
        console.log(`Cleaned up ${result.modifiedCount} active sessions.`);
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
