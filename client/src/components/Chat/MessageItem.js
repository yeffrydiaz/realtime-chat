import React from 'react';
import { format } from 'date-fns';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';

function DeliveryStatus({ message, isOwn }) {
  if (!isOwn) return null;
  const readCount = message.readBy?.length ?? 0;
  const deliveredCount = message.deliveredTo?.length ?? 0;

  if (readCount > 1) {
    return <span className="status-read" title="Read"><FiCheckCircle size={12} /><FiCheckCircle size={12} /></span>;
  }
  if (deliveredCount > 1) {
    return <span className="status-delivered" title="Delivered"><FiCheck size={12} /><FiCheck size={12} /></span>;
  }
  return <span className="status-sent" title="Sent"><FiCheck size={12} /></span>;
}

export default function MessageItem({ message, currentUser }) {
  const isOwn = message.sender?._id === currentUser?._id ||
    message.sender === currentUser?._id;

  const senderName = message.sender?.username ?? 'Unknown';
  const initial = senderName[0]?.toUpperCase() ?? '?';
  const time = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';

  const content = message.decryptedContent ?? message.content ?? '';

  return (
    <div className={`message-item ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="msg-avatar" title={senderName}>
          {initial}
        </div>
      )}
      <div className="msg-bubble-wrap">
        {!isOwn && <div className="msg-sender">{senderName}</div>}
        <div className="msg-bubble">
          {message.type === 'image' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="attachment"
              className="msg-image"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          {content && <p className="msg-content">{content}</p>}
          <div className="msg-meta">
            <span className="msg-time">{time}</span>
            <DeliveryStatus message={message} isOwn={isOwn} />
          </div>
        </div>
      </div>
    </div>
  );
}
