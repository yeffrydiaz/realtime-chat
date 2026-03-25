import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { decryptMessage } from '../utils/encryption';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || '';

function decryptMsg(msg) {
  if (!msg.isEncrypted || !msg.content) return { ...msg, decryptedContent: msg.content };
  const plain = decryptMessage(msg.content, ENCRYPTION_KEY, msg.iv);
  return { ...msg, decryptedContent: plain };
}

export default function useChat(roomId) {
  const { socket } = useSocket();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const typingTimerRef = useRef(null);
  const joinedRef = useRef(false);

  // Fetch message history
  const fetchMessages = useCallback(
    async (pageNum = 1) => {
      if (!roomId) return;
      try {
        const res = await api.get(`/api/messages/${roomId}`, {
          params: { page: pageNum, limit: 50 },
        });
        const fetched = (res.data.messages ?? []).map(decryptMsg);
        if (pageNum === 1) {
          setMessages(fetched.reverse());
        } else {
          setMessages((prev) => [...fetched.reverse(), ...prev]);
        }
        const total = res.data.total ?? res.data.pagination?.total ?? fetched.length;
        const limit = res.data.limit ?? 50;
        setHasMore(pageNum * limit < total);
        setPage(pageNum);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    },
    [roomId]
  );

  // Join socket room and set up listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    if (!joinedRef.current) {
      socket.emit('join-room', { roomId });
      joinedRef.current = true;
    }

    fetchMessages(1);

    function onNewMessage({ message }) {
      const decrypted = decryptMsg(message);
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === decrypted._id);
        return exists ? prev : [...prev, decrypted];
      });
      // Emit delivery receipt
      socket.emit('message-delivered', { messageId: message._id });
    }

    function onTyping({ userId, username }) {
      if (userId === currentUser?._id) return;
      setTypingUsers((prev) => {
        const exists = prev.find((u) => u.userId === userId);
        return exists ? prev : [...prev, { userId, username }];
      });
    }

    function onStopTyping({ userId }) {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    }

    function onDeliveryUpdate({ messageId, userId, deliveredAt }) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                deliveredTo: [
                  ...(m.deliveredTo || []).filter((d) => d.user?._id !== userId),
                  { user: { _id: userId }, deliveredAt },
                ],
              }
            : m
        )
      );
    }

    function onReadUpdate({ messageId, userId, readAt }) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                readBy: [
                  ...(m.readBy || []).filter((r) => r.user?._id !== userId),
                  { user: { _id: userId }, readAt },
                ],
              }
            : m
        )
      );
    }

    socket.on('new-message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('stop-typing', onStopTyping);
    socket.on('message-delivery-update', onDeliveryUpdate);
    socket.on('message-read-update', onReadUpdate);

    return () => {
      socket.emit('leave-room', { roomId });
      joinedRef.current = false;
      socket.off('new-message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('stop-typing', onStopTyping);
      socket.off('message-delivery-update', onDeliveryUpdate);
      socket.off('message-read-update', onReadUpdate);
    };
  }, [socket, roomId, currentUser, fetchMessages]);

  const sendMessage = useCallback(
    (content, type = 'text', mediaUrl = '') => {
      if (!socket || !roomId) return;
      socket.emit('send-message', { roomId, content, type, mediaUrl });
    },
    [socket, roomId]
  );

  const emitTyping = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId });
    }, 2000);
  }, [socket, roomId]);

  const emitStopTyping = useCallback(() => {
    if (!socket || !roomId) return;
    clearTimeout(typingTimerRef.current);
    socket.emit('stop-typing', { roomId });
  }, [socket, roomId]);

  const markRead = useCallback(
    (messageId) => {
      if (!socket) return;
      socket.emit('message-read', { messageId, roomId });
    },
    [socket, roomId]
  );

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchMessages(page + 1);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchMessages]);

  return {
    messages,
    sendMessage,
    typingUsers,
    loadMoreMessages,
    hasMore,
    loadingMore,
    emitTyping,
    emitStopTyping,
    markRead,
  };
}
