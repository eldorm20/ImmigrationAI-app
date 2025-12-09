import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { debug, error as logError, info as logInfo } from '../lib/logger';

interface UseWebSocketOptions {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  autoConnect?: boolean;
}

interface MessageEvent {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  recipientId?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<MessageEvent[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const {
    userId,
    userName,
    userEmail,
    userRole,
    autoConnect = true,
  } = options;

  // Initialize WebSocket connection
  useEffect(() => {
    if (!autoConnect || !userId) return;

    const serverUrl = window.location.origin;
    const socket = io(serverUrl, {
      auth: {
        token: localStorage.getItem('accessToken'),
        userId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      logInfo('WebSocket connected');
      setIsConnected(true);

      // Emit user online status
      socket.emit('user_online', {
        name: userName || 'Unknown',
        email: userEmail || '',
        role: userRole || 'applicant',
      });
    });

    socket.on('disconnect', () => {
      logInfo('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      logError('WebSocket connection error:', error);
    });

    // User status events
    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_status_changed', (data) => {
      debug(`User ${data.userName} went ${data.status}`);
      // Update online users list
      if (data.status === 'online') {
        setOnlineUsers((prev) => [
          ...prev.filter((u) => u.userId !== data.userId),
          {
            userId: data.userId,
            userName: data.userName,
            role: data.role,
          },
        ]);
      } else {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    // Message events
    socket.on('new_message', (message: MessageEvent) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('message_sent', (data) => {
      debug('Message sent successfully:', data.id);
      // Add the sent message to the messages list
      setMessages((prev) => [...prev, {
        id: data.id,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        timestamp: new Date(data.timestamp),
        isRead: data.isRead,
        recipientId: data.recipientId,
      }]);
    });

    socket.on('message_read', (data) => {
      debug('Message read:', data.messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isRead: true } : m
        )
      );
    });

    socket.on('message_error', (error) => {
      logError('Message error:', error?.message || error);
    });

    // Typing indicators
    socket.on('user_typing', (data) => {
      setTypingUsers((prev) => new Set(prev).add(data.senderId));
    });

    socket.on('user_stop_typing', (data) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, userName, userEmail, userRole, autoConnect]);

  // Send message
  const sendMessage = useCallback(
    (recipientId: string, content: string) => {
      if (!socketRef.current?.connected) {
        logError('WebSocket not connected');
        return false;
      }

      socketRef.current.emit('send_message', {
        recipientId,
        content,
      });

      return true;
    },
    []
  );

  // Mark message as read
  const markMessageRead = useCallback((messageId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('mark_message_read', { messageId });
  }, []);

  // Emit typing indicator
  const emitTyping = useCallback((recipientId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('user_typing', { recipientId });
  }, []);

  // Stop typing indicator
  const emitStopTyping = useCallback((recipientId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('user_stop_typing', { recipientId });
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    messages,
    typingUsers,
    sendMessage,
    markMessageRead,
    emitTyping,
    emitStopTyping,
  };
}
