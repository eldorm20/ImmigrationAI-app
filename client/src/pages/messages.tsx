import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { RealtimeChat } from "@/components/realtime-chat";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { Loader2, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
interface ConversationUser {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
}

export default function Messages() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Handle initial selection from query param (e.g., from lawyer dashboard)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get("userId");
        if (userId) {
            setSelectedUserId(userId);
        }
    }, []);

    // Fetch recent conversations (users who we have chatted with)
    const { data: response, isLoading } = useQuery<{ conversations: ConversationUser[] }>({
        queryKey: ["/messages"],
        enabled: !!user,
    });

    const conversations = response?.conversations || [];

    // Filter conversations
    const filteredConversations = conversations.filter(c =>
        (c.firstName + " " + c.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!user) return null;

    return (
        <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-4 h-full gap-4">

                {/* Sidebar: Conversation List */}
                <div className="md:col-span-1 h-full flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.lawyer.searchPlaceholder}
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Card className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col p-2 gap-1">
                                {isLoading ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="text-center p-4 text-muted-foreground text-sm">
                                        {t.messaging.noConversations}
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <button
                                            key={conv.userId}
                                            onClick={() => setSelectedUserId(conv.userId)}
                                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                        ${selectedUserId === conv.userId
                                                    ? "bg-primary/10 hover:bg-primary/15"
                                                    : "hover:bg-muted"
                                                }`}
                                        >
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conv.firstName}`} />
                                                    <AvatarFallback>
                                                        {conv.firstName?.[0]}{conv.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium truncate">
                                                        {conv.firstName} {conv.lastName}
                                                    </span>
                                                    {conv.unreadCount > 0 && (
                                                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                                            {conv.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                    <span className="truncate max-w-[120px]">{conv.lastMessage || conv.role}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

                {/* Main Content: Chat Window */}
                <div className="md:col-span-3 h-full">
                    {selectedUserId ? (
                        <RealtimeChat recipientId={selectedUserId} />
                    ) : (
                        <Card className="h-full flex items-center justify-center bg-muted/20 border-dashed">
                            <div className="text-center p-6">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{t.messaging.selectConversation}</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto">
                                    Choose a person from the sidebar to start chatting or continue your conversation.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>

            </div>
        </div>
    );
}
