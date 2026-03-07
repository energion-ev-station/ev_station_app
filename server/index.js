'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');
const initMQTT = require('./src/config/mqtt');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialise Socket.IO (attaches to same HTTP server)
initSocket(server);

// Connect to MongoDB, then start server
connectDB()
  .then(() => {
    // Initialise MQTT client after DB is ready
    initMQTT();

    server.listen(PORT, () => {
      logger.info(`🚀  Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received – shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
