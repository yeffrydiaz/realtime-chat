import React from 'react';

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.username).join(', ');
  const label = typingUsers.length === 1
    ? `${names} is typing`
    : `${names} are typing`;

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span />
        <span />
        <span />
      </div>
      <span className="typing-label">{label}…</span>
    </div>
  );
}
