const jwt = require('jsonwebtoken');

let io;

/**
 * Initialize Socket.IO with the HTTP server
 */
const initSocket = (serverIo) => {
    io = serverIo;

    io.on('connection', (socket) => {
        console.log(`Client connected: [${socket.id}]`);

        // Handle the client requesting to join their authenticated room
        joinUserRoom(socket);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: [${socket.id}]`);
        });
    });
};

/**
 * Listens for a 'join' event containing a JWT token.
 * If valid, the socket is added to a room named 'user_{userId}'.
 */
const joinUserRoom = (socket) => {
    socket.on('join', (data) => {
        try {
            if (!data || !data.token) {
                return socket.emit('error', { message: 'No token provided' });
            }

            // Verify the JWT
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Join the user-specific room for private emissions
            const roomName = `user_${userId}`;
            socket.join(roomName);

            console.log(`Socket [${socket.id}] joined room: ${roomName}`);
            console.log('User joined room:', roomName);

            // Confirm successful join back to the client
            socket.emit('joined', { room: roomName });
        } catch (err) {
            console.error('Socket join auth error:', err.message);
            socket.emit('error', { message: 'Invalid token' });
        }
    });
};

/**
 * Get the initialized IO instance to use in other files
 * (e.g., throwing events from controllers/services)
 */
const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {
    initSocket,
    getIo
};
