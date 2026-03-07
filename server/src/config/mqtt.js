'use strict';

const mqtt = require('mqtt');
const logger = require('../utils/logger');

let client = null;

// Topic constants used across the app
const TOPICS = {
    STATION_STATUS: 'ev/station/+/status',
    STATION_COMMAND: 'ev/station/+/command',
    SESSION_UPDATE: 'ev/session/+/update',
};

const initMQTT = () => {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

    const options = {
        clientId: process.env.MQTT_CLIENT_ID || `ev_app_${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        ...(process.env.MQTT_USERNAME && { username: process.env.MQTT_USERNAME }),
        ...(process.env.MQTT_PASSWORD && { password: process.env.MQTT_PASSWORD }),
    };

    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        logger.info(`✅  MQTT connected to ${brokerUrl}`);
        // Subscribe to station and session topics
        Object.values(TOPICS).forEach((topic) => {
            client.subscribe(topic, { qos: 1 }, (err) => {
                if (err) logger.error(`MQTT subscribe error [${topic}]:`, err);
                else logger.info(`MQTT subscribed to ${topic}`);
            });
        });
    });

    client.on('message', (topic, payload) => {
        try {
            const data = JSON.parse(payload.toString());
            logger.info(`MQTT message [${topic}]`, data);
            // Dispatch to appropriate handler
            handleMQTTMessage(topic, data);
        } catch (err) {
            logger.error('Failed to parse MQTT message:', err);
        }
    });

    client.on('error', (err) => logger.error('MQTT error:', err));
    client.on('reconnect', () => logger.warn('MQTT reconnecting…'));
    client.on('offline', () => logger.warn('MQTT client offline'));

    return client;
};

/**
 * Route incoming MQTT messages to the right handler.
 */
const handleMQTTMessage = (topic, data) => {
    if (topic.match(/^ev\/station\/.+\/status$/)) {
        // TODO: update station status in DB / emit via Socket.IO
    } else if (topic.match(/^ev\/session\/.+\/update$/)) {
        // TODO: update session in DB / emit via Socket.IO
    }
};

/**
 * Publish a message to an MQTT topic.
 * @param {string} topic
 * @param {object|string} payload
 * @param {object} [options]
 */
const publish = (topic, payload, options = { qos: 1 }) => {
    if (!client || !client.connected) {
        logger.warn('MQTT client not connected – cannot publish');
        return;
    }
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    client.publish(topic, message, options, (err) => {
        if (err) logger.error(`MQTT publish error [${topic}]:`, err);
    });
};

const getClient = () => client;

module.exports = { initMQTT, publish, getClient, TOPICS };
module.exports.default = initMQTT;
