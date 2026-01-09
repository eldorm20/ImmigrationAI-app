// AI Chat Service with Legal Citations - Frontend Integration
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/useToast';
import {
    Send,
    Loader2,
    ExternalLink,
    Shield,
    AlertCircle,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Array<{
        source: string;
        url: string;
        authority: 'primary' | 'secondary';
        relevance: number;
        excerpt: string;
    }>;
    confidence?: number;
    timestamp: Date;
}

interface AIResponse {
    answer: string;
    citations: Message['citations'];
    confidence: number;
}

export function AIChatWithCitations() {
    const { t } = useI18n();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');

    // AI Chat mutation
    const chatMutation = useMutation({
        mutationFn: async (question: string) => {
            return apiRequest<AIResponse>('/ai/chat/legal', {
                method: 'POST',
                body: JSON.stringify({ question }),
            });
        },
        onSuccess: (data) => {
            const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.answer,
                citations: data.citations,
                confidence: data.confidence,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to get AI response',
                variant: 'destructive',
            });
        },
    });

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        chatMutation.mutate(input);
        setInput('');
    };

    const getConfidenceBadge = (confidence?: number) => {
        if (!confidence) return null;

        const level = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';
        const colors = {
            high: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
            medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
            low: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        };

        const icons = {
            high: CheckCircle2,
            medium: AlertCircle,
            low: AlertCircle,
        };

        const Icon = icons[level];

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[level]}`}>
                <Icon className="w-3 h-3" />
                {Math.round(confidence * 100)}% Confidence
            </span>
        );
    };

    return (
        <div className="flex flex-col h-[600px] glass-card">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-600" />
                    <h3 className="font-bold text-lg">{t?.dash?.chat || "AI Assistant"}</h3>
                    <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Cited from official sources
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12">
                        <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">
                            Ask any immigration law question
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Answers are cited from official sources (lex.uz, gov.uk, etc.)
                        </p>
                    </div>
                ) : (
                    messages.map((message, idx) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] ${message.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'} rounded-2xl p-4`}>
                                <p className="whitespace-pre-wrap">{message.content}</p>

                                {/* Citations */}
                                {message.citations && message.citations.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                Sources:
                                            </p>
                                            {getConfidenceBadge(message.confidence)}
                                        </div>
                                        <div className="space-y-2">
                                            {message.citations.map((citation, citIdx) => (
                                                <div
                                                    key={citIdx}
                                                    className="bg-white dark:bg-slate-900 rounded-lg p-3 text-sm"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${citation.authority === 'primary'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                            }`}>
                                                            {citation.authority === 'primary' ? 'PRIMARY' : 'SECONDARY'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <a
                                                                href={citation.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="font-semibold text-brand-600 hover:underline flex items-center gap-1"
                                                            >
                                                                {citation.source}
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                                {citation.excerpt}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                Relevance: {Math.round(citation.relevance * 100)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}

                {chatMutation.isPending && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI is searching official sources...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about immigration laws, visa requirements..."
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        disabled={chatMutation.isPending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || chatMutation.isPending}
                        className="bg-brand-600 hover:bg-brand-700"
                    >
                        {chatMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Powered by Open-Source AI • All answers cited from official sources
                </p>
            </div>
        </div>
    );
}
