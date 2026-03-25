import React, { useState, useRef, useCallback } from 'react';
import { FiSend, FiImage, FiSmile } from 'react-icons/fi';

const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😢','😡','👍','👎','❤️','🔥','✅','🎉','🙏'];

export default function MessageInput({ onSend, onTyping, onStopTyping }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value) {
      onTyping();
    } else {
      onStopTyping();
    }
  };

  const submitText = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, 'text');
    setText('');
    onStopTyping();
    setShowEmoji(false);
  }, [text, onSend, onStopTyping]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSend('', 'image', reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="message-input-wrap">
      {showEmoji && (
        <div className="emoji-picker">
          {EMOJIS.map((em) => (
            <button key={em} className="emoji-btn" onClick={() => insertEmoji(em)}>
              {em}
            </button>
          ))}
        </div>
      )}
      <div className="message-input-bar">
        <button
          className="input-icon-btn"
          title="Emoji"
          onClick={() => setShowEmoji((v) => !v)}
          type="button"
        >
          <FiSmile />
        </button>

        <button
          className="input-icon-btn"
          title="Attach image"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          <FiImage />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />

        <textarea
          className="message-textarea"
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          className="send-btn"
          onClick={submitText}
          disabled={!text.trim()}
          type="button"
          title="Send"
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
}
