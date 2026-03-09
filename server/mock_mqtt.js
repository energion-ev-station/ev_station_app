// /tmp/mock_mqtt.js
const mqtt = require('mqtt');
require('dotenv').config({ path: './.env' }); // Run from server/

const brokerUrl = process.env.MQTT_BROKER_URL;
const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
    console.log('Connected to HiveMQ Cloud for mocking.');

    const stationId = 'Station1';
    const topic = `station/${stationId}/status`;

    // Accept arg: node mock_mqtt.js plugged | unplugged
    const eventArg = process.argv[2] || 'plugged';

    const message = JSON.stringify({ event: eventArg, sessionId: process.argv[3] });

    client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
            console.error('Error publishing:', err);
        } else {
            console.log(`Mock published to ${topic}: ${message}`);
        }
        client.end();
    });
});
