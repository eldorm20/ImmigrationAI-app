import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
    Mic, Square, Play, Save, ChevronRight, AlertCircle, Bot, User
} from "lucide-react";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

export default function InterviewPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeSession, setActiveSession] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<any[]>([]); // {role: 'ai'|'user', content: string}
    const [loading, setLoading] = useState(false);

    // Real-time recording - requires WebRTC/browser microphone access
    const startRecording = async () => {
        setIsRecording(true);
        toast({ title: "Microphone Active", description: "Listening... (Real AI integration pending OpenAI Realtime API key)" });

        // TODO: Implement real audio capture and send to AI backend
        // For now, inform the user that this feature requires configuration
        setTimeout(() => {
            setIsRecording(false);
            toast({
                title: "AI Integration Required",
                description: "Configure OPENAI_API_KEY for real-time interview simulation.",
                variant: "default"
            });
        }, 3000);
    };

    const startSession = async () => {
        setLoading(true);
        try {
            const session = await apiRequest<any>("/interview/start", {
                method: "POST",
                body: JSON.stringify({ title: "Visa Interview Session" })
            });
            setActiveSession(session);
            setTranscript([{
                role: 'ai',
                content: "Hello, I am the AI Interview Officer. Please state your name and the visa type you are applying for."
            }]);
            toast({ title: "Session Started", description: "Your interview session has begun." });
        } catch (err) {
            toast({ title: "Error", description: "Failed to start session. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const endSession = async () => {
        if (!activeSession) return;
        try {
            await apiRequest(`/interview/${activeSession.id}/complete`, {
                method: "POST",
                body: JSON.stringify({
                    transcript,
                    durationSeconds: Math.floor((Date.now() - new Date(activeSession.createdAt).getTime()) / 1000),
                    feedback: null // AI feedback would be generated server-side
                })
            });
            toast({ title: "Interview Completed", description: "Session saved to your profile." });
            setActiveSession(null);
            setTranscript([]);
        } catch (err) {
            toast({ title: "Error", description: "Failed to save session", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 pt-24">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                            <Bot className="text-brand-600 w-8 h-8" /> AI Interview Simulator
                        </h1>
                        <p className="text-slate-500 mt-2">Practice your visa interview with an AI officer.</p>
                    </div>
                    {activeSession && (
                        <LiveButton variant="danger" icon={Square} onClick={endSession}>End Session</LiveButton>
                    )}
                </div>

                {!activeSession ? (
                    <AnimatedCard className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 text-center">
                        <Bot size={64} className="mx-auto text-brand-200 mb-6" />
                        <h2 className="text-2xl font-bold mb-4">Ready to practice?</h2>
                        <p className="text-slate-600 mb-8 max-w-md mx-auto">
                            The AI agent will simulate a real consular officer. Speak clearly into your microphone.
                        </p>
                        <LiveButton size="lg" onClick={startSession} icon={Play} disabled={loading}>
                            {loading ? "Starting..." : "Start Interview"}
                        </LiveButton>
                    </AnimatedCard>
                ) : (
                    <div className="space-y-6">
                        {/* Transcript Area */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-6 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
                            {transcript.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user'
                                        ? 'bg-brand-600 text-white rounded-tr-none'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                        }`}>
                                        <p className="text-xs opacity-70 mb-1 font-bold uppercase">{msg.role === 'ai' ? 'Officer Smith' : 'You'}</p>
                                        <p>{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isRecording && (
                                <div className="flex justify-end">
                                    <div className="bg-brand-600/50 text-white p-4 rounded-xl rounded-tr-none animate-pulse">
                                        Listening...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center pt-4">
                            <LiveButton
                                size="lg"
                                variant={isRecording ? "danger" : "primary"}
                                onClick={isRecording ? () => setIsRecording(false) : startRecording}
                                className="w-full md:w-auto shadow-xl"
                                icon={Mic}
                            >
                                {isRecording ? "Stop Speaking" : "Push to Talk"}
                            </LiveButton>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
