'use strict';

const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwtUtils');

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // ─── JWT Authentication Middleware ──────────────────────────────────────────
    io.use((socket, next) => {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(' ')[1];

        if (!token) return next(new Error('Authentication token missing'));

        try {
            const decoded = verifyToken(token);
            socket.user = decoded;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // ─── Connection Handler ─────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.id})`);

        // Join a room named after the user so we can push targeted events
        socket.join(`user:${socket.user?.id}`);

        // ── Station room subscription ──────────────────────────────────────────
        socket.on('subscribe:station', (stationId) => {
            socket.join(`station:${stationId}`);
            logger.info(`Socket ${socket.id} joined station:${stationId}`);
        });

        socket.on('unsubscribe:station', (stationId) => {
            socket.leave(`station:${stationId}`);
        });

        socket.on('disconnect', (reason) => {
            logger.info(`Socket disconnected: ${socket.id} – ${reason}`);
        });
    });

    logger.info('✅  Socket.IO initialised');
    return io;
};

/** Emit an event to a specific room (e.g. 'station:<id>' or 'user:<id>') */
const emitToRoom = (room, event, data) => {
    if (!io) {
        logger.warn('Socket.IO not initialised – cannot emit');
        return;
    }
    io.to(room).emit(event, data);
};

const getIO = () => io;

module.exports = { initSocket, emitToRoom, getIO };
module.exports.default = initSocket;
