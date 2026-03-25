import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import useChat from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import api from '../../api/axios';
import { useState } from 'react';
import { FiUsers } from 'react-icons/fi';

export default function ChatWindow() {
  const { roomId } = useParams();
  const { currentUser } = useAuth();
  const { messages, sendMessage, typingUsers, loadMoreMessages, hasMore, loadingMore, emitTyping, emitStopTyping, markRead } =
    useChat(roomId);
  const [room, setRoom] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    api
      .get(`/api/rooms/${roomId}`)
      .then((res) => setRoom(res.data.room ?? res.data))
      .catch(console.error);
  }, [roomId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark last unread messages as read
  useEffect(() => {
    if (!messages.length) return;
    const unread = messages.filter(
      (m) =>
        m.sender?._id !== currentUser?._id &&
        !m.readBy?.some((r) => r.user?._id === currentUser?._id)
    );
    unread.forEach((m) => markRead(m._id));
  }, [messages, currentUser, markRead]);

  const roomName =
    room?.name ||
    room?.members?.filter((m) => m._id !== currentUser?._id)?.[0]?.username ||
    'Chat';

  const memberCount = room?.members?.length ?? 0;

  return (
    <div className="chat-window">
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="avatar">{roomName[0]?.toUpperCase()}</div>
          <div>
            <div className="chat-header-name">{roomName}</div>
            {memberCount > 0 && (
              <div className="chat-header-sub">
                <FiUsers size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-body">
        <MessageList
          messages={messages}
          currentUser={currentUser}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMoreMessages}
        />
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} />}

      {/* Input */}
      <MessageInput
        onSend={sendMessage}
        onTyping={emitTyping}
        onStopTyping={emitStopTyping}
      />
    </div>
  );
}
