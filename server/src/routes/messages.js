'use strict';

const router = require('express').Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// GET /api/messages/:roomId — paginated message history
router.get('/:roomId', auth, async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findOne({ _id: roomId, members: req.user._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ room: roomId })
        .populate('sender', 'username avatar')
        .populate('readBy.user', 'username')
        .populate('deliveredTo.user', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ room: roomId }),
    ]);

    return res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/messages/:messageId/read — mark a message as read
router.put('/:messageId/read', auth, async (req, res, next) => {
  try {
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Verify user is member of the room
    const room = await Room.findOne({ _id: message.room, members: req.user._id });
    if (!room) return res.status(403).json({ message: 'Not authorized' });

    const alreadyRead = message.readBy.some(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id, readAt: new Date() });
      await message.save();
    }

    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
