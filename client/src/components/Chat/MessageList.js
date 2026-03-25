import React, { useRef } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import MessageItem from './MessageItem';

function DateDivider({ date }) {
  let label;
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else label = format(date, 'MMMM d, yyyy');
  return <div className="date-divider"><span>{label}</span></div>;
}

export default function MessageList({ messages, currentUser, hasMore, loadingMore, onLoadMore }) {
  const listRef = useRef(null);

  // Group messages by date
  const groups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt);
    if (!lastDate || !isSameDay(msgDate, lastDate)) {
      groups.push({ type: 'divider', date: msgDate, key: `div-${msg._id}` });
      lastDate = msgDate;
    }
    groups.push({ type: 'message', msg, key: msg._id });
  });

  return (
    <div className="message-list" ref={listRef}>
      {hasMore && (
        <div className="load-more-wrap">
          <button className="load-more-btn" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load earlier messages'}
          </button>
        </div>
      )}
      {groups.map((item) =>
        item.type === 'divider' ? (
          <DateDivider key={item.key} date={item.date} />
        ) : (
          <MessageItem key={item.key} message={item.msg} currentUser={currentUser} />
        )
      )}
    </div>
  );
}
