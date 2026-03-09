const mqtt = require('mqtt');

// Connect to HiveMQ Cloud using credentials from environment variables
const brokerUrl = process.env.MQTT_BROKER_URL;
const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
};

const mqttClient = mqtt.connect(brokerUrl, options);

mqttClient.on('connect', () => {
    console.log('MQTT Connected to HiveMQ Cloud');
});

mqttClient.on('error', (error) => {
    console.error('MQTT Connection Error:', error);
});

mqttClient.on('reconnect', () => {
    console.log('MQTT Reconnecting...');
});

/**
 * Publishes a command to a specific station's control topic
 * @param {string} stationId - The ID of the station
 * @param {string} command - The command to send (e.g., 'START', 'STOP')
 * @param {object} payload - Additional data to send with the command
 */
const publishCommand = (stationId, command, payload = {}) => {
    const topic = `station/${stationId}/control`;
    const message = JSON.stringify({ command, ...payload });

    mqttClient.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
            console.error(`Error publishing to ${topic}:`, err);
        } else {
            console.log(`Published to ${topic}: ${message}`);
        }
    });
};

/**
 * Subscribes to a station's data and status topics
 * @param {string} stationId - The ID of the station to subscribe to
 */
const subscribeToStation = (stationId) => {
    const dataTopic = `station/${stationId}/data`;
    const statusTopic = `station/${stationId}/status`;

    mqttClient.subscribe([dataTopic, statusTopic], { qos: 1 }, (err) => {
        if (err) {
            console.error(`Error subscribing to station ${stationId}:`, err);
        } else {
            console.log(`Subscribed to ${dataTopic} and ${statusTopic}`);
        }
    });
};

// Setup incoming message listener
mqttClient.on('message', async (topic, message) => {
    try {
        console.log(`\n[MQTT] Received message on topic: ${topic}`);
        console.log(`[MQTT] Payload:`, message.toString());

        // Expected topics: station/{stationId}/data OR station/{stationId}/status
        const topicParts = topic.split('/');
        if (topicParts.length !== 3 || topicParts[0] !== 'station') return;

        const stationId = topicParts[1];
        const messageType = topicParts[2]; // 'data' or 'status'

        // Safely parse JSON payload
        const payload = JSON.parse(message.toString());

        // Get the initialized Socket.IO instance
        const { getIo } = require('../socket/socketHandler');
        let io;
        try {
            io = getIo();
        } catch (err) {
            console.warn('[MQTT] Socket.io not ready yet, skipping emit');
            return;
        }

        // We require billingService and models lazily inside the handler to prevent circular dependency issues
        const { processMqttData, endSession } = require('./billingService');
        const StationConfig = require('../models/StationConfig');

        if (messageType === 'data') {
            await processMqttData(stationId, payload, io);
        } else if (messageType === 'status') {
            if (payload.event === 'unplugged') {
                console.log(`[MQTT] Station ${stationId} unplugged.`);

                // Update global config
                await StationConfig.updateOne({ key: 'global' }, { isPluggedIn: false });

                // Terminate session if active
                if (payload.sessionId) {
                    console.log(`[MQTT] Ending active session ${payload.sessionId}.`);
                    await endSession(payload.sessionId, io);
                }
            } else if (payload.event === 'plugged') {
                console.log(`[MQTT] Station ${stationId} plugged in.`);
                await StationConfig.updateOne({ key: 'global' }, { isPluggedIn: true });
            }
        }
    } catch (err) {
        console.error(`[MQTT] Error processing message on topic ${topic}:`, err.message);
    }
});

// Export the singleton client and helper functions
module.exports = {
    mqttClient,
    publishCommand,
    subscribeToStation,
};
