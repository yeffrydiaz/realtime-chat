'use strict';

const router = require('express').Router();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/rooms — list rooms the current user belongs to
router.get('/', auth, async (req, res, next) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate('members', '-password')
      .populate('admin', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .sort({ updatedAt: -1 });

    return res.json({ rooms });
  } catch (err) {
    return next(err);
  }
});

// POST /api/rooms — create a room
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, type, members: memberIds, avatar } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'name and type are required' });
    }

    if (!['private', 'group'].includes(type)) {
      return res.status(400).json({ message: 'type must be private or group' });
    }

    // Deduplicate and always include creator
    const requestedIds = Array.isArray(memberIds) ? memberIds : [];
    const allIds = [
      ...new Set([req.user._id.toString(), ...requestedIds]),
    ];

    if (type === 'private' && allIds.length !== 2) {
      return res.status(400).json({ message: 'Private rooms require exactly 2 members' });
    }

    // For private rooms, check if one already exists
    if (type === 'private') {
      const existing = await Room.findOne({
        type: 'private',
        members: { $all: allIds, $size: 2 },
      })
        .populate('members', '-password')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: 'username avatar' },
        });

      if (existing) {
        return res.json({ room: existing });
      }
    }

    // Validate that all member IDs exist
    const validIds = allIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: validIds } });
    if (users.length !== validIds.length) {
      return res.status(400).json({ message: 'One or more member IDs are invalid' });
    }

    const roomData = {
      name,
      type,
      members: validIds,
      avatar: avatar || '',
    };

    if (type === 'group') {
      roomData.admin = req.user._id;
    }

    const room = await Room.create(roomData);
    const populated = await room.populate([
      { path: 'members', select: '-password' },
      { path: 'admin', select: '-password' },
    ]);

    return res.status(201).json({ room: populated });
  } catch (err) {
    return next(err);
  }
});

// GET /api/rooms/:id — get single room
router.get('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findOne({
      _id: req.params.id,
      members: req.user._id,
    })
      .populate('members', '-password')
      .populate('admin', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.json({ room });
  } catch (err) {
    return next(err);
  }
});

// POST /api/rooms/:id/members — add members (group admin only)
router.post('/:id/members', auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.type !== 'group') {
      return res.status(400).json({ message: 'Cannot add members to a private room' });
    }
    if (room.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can add members' });
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds array is required' });
    }

    const validIds = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    room.members = [...new Set([...room.members.map(String), ...validIds])];
    await room.save();

    const populated = await room.populate('members', '-password');
    return res.json({ room: populated });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/rooms/:id/members/:userId — remove member (admin or self)
router.delete('/:id/members/:userId', auth, async (req, res, next) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.params.userId)
    ) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.type !== 'group') {
      return res.status(400).json({ message: 'Cannot remove members from a private room' });
    }

    const isSelf = req.params.userId === req.user._id.toString();
    const isAdmin = room.admin.toString() === req.user._id.toString();

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    room.members = room.members.filter((m) => m.toString() !== req.params.userId);
    await room.save();

    return res.json({ message: 'Member removed' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
