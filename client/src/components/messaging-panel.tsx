import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Send, Loader2, MessageCircle, User, X, ChevronRight, Circle, MoreVertical, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { debug, info as logInfo, error as logError } from "@/lib/logger";
import { useWebSocket } from "@/hooks/use-websocket";

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

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages: socketMessages,
    sendMessage: emitSendMessage,
    editMessage: emitEditMessage,
    deleteMessage: emitDeleteMessage,
    clearConversation: emitClearConversation,
    isConnected,
    socket
  } = useWebSocket({
    userId: user?.id,
    userName: user?.firstName || user?.name,
    userRole: user?.role,
    token: localStorage.getItem("accessToken")
  });

  // Sync socket messages with local messages state for the selected conversation
  useEffect(() => {
    if (socketMessages.length > 0) {
      const lastSocketMsg = socketMessages[socketMessages.length - 1];

      // If the message is related to currently open conversation
      const isRelevant =
        (lastSocketMsg.senderId === selectedParticipant && lastSocketMsg.recipientId === user?.id) ||
        (lastSocketMsg.senderId === user?.id && lastSocketMsg.recipientId === selectedParticipant);

      if (isRelevant) {
        setMessages(prev => {
          if (prev.find(m => m.id === lastSocketMsg.id)) return prev;
          return [...prev, {
            id: lastSocketMsg.id,
            senderId: lastSocketMsg.senderId,
            receiverId: lastSocketMsg.recipientId!,
            content: lastSocketMsg.content,
            timestamp: new Date(lastSocketMsg.timestamp).toISOString(),
            isRead: lastSocketMsg.isRead,
          }];
        });
      }

      // Also update participants list unread counts if it's a new incoming message for another participant
      if (lastSocketMsg.recipientId === user?.id && lastSocketMsg.senderId !== selectedParticipant) {
        setParticipants(prev => prev.map(p =>
          p.id === lastSocketMsg.senderId ? { ...p, unreadCount: p.unreadCount + 1 } : p
        ));
      }
    }
  }, [socketMessages, selectedParticipant, user?.id]);

  useEffect(() => {
    if (!socket) return;

    if (isConnected) {
      logInfo("Connected to messaging server via hook");
      setLoading(false);

      // Announce we are online
      socket.emit("user_online", {
        name: user?.firstName || user?.email?.split('@')[0],
        role: user?.role,
        email: user?.email
      });

      toast({
        title: t.common.connected,
        description: t.messaging.connected,
        className: "bg-green-50 text-green-900 border-green-200",
      });
    }

    const onConnectSuccess = (data: Record<string, unknown>) => {
      debug("Socket.IO auth success:", data);
    };

    const onMessageReceived = (msg: Message) => {
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
    };

    // Online presence events
    const onOnlineUsers = (users: OnlineUser[]) => {
      const ids = new Set(users.map(u => u.userId));
      setOnlineUsers(ids);
    };

    const onUserStatusChanged = (data: { userId: string, status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (data.status === 'online') {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    // Typing indicators
    const onUserTyping = (data: { senderId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.add(data.senderId);
        return next;
      });
    };

    const onUserStopTyping = (data: { senderId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.senderId);
        return next;
      });
    };

    const onDisconnect = () => {
      logInfo("Disconnected from messaging server");
      toast({
        title: t.common.disconnected,
        description: t.messaging.disconnected,
        variant: "destructive",
      });
    };

    const onError = (error: any) => {
      logError("Socket.IO error:", error);
      toast({
        title: "Connection Error",
        description: error?.message || "Failed to connect to messaging",
        variant: "destructive",
      });
    };

    const onConnectError = (error: any) => {
      logError("Socket.IO connect error:", error);
    };

    socket.on("connect:success", onConnectSuccess);
    socket.on("message:received", onMessageReceived);
    socket.on("online_users", onOnlineUsers);
    socket.on("user_status_changed", onUserStatusChanged);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect:success", onConnectSuccess);
      socket.off("message:received", onMessageReceived);
      socket.off("online_users", onOnlineUsers);
      socket.off("user_status_changed", onUserStatusChanged);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.off("connect_error", onConnectError);
    };
  }, [socket, isConnected, user]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers, selectedParticipant]);


  // Fetch message history when a participant is selected
  useEffect(() => {
    if (!selectedParticipant) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const history = await apiRequest<{ user: any; messages: Message[] }>(
          `/messages/conversation/${selectedParticipant}`
        );
        if (history && history.messages) {
          setMessages(history.messages.map(m => ({
            ...m,
            timestamp: m.timestamp || (m as any).createdAt
          })));

          // Clear unread count for this participant locally
          setParticipants(prev => prev.map(p =>
            p.id === selectedParticipant ? { ...p, unreadCount: 0 } : p
          ));
        }
      } catch (err) {
        logError("Failed to fetch history:", err);
      }
    };

    fetchHistory();
  }, [selectedParticipant]);

  const selectedParticipantObj = selectedParticipant ? participants.find((p) => p.id === selectedParticipant) || null : null;

  // Load participants
  const loadParticipants = useCallback(async () => {
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

      conversations.forEach(c => {
        uniqueParticipants.set(c.userId, {
          id: c.userId,
          name: `${c.firstName} ${c.lastName}`.trim() || c.email,
          email: c.email,
          role: c.role,
          unreadCount: c.unreadCount
        });
      });

      consultations.forEach((c) => {
        const idToCheck = user?.id === c.userId ? c.lawyerId : c.userId;
        const role = user?.id === c.userId ? "lawyer" : "applicant";

        if (!uniqueParticipants.has(idToCheck)) {
          uniqueParticipants.set(idToCheck, {
            id: idToCheck,
            name: role === "lawyer" ? "Lawyer" : "Applicant",
            email: "",
            role: role as any,
            unreadCount: 0,
          });
        }
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
  }, [user]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

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
    const success = emitSendMessage(selectedParticipant, inputMessage);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user!.id,
      receiverId: selectedParticipant,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputMessage("");

    socket.emit("message:send", {
      content: optimisticMessage.content,
      receiverId: selectedParticipant,
      applicationId: undefined,
    }, (ack: SocketAck) => {
      if (ack?.success) {
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, id: ack.messageId || m.id } : m));
      } else {
        toast({
          title: t.common.error,
          description: ack?.error || t.messaging.sendError,
          variant: "destructive",
        });
        // Revert on failure
        setMessages((prev) => prev.filter(m => m.id !== tempId));
        setInputMessage(optimisticMessage.content); // Restore input
      }
      setIsSending(false);
    });
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!selectedParticipant) return;
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      emitEditMessage(selectedParticipant, messageId, content);

      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content } : m));
      setEditingMessageId(null);
      setEditingContent("");
      toast({ title: t.common.success, description: "Message updated" });
    } catch (err) {
      toast({ title: t.common.error, description: "Failed to update message", variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedParticipant || !confirm("Delete this message?")) return;
    try {
      await apiRequest(`/messages/${messageId}`, { method: 'DELETE' });
      emitDeleteMessage(selectedParticipant, messageId);

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: t.common.success, description: "Message deleted" });
    } catch (err) {
      toast({ title: t.common.error, description: "Failed to delete message", variant: 'destructive' });
    }
  };

  const handleClearConversation = async () => {
    if (!selectedParticipant || !confirm("Clear entire conversation?")) return;
    try {
      await apiRequest(`/messages/conversation/${selectedParticipant}`, { method: 'DELETE' });
      emitClearConversation(selectedParticipant);

      setMessages([]);
      toast({ title: t.common.success, description: "Conversation cleared" });
    } catch (err) {
      toast({ title: t.common.error, description: "Failed to clear conversation", variant: 'destructive' });
    }
  };

  const isSelectedParticipantOnline = selectedParticipant ? onlineUsers.has(selectedParticipant) : false;
  const isSelectedParticipantTyping = selectedParticipant ? typingUsers.has(selectedParticipant) : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex gap-4 relative"
    >
      {/* Participants List */}
      <AnimatedCard className={`flex flex-col glass-premium border-none shadow-xl w-full md:w-72 ${selectedParticipant ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-500">
            <MessageCircle size={18} className="text-brand-500" />
            {t.messaging.title}
          </div>
          <Button variant="ghost" size="sm" onClick={loadParticipants} className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">
            {t.messaging.refresh || "Refresh"}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-brand-500" />
          </div>
        ) : participants.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold text-center p-4 italic">
            {t.messaging.noConversations}
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {participants.map((p) => {
              const isOnline = onlineUsers.has(p.id);
              return (
                <motion.button
                  key={p.id}
                  onClick={() => setSelectedParticipant(p.id)}
                  whileHover={{ x: 4 }}
                  className={`w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden ${selectedParticipant === p.id
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-black text-sm truncate ${selectedParticipant === p.id ? "text-white" : "text-slate-900 dark:text-white"}`}>
                          {p.name}
                        </p>
                        {isOnline && (
                          <div className={`w-2 h-2 rounded-full ${selectedParticipant === p.id ? "bg-green-300" : "bg-green-500"} ring-2 ring-white dark:ring-slate-900`} title="Online" />
                        )}
                      </div>
                      <p className={`text-[10px] uppercase tracking-wider font-bold opacity-70 truncate`}>
                        {typingUsers.has(p.id) ? (
                          <span className={`${selectedParticipant === p.id ? "text-white" : "text-brand-600"} animate-pulse`}>Typing...</span>
                        ) : (
                          p.email || p.role
                        )}
                      </p>
                    </div>
                    {p.unreadCount > 0 && (
                      <span className="px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-black shadow-lg animate-pulse">
                        {p.unreadCount}
                      </span>
                    )}
                  </div>
                  {selectedParticipant === p.id && (
                    <motion.div
                      layoutId="active-bg"
                      className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-500"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatedCard>

      {/* Chat Area */}
      <AnimatedCard className={`flex-1 flex-col glass-premium border-none shadow-xl overflow-hidden ${selectedParticipant ? 'flex' : 'hidden md:flex'}`}>
        {selectedParticipant ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg">
                    <User size={20} className="md:w-6 md:h-6" />
                  </div>
                  {isSelectedParticipantOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-800 shadow-sm" />
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-base md:text-lg leading-none">
                    {selectedParticipantObj?.name || t.messaging.participant}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">
                    {isSelectedParticipantTyping
                      ? <span className="animate-pulse">Typing...</span>
                      : (() => {
                        const roleKey = selectedParticipantObj?.role ?? "user";
                        return t.roles[roleKey as keyof typeof t.roles] || t.roles.user;
                      })()
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <LiveButton
                  onClick={handleClearConversation}
                  variant="ghost"
                  className="w-10 h-10 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                  title="Clear Conversation"
                >
                  <Trash2 size={18} />
                </LiveButton>
                <LiveButton
                  onClick={() => setSelectedParticipant(null)}
                  variant="ghost"
                  className="w-10 h-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <X size={18} />
                </LiveButton>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                  <MessageCircle size={64} className="mb-4 text-brand-500/20" />
                  <p className="font-bold">{t.messaging.noMessages}</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.senderId === user?.id ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex flex-col gap-1 max-w-[70%] ${msg.senderId === user?.id ? "items-end" : "items-start"}`}>
                      <div
                        className={`px-5 py-3 rounded-2xl text-sm shadow-md relative group ${msg.senderId === user?.id
                          ? "bg-brand-600 text-white rounded-tr-none"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-white/20"
                          }`}
                      >
                        {editingMessageId === msg.id ? (
                          <div className="space-y-3 py-1 min-w-[240px]">
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="bg-white/10 border-white/20 text-white h-10 focus:ring-white/30"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-4 text-xs font-black uppercase text-white hover:bg-white/10"
                                onClick={() => { setEditingMessageId(null); setEditingContent(""); }}
                              >
                                {t.common.cancel}
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-4 text-xs font-black uppercase bg-white text-brand-600 hover:bg-brand-50"
                                onClick={() => handleEditMessage(msg.id, editingContent)}
                              >
                                {t.common.save}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            {msg.senderId === user?.id && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all scale-75 origin-top-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1 hover:bg-white/20 rounded-lg">
                                      <MoreVertical size={14} className="text-white" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="glass-premium border-none shadow-2xl">
                                    <DropdownMenuItem
                                      className="font-bold text-xs"
                                      onClick={() => {
                                        setEditingMessageId(msg.id);
                                        setEditingContent(msg.content);
                                      }}
                                    >
                                      <Edit2 size={14} className="mr-2 text-brand-500" /> {t.common.edit}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-500 font-bold text-xs"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                    >
                                      <Trash2 size={14} className="mr-2" /> {t.common.delete}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.senderId === user?.id && (
                          <div className={`w-1.5 h-1.5 rounded-full ${msg.isRead ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {
                isSelectedParticipantTyping && (
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
                )
              }
              <div ref={scrollRef} className="h-4" />
            </div>

            {/* Input */}
            <div className="p-6 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={handleInputChange}
                    placeholder={t.messaging.inputPlaceholder}
                    className="w-full bg-white dark:bg-slate-800/80 border-none rounded-2xl px-5 py-6 text-slate-900 dark:text-white shadow-inner focus:ring-2 focus:ring-brand-500 transition-all pr-12"
                    disabled={isSending}
                  />
                  {isConnected && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  )}
                </div>
                <LiveButton
                  type="submit"
                  disabled={isSending || !inputMessage.trim()}
                  loading={isSending}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl shadow-brand-500/20 active:scale-95 transition-all p-0"
                  icon={Send}
                >
                  <span className="sr-only">Send</span>
                </LiveButton>
              </form>
              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t.messaging.sendHint}
                </p>
                {isConnected ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {t.common.connected}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {t.common.disconnected}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/20">
            <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-8 shadow-inner">
              <MessageCircle size={48} className="opacity-20 text-brand-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t.messaging.title}</h3>
            <p className="font-bold text-slate-500 max-w-xs">{t.messaging.selectConversation}</p>
          </div>
        )}
      </AnimatedCard >
    </motion.div >
  );
}

