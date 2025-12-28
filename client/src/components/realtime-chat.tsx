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
import { Send, User, CheckCheck, Check, Clock, MoreVertical, Trash2, Edit2, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const {
    isConnected,
    onlineUsers,
    messages,
    typingUsers,
    sendMessage,
    markMessageRead,
    emitTyping,
    emitStopTyping,
    editMessage: emitEditMessage,
    deleteMessage: emitDeleteMessage,
    clearConversation: emitClearConversation,
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find recipient user from online users
  useEffect(() => {
    const recipient = onlineUsers.find((u) => u.userId === recipientId);
    setRecipientUser(recipient || null);
  }, [onlineUsers, recipientId]);

  // Fetch conversation history
  const { data: conversationData, isLoading, refetch } = useQuery<{ user: any; messages: ChatMessage[] }>({
    queryKey: [`/messages/conversation/${recipientId}`],
    enabled: !!recipientId && !!user,
  });

  const historyData = conversationData;

  // Track remote typing
  useEffect(() => {
    const isRemoteTyping = typingUsers && typingUsers.has && typingUsers.has(recipientId);
    setRemoteTyping(isRemoteTyping || false);
  }, [typingUsers, recipientId]);

  // Combine history and live messages with deduplication
  useEffect(() => {
    const history = historyData?.messages || [];

    // Live messages for this conversation with robust matching
    const liveMessages = messages.filter((msg: any) => {
      const msgSenderId = String(msg.senderId || '').toLowerCase();
      const msgRecipientId = String(msg.recipientId || msg.receiverId || '').toLowerCase();
      const currentUserId = String(user?.id || '').toLowerCase();
      const targetUserId = String(recipientId || '').toLowerCase();

      // Case 1: We sent it
      const isFromMe = msgSenderId === currentUserId && msgRecipientId === targetUserId;
      // Case 2: We received it
      const isToMe = msgSenderId === targetUserId && msgRecipientId === currentUserId;

      return isFromMe || isToMe;
    });

    if (messages.length > 0) {
      console.log('[RealtimeChat] Total messages in hook:', messages.length);
      console.log('[RealtimeChat] Filtered live messages:', liveMessages.length, {
        currentUserId: user?.id,
        recipientId,
        liveMessages: liveMessages.map(m => ({ id: m.id, from: m.senderId, to: (m as any).recipientId || (m as any).receiverId }))
      });
    }

    // Merge and deduplicate by ID
    const messageMap = new Map<string, ChatMessage>();

    // Safe date parser helper
    const safeDate = (val: unknown): Date => {
      if (!val) return new Date();
      if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
      const parsed = new Date(val as string | number);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    // Add history first
    history.forEach(msg => {
      const ts = msg.timestamp || (msg as any).createdAt;
      messageMap.set(msg.id, {
        ...msg,
        timestamp: safeDate(ts) // Ensure valid date object
      });
    });

    // Add/Overwrite with live messages
    liveMessages.forEach(msg => {
      const ts = msg.timestamp || (msg as any).createdAt;
      messageMap.set(msg.id, {
        ...msg,
        timestamp: safeDate(ts)
      });
    });

    // Convert to array and sort
    const combined = Array.from(messageMap.values()).sort(
      (a, b) => safeDate(a.timestamp).getTime() - safeDate(b.timestamp).getTime()
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !isConnected) return;

    const currentInput = messageInput;
    setMessageInput(''); // Optimistic clear
    emitStopTyping(recipientId);
    setIsTyping(false);

    try {
      const success = await sendMessage(recipientId, currentInput);
      if (!success) {
        // Restore input on failure
        setMessageInput(currentInput);
        // You might want to show a toast here using useToast hook if available in this component context
        console.error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessageInput(currentInput);
    }
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

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      emitEditMessage(recipientId, messageId, content);
      setEditingMessageId(null);
      setEditingContent('');
      toast({
        title: t.common.success,
        description: "Message updated",
      });
    } catch (err) {
      toast({
        title: t.common.error,
        description: "Failed to update message",
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'DELETE',
      });
      emitDeleteMessage(recipientId, messageId);
      toast({
        title: t.common.success,
        description: "Message deleted",
      });
    } catch (err) {
      toast({
        title: t.common.error,
        description: "Failed to delete message",
        variant: 'destructive',
      });
    }
  };

  const handleClearConversation = async () => {
    if (!confirm("Are you sure you want to clear this entire conversation? This action cannot be undone.")) return;
    try {
      await apiRequest(`/messages/conversation/${recipientId}`, {
        method: 'DELETE',
      });
      emitClearConversation(recipientId);
      toast({
        title: t.common.success,
        description: "Conversation cleared",
      });
    } catch (err) {
      toast({
        title: t.common.error,
        description: "Failed to clear conversation",
        variant: 'destructive',
      });
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
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium mr-2">
              {isConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-red-600">Disconnected</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
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
                  className={`max-w-xs rounded-lg px-4 py-2 relative group ${msg.senderId === user?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                    }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2 py-1">
                      <Input
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="text-sm bg-white text-gray-900 h-8"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-white hover:bg-white/20"
                          onClick={() => setEditingMessageId(null)}
                        >
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-white text-blue-500 hover:bg-gray-100"
                          onClick={() => handleEditMessage(msg.id, editingContent)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm pr-4">{msg.content}</p>
                      {msg.senderId === user?.id && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/20">
                                <MoreVertical className="w-3 h-3 text-white" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setEditingContent(msg.content);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteMessage(msg.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-xs opacity-70">
                      {(() => {
                        try {
                          const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
                          return isNaN(ts.getTime()) ? 'Just now' : formatDistanceToNow(ts, { addSuffix: true });
                        } catch { return 'Just now'; }
                      })()}
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
        <p className="text-[10px] text-gray-400 italic mb-2 text-center">
          Note: This chat is for informational purposes only and does not constitute legal advice.
        </p>
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
