import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { decryptMessage } from '../../utils/encryption';
import { formatDistanceToNow } from 'date-fns';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || '';

function getLastMessagePreview(room, currentUserId) {
  const lm = room.lastMessage;
  if (!lm) return 'No messages yet';
  if (typeof lm === 'string') return '';
  if (lm.type === 'image') return '📷 Image';
  if (lm.isEncrypted && lm.content && lm.iv) {
    const plain = decryptMessage(lm.content, ENCRYPTION_KEY, lm.iv);
    return plain || '🔒 Encrypted message';
  }
  return lm.content || '';
}

function getRoomName(room, currentUserId) {
  if (room.name) return room.name;
  const other = room.members?.find((m) => (m._id ?? m) !== currentUserId);
  return other?.username ?? 'Unknown';
}

function getRoomInitial(name) {
  return name?.[0]?.toUpperCase() ?? '?';
}

export default function RoomList({ rooms, activeRoomId, onlineUsers }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  if (!rooms.length) {
    return (
      <div className="room-list-empty">
        <p>No conversations yet.</p>
        <p>Search for a user to start chatting.</p>
      </div>
    );
  }

  return (
    <ul className="room-list">
      {rooms.map((room) => {
        const name = getRoomName(room, currentUser?._id);
        const preview = getLastMessagePreview(room, currentUser?._id);
        const isActive = room._id === activeRoomId;

        // For DMs, check if the other member is online
        const otherMember = room.members?.find((m) => (m._id ?? m) !== currentUser?._id);
        const isOnline = otherMember ? onlineUsers.includes(otherMember._id ?? otherMember) : false;

        const lastTime = room.updatedAt
          ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })
          : '';

        return (
          <li
            key={room._id}
            className={`room-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(`/chat/${room._id}`)}
          >
            <div className="avatar-wrap">
              <div className="avatar">{getRoomInitial(name)}</div>
              {!room.isGroup && <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />}
            </div>
            <div className="room-info">
              <div className="room-name-row">
                <span className="room-name">{name}</span>
                <span className="room-time">{lastTime}</span>
              </div>
              <div className="room-preview">{preview}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
