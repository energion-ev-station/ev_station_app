const Session = require('../models/Session');
const User = require('../models/User');
const { publishCommand } = require('./mqttService');

const Transaction = require('../models/Transaction');

/**
 * Ends a charging session, calculates final billing, updates the DB,
 * and notifies the station via MQTT and the client via Socket.IO
 */
const endSession = async (sessionId, io, reason = 'Stopped by system') => {
    try {
        const session = await Session.findOne({ _id: sessionId, status: 'active' });
        if (!session) return; // Already completed or not found

        // 1. Mark session as completed
        session.status = 'completed';
        session.endTime = Date.now();
        
        // Add reason tracking (Req 6)
        if (!session.reasonEnded) {
            session.set('reasonEnded', reason, { strict: false });
        }
        
        await session.save();

        // 2. Create a transaction record for the total amount deducted
        if (session.amountDeducted > 0) {
            await Transaction.create({
                userId: session.userId,
                amount: session.amountDeducted,
                type: 'charge',
                description: `Charging session at station ${session.stationId}`,
            });
        }

        // 3. Fetch final wallet balance
        const user = await User.findById(session.userId).select('walletBalance');
        const finalBalance = user ? user.walletBalance : 0;

        // 4. Emit session:ended to the user
        const roomName = `user_${session.userId}`;
        io.to(roomName).emit('session:ended', {
            finalBalance,
            totalEnergy: session.energyConsumed,
            totalCost: session.amountDeducted,
            reasonEnded: reason,
            startTime: session.startTime,
            endTime: session.endTime
        });

        // 5. Ensure the hardware relay is turned off
        publishCommand(session.stationId, 'STOP');

        console.log(`[BillingService] Session ${sessionId} completed successfully.`);
    } catch (err) {
        console.error(`[BillingService] Error ending session ${sessionId}:`, err);
    }
};

/**
 * Processes incoming MQTT telemetry data from a charging station
 * @param {string} stationId - The ID of the station sending telemetry
 * @param {object} data - The payload { kWh, current, voltage, sessionId }
 * @param {object} io - The Socket.IO instance to push updates to the client
 */
const processMqttData = async (stationId, data, io) => {
    try {
        const { kWh, current, voltage, sessionId } = data;

        // 1. Find the active session
        const session = await Session.findOne({ _id: sessionId, status: 'active' });

        if (!session) {
            // No active session found for this ID (maybe it already finished or was canceled)
            return;
        }

        // 2. Calculate the incremental energy and cost since the LAST telemetry update
        const deltaEnergy = kWh - session.energyConsumed;

        if (deltaEnergy <= 0) {
            // No new energy consumed since last tick
            return;
        }

        const cost = deltaEnergy * session.pricePerUnit;

        // 3. Atomically update the Session (increment energy and cost)
        const updatedSession = await Session.findByIdAndUpdate(
            sessionId,
            {
                $inc: {
                    energyConsumed: deltaEnergy,
                    amountDeducted: cost
                }
            },
            { new: true }
        );

        // 4. Atomically deduct the cost from the User's wallet (preventing negative balance)
        const updatedUser = await User.findOneAndUpdate(
            { _id: session.userId, walletBalance: { $gte: cost } },
            { $inc: { walletBalance: -cost } },
            { new: true }
        );

        let finalWalletBalance = updatedUser ? updatedUser.walletBalance : 0;

        // 5. If the wallet didn't have enough funds, atomic update failed.
        // We force it to 0 as a fallback (floor at 0).
        if (!updatedUser) {
            await User.updateOne(
                { _id: session.userId },
                { $set: { walletBalance: 0 } }
            );
            finalWalletBalance = 0;
        }

        // 6. Push real-time update to the specific user's private socket room
        const roomName = `user_${session.userId}`;
        io.to(roomName).emit('session:update', {
            energyConsumed: updatedSession.energyConsumed,
            amountDeducted: updatedSession.amountDeducted,
            walletBalance: finalWalletBalance,
            current,
            voltage
        });

        // 7. Check termination conditions: Reached energy limit OR Wallet empty
        if (updatedSession.energyConsumed >= session.maxEnergyLimit || finalWalletBalance <= 0) {
            console.log(`[BillingService] Session ${sessionId} reached limits. Stopping.`);

            // Publish STOP command to the physical station
            publishCommand(stationId, 'STOP');

            let reason = 'Stopped by system';
            if (finalWalletBalance <= 0) reason = 'Wallet empty';
            else if (updatedSession.energyConsumed >= session.maxEnergyLimit) reason = 'Energy limit reached';

            // Trigger the session end teardown
            await endSession(sessionId, io, reason);
        }

    } catch (err) {
        console.error(`[BillingService] Error processing MQTT data for station ${stationId}:`, err);
    }
};

module.exports = {
    processMqttData,
    endSession
};
