require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

const StationConfig = require('../models/StationConfig');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const config = await StationConfig.getConfig();
    console.log('Config document:', config);

    await mongoose.disconnect();
    console.log('Done');
}

test().catch(console.error);