require('dotenv').config({ path: __dirname + '/.env' });
const connectDB = require('./config/db');
const Session = require('./models/Session');

connectDB().then(async () => {
    try {
        const STATIONS = [
            { id: 'station_01', name: 'Station Alpha', location: 'Block A' },
            { id: 'station_02', name: 'Station Beta', location: 'Block B' },
        ];
        const activeSessions = await Session.find({
            stationId: { $in: STATIONS.map((s) => s.id) },
            status: 'active',
        })
            .select('stationId')
            .lean();
        console.log("Success:", activeSessions);
    } catch (err) {
        console.log("Error:", err);
    }
    process.exit(0);
}).catch(err => {
    console.error("DB Connect error:", err);
    process.exit(1);
});
