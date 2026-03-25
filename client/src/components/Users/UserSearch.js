import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiX } from 'react-icons/fi';

export default function UserSearch({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/api/users', { params: { search: query } });
        setResults(res.data.users ?? res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = async (user) => {
    try {
      // Create or find a DM room with this user
      const res = await api.post('/api/rooms', {
        members: [user._id],
        isGroup: false,
      });
      onSelect(res.data.room ?? res.data);
    } catch (err) {
      console.error('Failed to open DM', err);
    }
  };

  return (
    <div className="user-search">
      <div className="user-search-header">
        <input
          autoFocus
          type="text"
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="user-search-input"
        />
        <button className="icon-btn" onClick={onClose}><FiX /></button>
      </div>

      {loading && <div className="user-search-loading">Searching…</div>}

      {results.length > 0 && (
        <ul className="user-results">
          {results.map((u) => (
            <li key={u._id} className="user-result-item" onClick={() => handleSelect(u)}>
              <div className="avatar sm">{u.username[0].toUpperCase()}</div>
              <div>
                <div className="user-name">{u.username}</div>
                <div className="user-email">{u.email}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <div className="user-search-empty">No users found</div>
      )}
    </div>
  );
}
