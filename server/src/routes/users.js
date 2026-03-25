'use strict';

const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/users?search=query — search users
router.get('/', auth, async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // Limit search query length to prevent ReDoS attacks
    const searchTerm = search.trim().slice(0, 100);

    const filter = {
      _id: { $ne: req.user._id },
    };

    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { username: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .limit(limit)
      .sort({ username: 1 });

    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});

// GET /api/users/:id — get a user profile
router.get('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
