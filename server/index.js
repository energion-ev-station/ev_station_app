require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to DB
connectDB();

// Initialize MQTT Service
require('./services/mqttService');

// Middleware
//app.use(cors());
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
//
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/stations', require('./routes/station'));
app.use('/api/session', require('./routes/session'));
app.use('/api/admin', require('./routes/admin'));

const path = require('path');

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static React build
app.use(express.static(path.join(__dirname, '../client/dist')));

// All non-API routes go to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Server Error';

    // Log the stack trace only in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        message = 'Resource not found / Invalid ID format';
        statusCode = 400;
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        message = 'Duplicate field value entered (Already exists)';
        statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors).map((val) => val.message).join(', ');
        statusCode = 400;
    }

    res.status(statusCode).json({
        success: false,
        message,
        // Stack trace technically handled by console.error, but can be added to response if desired conditionally:
        // stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const http = require('http');
const { Server } = require('socket.io');
const { initSocket } = require('./socket/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Pass the io instance to our handler
initSocket(io);

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
