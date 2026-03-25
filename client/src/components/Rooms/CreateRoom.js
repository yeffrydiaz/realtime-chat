import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiX, FiPlus, FiUserMinus } from 'react-icons/fi';

export default function CreateRoom({ onCreated, onClose }) {
  const [roomName, setRoomName] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/api/users', { params: { search } });
        setSearchResults(res.data.users ?? res.data);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!selectedUsers.length) {
      setError('Select at least one member.');
      return;
    }
    const isGroup = selectedUsers.length > 1;
    if (isGroup && !roomName.trim()) {
      setError('Group chats require a name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const type = isGroup ? 'group' : 'private';
      const name = isGroup
        ? roomName.trim()
        : selectedUsers[0].username;
      const payload = {
        name,
        type,
        members: selectedUsers.map((u) => u._id),
      };
      const res = await api.post('/api/rooms', payload);
      onCreated(res.data.room ?? res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-overlay" onClick={onClose}>
      <div className="create-room-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Conversation</h3>
          <button className="icon-btn" onClick={onClose}><FiX /></button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label>Group Name (optional)</label>
          <input
            type="text"
            placeholder="My group"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Search Users</label>
          <input
            type="text"
            placeholder="Search by username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {searchResults.length > 0 && (
          <ul className="user-results">
            {searchResults.map((u) => {
              const selected = selectedUsers.some((s) => s._id === u._id);
              return (
                <li
                  key={u._id}
                  className={`user-result-item ${selected ? 'selected' : ''}`}
                  onClick={() => toggleUser(u)}
                >
                  <div className="avatar sm">{u.username[0].toUpperCase()}</div>
                  <span>{u.username}</span>
                  {selected ? <FiUserMinus className="ml-auto" /> : <FiPlus className="ml-auto" />}
                </li>
              );
            })}
          </ul>
        )}

        {selectedUsers.length > 0 && (
          <div className="selected-users">
            {selectedUsers.map((u) => (
              <span key={u._id} className="selected-tag">
                {u.username}
                <button onClick={() => toggleUser(u)}><FiX size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <button
          className="btn-primary mt-2"
          onClick={handleCreate}
          disabled={loading || !selectedUsers.length}
        >
          {loading ? <span className="btn-spinner" /> : 'Create'}
        </button>
      </div>
    </div>
  );
}
