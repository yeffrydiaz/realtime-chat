'use strict';

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name must be at most 100 characters'],
    },
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure private rooms between two users are unique
roomSchema.index(
  { type: 1, members: 1 },
  { unique: false }
);

module.exports = mongoose.model('Room', roomSchema);
