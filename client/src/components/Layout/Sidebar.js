import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axios';
import RoomList from '../Rooms/RoomList';
import CreateRoom from '../Rooms/CreateRoom';
import UserSearch from '../Users/UserSearch';
import { FiPlus, FiLogOut, FiSearch, FiX } from 'react-icons/fi';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.get('/api/rooms');
      setRooms(res.data.rooms ?? res.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRoomCreated = (room) => {
    setRooms((prev) => {
      const exists = prev.some((r) => r._id === room._id);
      return exists ? prev : [room, ...prev];
    });
    setShowCreate(false);
    navigate(`/chat/${room._id}`);
  };

  const handleUserSelect = (room) => {
    setRooms((prev) => {
      const exists = prev.some((r) => r._id === room._id);
      return exists ? prev : [room, ...prev];
    });
    setShowSearch(false);
    navigate(`/chat/${room._id}`);
  };

  const avatarInitial = currentUser?.username?.[0]?.toUpperCase() || '?';
  const isCurrentUserOnline = onlineUsers.includes(currentUser?._id);

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-user">
          <div className="avatar-wrap">
            <div className="avatar">{avatarInitial}</div>
            <span className={`status-dot ${isCurrentUserOnline ? 'online' : 'offline'}`} />
          </div>
          <span className="sidebar-username">{currentUser?.username}</span>
        </div>
        <div className="sidebar-actions">
          <button
            className="icon-btn"
            title="Search users"
            onClick={() => setShowSearch((v) => !v)}
          >
            {showSearch ? <FiX /> : <FiSearch />}
          </button>
          <button
            className="icon-btn"
            title="New group chat"
            onClick={() => setShowCreate((v) => !v)}
          >
            <FiPlus />
          </button>
          <button className="icon-btn danger" title="Log out" onClick={handleLogout}>
            <FiLogOut />
          </button>
        </div>
      </div>

      {/* Search panel */}
      {showSearch && (
        <UserSearch onSelect={handleUserSelect} onClose={() => setShowSearch(false)} />
      )}

      {/* Create room modal */}
      {showCreate && (
        <CreateRoom onCreated={handleRoomCreated} onClose={() => setShowCreate(false)} />
      )}

      {/* Room list */}
      <RoomList rooms={rooms} activeRoomId={roomId} onlineUsers={onlineUsers} />
    </aside>
  );
}
