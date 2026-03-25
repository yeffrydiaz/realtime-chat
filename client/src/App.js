import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Sidebar from './components/Layout/Sidebar';
import ChatWindow from './components/Chat/ChatWindow';
import './styles/App.css';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }
  return currentUser ? children : <Navigate to="/login" replace />;
}

function ChatLayout() {
  return (
    <SocketProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route
              index
              element={
                <div className="no-chat-selected">
                  <div className="no-chat-inner">
                    <div className="no-chat-icon">💬</div>
                    <h2>Welcome to RealtimeChat</h2>
                    <p>Select a conversation or start a new one</p>
                  </div>
                </div>
              }
            />
            <Route path="chat/:roomId" element={<ChatWindow />} />
          </Routes>
        </main>
      </div>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
