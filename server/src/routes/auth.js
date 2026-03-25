'use strict';

const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, publicKey } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ message: `${field} is already in use` });
    }

    const user = await User.create({ username, email, password, publicKey: publicKey || '' });
    const token = signToken(user._id);

    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me
router.put('/me', auth, async (req, res, next) => {
  try {
    const allowed = ['username', 'avatar', 'publicKey'];
    const updates = {};

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.password) {
      // Re-hash via pre-save hook by loading the document then saving
      const user = await User.findById(req.user._id).select('+password');
      user.password = req.body.password;
      Object.assign(user, updates);
      await user.save();
      return res.json({ user: user.toSafeObject() });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
