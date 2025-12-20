import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { debug, error as logError, info as logInfo } from '../lib/logger';

interface UseWebSocketOptions {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  autoConnect?: boolean;
  token?: string | null; // Pass token explicitly
  onApplicationUpdate?: (applicationId: string) => void;
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

interface UserPresence {
  userId: string;
  userName: string;
  role: string;
  lastSeen?: number | null;
}

interface TypingEvent {
  senderId: string;
  timestamp: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [activeViewers, setActiveViewers] = useState<UserPresence[]>([]);
  const [messages, setMessages] = useState<MessageEvent[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingEvent>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const {
    userId,
    userName,
    userEmail,
    userRole,
    autoConnect = true,
    token, // Destructure token
  } = options;

  // Initialize WebSocket connection
  useEffect(() => {
    // Wait for token before connecting to ensure authentication
    if (!autoConnect || !userId || !token) return;

    // Determine server URL - prioritize environment variable, otherwise fallback to window origin
    // Removing /api suffix if present in VITE_API_URL as socket.io needs the base URL
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const serverUrl = apiUrl.replace(/\/api\/?$/, ""); // Use standard http/https URL

    // logInfo might not be defined in all contexts, use console.log
    console.log(`[WS] Initializing Socket.IO connection to: ${serverUrl} (User: ${userId})`);

    const socket = io(serverUrl, {
      auth: {
        token: token, // Use passed token
        userId,
      },
      transports: ["websocket", "polling"], // Prioritize websocket but allow polling fallback
      path: "/socket.io/", // Ensure path matches server
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
    socket.on('online_users', (users: UserPresence[]) => {
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
            lastSeen: data.lastSeen || null,
          },
        ]);
      } else {
        setOnlineUsers((prev) =>
          prev.map((u) =>
            u.userId === data.userId
              ? { ...u, lastSeen: data.lastSeen || Date.now() }
              : u
          )
        );
      }
    });

    // Message events
    socket.on('new_message', (message: MessageEvent) => {
      console.log('[useWebSocket] Received new_message:', message);
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

    socket.on('message:updated', (data: { id: string; content: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, content: data.content } : m))
      );
    });

    socket.on('message:deleted', (data: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    });

    socket.on('conversation:cleared', (data: { userId: string }) => {
      // Clear messages only if it relates to our current conversation participant
      // Or just clear all if we want to be safe, but let's filter by participant if possible
      // In this hook we don't know the current selected participant, so we clear all for now
      // and the component will handle the logic if needed.
      setMessages([]);
    });

    // Typing indicators
    socket.on('user_typing', (data) => {
      const typingEvent: TypingEvent = { senderId: data.senderId, timestamp: data.timestamp || Date.now() };
      setTypingUsers((prev) => new Map(prev).set(data.senderId, typingEvent));

      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(data.senderId);
      if (existingTimeout) clearTimeout(existingTimeout);

      // Auto-clear typing after 5 seconds of inactivity
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.senderId);
          return next;
        });
      }, 5000);

      typingTimeoutRef.current.set(data.senderId, timeout);
    });

    socket.on('user_stop_typing', (data) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.senderId);
        return next;
      });
      // Clear timeout
      const timeout = typingTimeoutRef.current.get(data.senderId);
      if (timeout) clearTimeout(timeout);
      typingTimeoutRef.current.delete(data.senderId);
    });

    socket.on('presence_update', (data: { userId: string; userName?: string; role?: string; action: 'viewing' | 'left' }) => {
      if (data.action === 'viewing') {
        setActiveViewers(prev => [
          ...prev.filter(v => v.userId !== data.userId),
          { userId: data.userId, userName: data.userName || 'Unknown', role: data.role || 'guest' }
        ]);
      } else {
        setActiveViewers(prev => prev.filter(v => v.userId !== data.userId));
      }
    });

    socket.on('application_refetch', (data: { applicationId: string }) => {
      if (options.onApplicationUpdate) {
        options.onApplicationUpdate(data.applicationId);
      }
    });

    return () => {
      // Clear all typing timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      socket.disconnect();
    };
  }, [userId, userName, userEmail, userRole, autoConnect, token]);

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

  // Edit message
  const editMessage = useCallback((recipientId: string, messageId: string, content: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:edit', { id: messageId, content, recipientId });
  }, []);

  // Delete message
  const deleteMessage = useCallback((recipientId: string, messageId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message:delete', { id: messageId, recipientId });
  }, []);

  // Clear conversation
  const clearConversation = useCallback((recipientId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('conversation:clear', { recipientId });
  }, []);

  // Application Presence
  const joinApplication = useCallback((applicationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('join_application', { applicationId });
  }, []);

  const leaveApplication = useCallback((applicationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('leave_application', { applicationId });
    setActiveViewers([]); // Clear local state when leaving
  }, []);

  const notifyUpdate = useCallback((applicationId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('update_application', { applicationId });
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    activeViewers,
    messages,
    typingUsers,
    sendMessage,
    markMessageRead,
    emitTyping,
    emitStopTyping,
    editMessage,
    deleteMessage,
    clearConversation,
    joinApplication,
    leaveApplication,
    notifyUpdate
  };
}
