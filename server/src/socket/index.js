'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { encryptMessage } = require('../utils/encryption');

/**
 * Authenticate a socket connection via the JWT passed in
 * handshake auth or query params.
 */
async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}

/**
 * Register all Socket.io event handlers.
 */
function registerSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`[socket] connected: ${user.username} (${socket.id})`);

    // Mark user online
    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit('user-online', { userId: user._id });

    // ─── join-room ────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId }, ack) => {
      try {
        if (!roomId) return;

        const room = await Room.findOne({ _id: roomId, members: user._id });
        if (!room) {
          if (typeof ack === 'function') ack({ error: 'Room not found or access denied' });
          return;
        }

        socket.join(roomId);
        if (typeof ack === 'function') ack({ success: true, roomId });
      } catch (err) {
        console.error('[socket] join-room error:', err);
        if (typeof ack === 'function') ack({ error: 'Server error' });
      }
    });

    // ─── leave-room ───────────────────────────────────────────────────────────
    socket.on('leave-room', ({ roomId }) => {
      if (roomId) socket.leave(roomId);
    });

    // ─── send-message ─────────────────────────────────────────────────────────
    socket.on('send-message', async (data, ack) => {
      try {
        const { roomId, content, type = 'text', mediaUrl = '' } = data || {};

        if (!roomId) {
          if (typeof ack === 'function') ack({ error: 'roomId is required' });
          return;
        }

        const room = await Room.findOne({ _id: roomId, members: user._id });
        if (!room) {
          if (typeof ack === 'function') ack({ error: 'Room not found or access denied' });
          return;
        }

        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
          if (typeof ack === 'function') ack({ error: 'Server encryption is not configured' });
          return;
        }
        let storedContent = '';
        let iv = '';
        let isEncrypted = false;

        if (type === 'text' && content) {
          const encrypted = encryptMessage(content, encryptionKey);
          storedContent = encrypted.ciphertext;
          iv = encrypted.iv;
          isEncrypted = true;
        } else if (type === 'image' || type === 'file') {
          // Encrypt optional caption for media messages the same way as text
          if (content) {
            const encrypted = encryptMessage(content, encryptionKey);
            storedContent = encrypted.ciphertext;
            iv = encrypted.iv;
            isEncrypted = true;
          }
        }

        const message = await Message.create({
          room: roomId,
          sender: user._id,
          content: storedContent,
          type,
          mediaUrl: mediaUrl || '',
          isEncrypted,
          iv,
          deliveredTo: [{ user: user._id, deliveredAt: new Date() }],
        });

        // Update room's lastMessage
        await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

        const populated = await message.populate([
          { path: 'sender', select: 'username avatar' },
          { path: 'readBy.user', select: 'username' },
          { path: 'deliveredTo.user', select: 'username' },
        ]);

        // Broadcast to everyone in the room (including sender)
        io.to(roomId).emit('new-message', { message: populated });

        if (typeof ack === 'function') ack({ success: true, message: populated });
      } catch (err) {
        console.error('[socket] send-message error:', err);
        if (typeof ack === 'function') ack({ error: 'Failed to send message' });
      }
    });

    // ─── typing ───────────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing', { userId: user._id, username: user.username, roomId });
    });

    // ─── stop-typing ──────────────────────────────────────────────────────────
    socket.on('stop-typing', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('stop-typing', { userId: user._id, roomId });
    });

    // ─── message-delivered ────────────────────────────────────────────────────
    socket.on('message-delivered', async ({ messageId }, ack) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyDelivered = message.deliveredTo.some(
          (d) => d.user.toString() === user._id.toString()
        );

        if (!alreadyDelivered) {
          message.deliveredTo.push({ user: user._id, deliveredAt: new Date() });
          await message.save();
        }

        // Notify sender that message was delivered
        io.to(message.room.toString()).emit('message-delivery-update', {
          messageId,
          userId: user._id,
          deliveredAt: new Date(),
        });

        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        console.error('[socket] message-delivered error:', err);
        if (typeof ack === 'function') ack({ error: 'Server error' });
      }
    });

    // ─── message-read ─────────────────────────────────────────────────────────
    socket.on('message-read', async ({ messageId, roomId }, ack) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyRead = message.readBy.some(
          (r) => r.user.toString() === user._id.toString()
        );

        if (!alreadyRead) {
          message.readBy.push({ user: user._id, readAt: new Date() });
          await message.save();
        }

        // Broadcast read receipt to the room
        const targetRoom = roomId || message.room.toString();
        io.to(targetRoom).emit('message-read-update', {
          messageId,
          userId: user._id,
          readAt: new Date(),
        });

        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        console.error('[socket] message-read error:', err);
        if (typeof ack === 'function') ack({ error: 'Server error' });
      }
    });

    // ─── get-online-users ─────────────────────────────────────────────────────
    socket.on('get-online-users', async (_, ack) => {
      try {
        const onlineUsers = await User.find({ isOnline: true }).select('_id username avatar');
        if (typeof ack === 'function') ack({ users: onlineUsers });
        else socket.emit('online-users', { users: onlineUsers });
      } catch (err) {
        console.error('[socket] get-online-users error:', err);
        if (typeof ack === 'function') ack({ error: 'Server error' });
      }
    });

    // ─── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[socket] disconnected: ${user.username} (${socket.id})`);
      try {
        await User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit('user-offline', { userId: user._id, lastSeen: new Date() });
      } catch (err) {
        console.error('[socket] disconnect cleanup error:', err);
      }
    });
  });
}

module.exports = registerSocketHandlers;
