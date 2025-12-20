import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Send, Loader2, MessageCircle, User, X, ChevronRight, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
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

    newSocket.on("message:updated", (data: { id: string; content: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, content: data.content } : m))
      );
    });

    newSocket.on("message:deleted", (data: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    });

    newSocket.on("conversation:cleared", (data: { userId: string }) => {
      // If the clear was for the current active conversation, empty the messages
      setMessages([]);
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
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        }
      } catch (err) {
        logError("Failed to fetch history:", err);
      }
    };

    fetchHistory();
  }, [selectedParticipant]);

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
              // We don't have lawyer details here, so we might show generic or fetch them?
              // Ideally /consultations should return expanded lawyer info.
              // For now, we add a placeholder which might be updated if we message them.
              // Actually, better to skip if we can't get name, OR fetch user details.
              // Let's rely on basic info or maybe we can't do much without name.
              // IF we really need it, we should fetch user info.
              // But strict 404/Empty is better than broken UI.
              // Let's assuming if they have a consultation, they SHOULD have a conversation entry created upon booking?
              // If not, maybe we just leave it. 
              // BUT the previous code was creating "Lawyer" / "Applicant" placeholders.
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedParticipant || !socket) return;

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

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await apiRequest(`/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      socket?.emit("message:edit", { id: messageId, content, recipientId: selectedParticipant });
      setEditingMessageId(null);
      setEditingContent("");
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
      socket?.emit("message:delete", { id: messageId, recipientId: selectedParticipant });
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
      await apiRequest(`/messages/conversation/${selectedParticipant}`, {
        method: 'DELETE',
      });
      socket?.emit("conversation:clear", { recipientId: selectedParticipant });
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

  const filteredMessages = selectedParticipant
    ? messages.filter(
      (m) =>
        (m.senderId === user?.id && m.receiverId === selectedParticipant) ||
        (m.senderId === selectedParticipant && m.receiverId === user?.id)
    )
    : [];

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
            {participants.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => setSelectedParticipant(p.id)}
                whileHover={{ x: 4 }}
                className={`w-full p-3 rounded-lg text-left transition-all ${selectedParticipant === p.id
                  ? "bg-brand-100 dark:bg-brand-900/30 border border-brand-500"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{p.email}</p>
                  </div>
                  {p.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {p.unreadCount}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
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
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <User size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedParticipantObj?.name || t.messaging.participant}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(() => {
                      const roleKey = selectedParticipantObj?.role ?? "user";
                      return t.roles[roleKey as keyof typeof t.roles] || t.roles.user;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearConversation}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                  title="Clear Conversation"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
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
                      className={`flex items-end gap-2 max-w-xs relative group ${msg.senderId === user?.id ? "flex-row-reverse" : ""
                        }`}
                    >
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm shadow-sm relative ${msg.senderId === user?.id
                          ? "bg-brand-600 text-white rounded-br-none"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        {editingMessageId === msg.id ? (
                          <div className="space-y-2 py-1 min-w-[200px]">
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white h-8"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-white hover:bg-white/20"
                                onClick={() => setEditingMessageId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-white text-brand-600 hover:bg-slate-100"
                                onClick={() => handleEditMessage(msg.id, editingContent)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="pr-4">{msg.content}</p>
                            {msg.senderId === user?.id && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-0.5 hover:bg-white/20 rounded">
                                      <MoreVertical size={12} className="text-white" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMessageId(msg.id);
                                        setEditingContent(msg.content);
                                      }}
                                    >
                                      <Edit2 size={14} className="mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                    >
                                      <Trash2 size={14} className="mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </>
                        )}
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
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
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
