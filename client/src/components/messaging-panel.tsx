import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Send, Loader2, MessageCircle, User, X, ChevronRight, Circle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { debug, info as logInfo, error as logError } from "@/lib/logger";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  applicationId?: string;
}

interface ChatParticipant {
  id: string;
  name: string;
  email: string;
  role: "lawyer" | "applicant";
  unreadCount: number;
}

interface ConsultationSummary {
  id: string;
  userId: string;
  lawyerId: string;
}

interface Conversation {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "lawyer" | "applicant";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface OnlineUser {
  userId: string;
  userName: string;
  role: string;
  lastSeen: number | null;
}

type SocketAck = { success?: boolean; messageId?: string; error?: string };

export default function MessagingPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Real-time states
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      logError("No auth token found for messaging");
      return;
    }

    const newSocket = io(window.location.origin, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    newSocket.on("connect", () => {
      logInfo("Connected to messaging server");
      setLoading(false);
      // Announce we are online
      newSocket.emit("user_online", {
        name: user?.firstName || user?.email?.split('@')[0],
        role: user?.role,
        email: user?.email
      });

      toast({
        title: t.common.connected,
        description: t.messaging.connected,
        className: "bg-green-50 text-green-900 border-green-200",
      });
    });

    newSocket.on("connect:success", (data: Record<string, unknown>) => {
      debug("Socket.IO auth success:", data);
    });

    newSocket.on("message:received", (msg: Message) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          timestamp: msg.timestamp,
          isRead: false,
          applicationId: msg.applicationId,
        },
      ]);
    });

    // Online presence events
    newSocket.on("online_users", (users: OnlineUser[]) => {
      const ids = new Set(users.map(u => u.userId));
      setOnlineUsers(ids);
    });

    newSocket.on("user_status_changed", (data: { userId: string, status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.status === 'online') {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    // Typing indicators
    newSocket.on("user_typing", (data: { senderId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.add(data.senderId);
        return next;
      });
    });

    newSocket.on("user_stop_typing", (data: { senderId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    });

    newSocket.on("disconnect", () => {
      logInfo("Disconnected from messaging server");
      toast({
        title: t.common.disconnected,
        description: t.messaging.disconnected,
        variant: "destructive",
      });
    });

    newSocket.on("error", (error: any) => {
      logError("Socket.IO error:", error);
      toast({
        title: "Connection Error",
        description: error?.message || "Failed to connect to messaging",
        variant: "destructive",
      });
    });

    newSocket.on("connect_error", (error: any) => {
      logError("Socket.IO connect error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const selectedParticipantObj = selectedParticipant ? participants.find((p) => p.id === selectedParticipant) || null : null;

  // Load conversations and consultations to build participant list
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [conversationsRes, consultationsRes] = await Promise.all([
          apiRequest<{ conversations: Conversation[] }>("/messages").catch(err => {
            logError("Failed to load messages:", err);
            return { conversations: [] };
          }),
          apiRequest<ConsultationSummary[]>("/consultations").catch(err => {
            logError("Failed to load consultations:", err);
            return [];
          })
        ]);

        const conversations = conversationsRes.conversations || [];
        const consultations = Array.isArray(consultationsRes) ? consultationsRes : [];

        const uniqueParticipants = new Map<string, ChatParticipant>();

        // 1. Add existing conversations
        conversations.forEach(c => {
          uniqueParticipants.set(c.userId, {
            id: c.userId,
            name: `${c.firstName} ${c.lastName}`.trim() || c.email,
            email: c.email,
            role: c.role,
            unreadCount: c.unreadCount
          });
        });

        // 2. Add consultations if not already present
        consultations.forEach((c) => {
          if (user?.id === c.userId) {
            // I'm the applicant; add the lawyer
            const lawyerId = c.lawyerId;
            if (!uniqueParticipants.has(lawyerId)) {
              uniqueParticipants.set(lawyerId, {
                id: lawyerId,
                name: `Lawyer`, // Generic fallback 
                email: ``,
                role: "lawyer",
                unreadCount: 0,
              });
            }
          } else if (user?.id === c.lawyerId) {
            // I'm the lawyer; add the applicant
            const applicantId = c.userId;
            if (!uniqueParticipants.has(applicantId)) {
              uniqueParticipants.set(applicantId, {
                id: applicantId,
                name: `Applicant`,
                email: ``,
                role: "applicant",
                unreadCount: 0,
              });
            }
          }
        });

        setParticipants(Array.from(uniqueParticipants.values()));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Failed to load participants:", msg);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    if (!socket || !selectedParticipant) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit start typing if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("user_typing", { recipientId: selectedParticipant });
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("user_stop_typing", { recipientId: selectedParticipant });
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedParticipant || !socket) return;

    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    socket.emit("user_stop_typing", { recipientId: selectedParticipant });

    setIsSending(true);

    socket.emit("message:send", {
      content: inputMessage,
      receiverId: selectedParticipant,
      applicationId: undefined,
    }, (ack: SocketAck) => {
      if (ack?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: ack.messageId || `temp-${Date.now()}`,
            senderId: user!.id,
            receiverId: selectedParticipant,
            content: inputMessage,
            timestamp: new Date().toISOString(),
            isRead: false,
          },
        ]);
        setInputMessage("");
      } else {
        toast({
          title: t.common.error,
          description: ack?.error || t.messaging.sendError,
          variant: "destructive",
        });
      }
      setIsSending(false);
    });
  };

  const filteredMessages = selectedParticipant
    ? messages.filter(
      (m) =>
        (m.senderId === user?.id && m.receiverId === selectedParticipant) ||
        (m.senderId === selectedParticipant && m.receiverId === user?.id)
    )
    : [];

  const isSelectedParticipantOnline = selectedParticipant ? onlineUsers.has(selectedParticipant) : false;
  const isSelectedParticipantTyping = selectedParticipant ? typingUsers.has(selectedParticipant) : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex gap-4"
    >
      {/* Participants List */}
      <AnimatedCard className="w-72 flex flex-col">
        <div className="flex items-center gap-2 mb-4 font-bold text-lg text-slate-900 dark:text-white">
          <MessageCircle size={20} />
          {t.messaging.title}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : participants.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {t.messaging.noConversations}
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto">
            {participants.map((p) => {
              const isOnline = onlineUsers.has(p.id);
              return (
                <motion.button
                  key={p.id}
                  onClick={() => setSelectedParticipant(p.id)}
                  whileHover={{ x: 4 }}
                  className={`w-full p-3 rounded-lg text-left transition-all relative ${selectedParticipant === p.id
                    ? "bg-brand-100 dark:bg-brand-900/30 border border-brand-500"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {p.name}
                        </p>
                        {isOnline && (
                          <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-900" title="Online" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        {typingUsers.has(p.id) ? (
                          <span className="text-brand-600 dark:text-brand-400 animate-pulse">Typing...</span>
                        ) : (
                          p.email
                        )}
                      </p>
                    </div>
                    {p.unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                        {p.unreadCount}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatedCard>

      {/* Chat Area */}
      <AnimatedCard className="flex-1 flex flex-col">
        {selectedParticipant ? (
          <>
            {/* Chat Header */}
            <div className="pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <User size={18} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  {isSelectedParticipantOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-800" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedParticipantObj?.name || t.messaging.participant}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isSelectedParticipantTyping
                      ? <span className="text-brand-600 dark:text-brand-400 animate-pulse font-medium">Typing...</span>
                      : selectedParticipantObj?.role === "lawyer" ? "Immigration Lawyer" : "Applicant"
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
              {filteredMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <p className="text-center">{t.messaging.noMessages}</p>
                </div>
              ) : (
                filteredMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"} px-4`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-xs ${msg.senderId === user?.id ? "flex-row-reverse" : ""
                        }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${msg.senderId === user?.id
                          ? "bg-brand-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
              {isSelectedParticipantTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start px-4"
                >
                  <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder={t.messaging.inputPlaceholder}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white placeholder-slate-400"
                  disabled={isSending}
                />
                <LiveButton
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  loading={isSending}
                  size="icon"
                  className="w-12 h-12 rounded-xl p-0"
                  icon={Send}
                >
                  <span className="sr-only">Send</span>
                </LiveButton>
              </form>
              <p className="text-xs text-slate-400 mt-2 text-center">
                {t.messaging.sendHint}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t.messaging.selectConversation}</p>
            </div>
          </div>
        )}
      </AnimatedCard>
    </motion.div>
  );
}

