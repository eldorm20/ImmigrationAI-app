import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, formatDistance } from 'date-fns';
import { Send, User, CheckCheck, Check, Clock } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

interface ChatUser {
  userId: string;
  userName: string;
  role: string;
  lastSeen?: number | null;
}

export function RealtimeChat({ recipientId }: { recipientId: string }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const {
    isConnected,
    onlineUsers,
    messages,
    typingUsers,
    sendMessage,
    markMessageRead,
    emitTyping,
    emitStopTyping,
  } = useWebSocket({
    userId: user?.id,
    userName: user?.firstName || user?.email,
    userEmail: user?.email,
    userRole: user?.role || 'applicant',
    token: localStorage.getItem('accessToken'),
  });

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [recipientUser, setRecipientUser] = useState<ChatUser | null>(null);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find recipient user from online users
  useEffect(() => {
    const recipient = onlineUsers.find((u) => u.userId === recipientId);
    setRecipientUser(recipient || null);
  }, [onlineUsers, recipientId]);

  // Fetch conversation history
  const { data: historyRes } = useQuery<{ user: any; messages: ChatMessage[] }>({
    queryKey: [`/api/messages/conversation/${recipientId}`],
    enabled: !!recipientId,
  });

  const historyData = historyRes;

  // Track remote typing
  useEffect(() => {
    const isRemoteTyping = typingUsers && typingUsers.has && typingUsers.has(recipientId);
    setRemoteTyping(isRemoteTyping || false);
  }, [typingUsers, recipientId]);

  // Combine history and live messages with deduplication
  useEffect(() => {
    const history = historyData?.messages || [];

    // Live messages for this conversation
    const liveMessages = messages.filter(
      (msg) =>
        (msg.senderId === user?.id && msg.recipientId === recipientId) ||
        (msg.senderId === recipientId && msg.recipientId === user?.id)
    );

    // Merge and deduplicate by ID
    const messageMap = new Map<string, ChatMessage>();

    // Add history first
    history.forEach(msg => {
      const ts = msg.timestamp || (msg as any).createdAt;
      messageMap.set(msg.id, {
        ...msg,
        timestamp: ts ? new Date(ts) : new Date() // Ensure date object
      });
    });

    // Add/Overwrite with live messages
    liveMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Convert to array and sort
    const combined = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    setFilteredMessages(combined);

    // Mark received messages as read
    combined.forEach((msg) => {
      if (msg.senderId === recipientId && !msg.isRead) {
        markMessageRead(msg.id);
      }
    });
  }, [messages, historyData, user?.id, recipientId, markMessageRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !isConnected) return;

    sendMessage(recipientId, messageInput);
    setMessageInput('');
    emitStopTyping(recipientId);
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      emitTyping(recipientId);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      emitStopTyping(recipientId);
    }

    // Clear typing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(recipientId);
      setIsTyping(false);
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${recipientUser?.lastSeen === null ? 'bg-green-500' : 'bg-gray-400'
                }`}
              title={recipientUser?.lastSeen === null ? 'Online' : 'Offline'}
            />
            {recipientUser || historyData?.user ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>
                    {recipientUser?.userName ||
                      (historyData?.user?.firstName
                        ? `${historyData.user.firstName} ${historyData.user.lastName || ''}`.trim()
                        : historyData?.user?.email) ||
                      'Loading...'}
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    ({recipientUser?.role || historyData?.user?.role || '...'})
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {recipientUser?.lastSeen === null ? (
                    <span className="text-green-600">Online now</span>
                  ) : recipientUser?.lastSeen ? (
                    <span>
                      Last seen{' '}
                      {formatDistance(new Date(recipientUser.lastSeen), new Date(), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : (
                    <span>Offline</span>
                  )}
                </div>
              </div>
            ) : (
              <span>Loading...</span>
            )}
          </CardTitle>
          <div className="text-xs font-medium">
            {isConnected ? (
              <span className="text-green-600">Connected</span>
            ) : (
              <span className="text-red-600">Disconnected</span>
            )}
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${msg.senderId === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                    }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(msg.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                    {msg.senderId === user?.id && (
                      <div className="flex">
                        {msg.isRead ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {remoteTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 rounded-lg px-4 py-2 flex items-center gap-1">
                <span className="text-xs font-medium">Typing</span>
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="border-t p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={t.consultation?.inputPlaceholder || "Type a message..."}
            value={messageInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageInput.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-600 text-center">
            {t.consultation?.connected === false ? t.consultation?.disconnected : "Connecting... Real-time messaging unavailable"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
