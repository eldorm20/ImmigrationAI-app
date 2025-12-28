import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
    Mic, Square, Play, Save, ChevronRight, AlertCircle, Bot, User, Globe
} from "lucide-react";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

// Extend Window for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

const SUPPORTED_LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'uz-UZ', label: "O'zbekcha" },
    { code: 'ru-RU', label: 'Русский' },
];

export default function InterviewPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { lang } = useI18n();
    const [activeSession, setActiveSession] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<any[]>([]); // {role: 'ai'|'user', content: string}
    const [loading, setLoading] = useState(false);
    const [speechLang, setSpeechLang] = useState<string>('en-US');
    const [interimText, setInterimText] = useState<string>('');
    const [speechSupported, setSpeechSupported] = useState<boolean>(true);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Check for browser support on mount
    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setSpeechSupported(false);
        }

        // Set initial language based on i18n
        if (lang === 'uz') setSpeechLang('uz-UZ');
        else if (lang === 'ru') setSpeechLang('ru-RU');
        else setSpeechLang('en-US');
    }, [lang]);

    // Real-time recording with Web Speech API
    const startRecording = async () => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            toast({
                title: "Not Supported",
                description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
                variant: "destructive"
            });
            return;
        }

        // Request microphone permission first
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            toast({
                title: "Microphone Access Denied",
                description: "Please allow microphone access to use voice recognition.",
                variant: "destructive"
            });
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = speechLang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsRecording(true);
            toast({ title: "Listening...", description: `Language: ${speechLang}` });
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPart;
                } else {
                    interimTranscript += transcriptPart;
                }
            }

            setInterimText(interimTranscript);

            if (finalTranscript) {
                // Add to transcript and send to AI for evaluation
                setTranscript(prev => [...prev, { role: 'user', content: finalTranscript }]);
                setInterimText('');

                // Submit to AI for evaluation
                evaluateAnswer(finalTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            let message = "Speech recognition error. Please try again.";

            if (event.error === 'no-speech') {
                message = "No speech detected. Please speak clearly into your microphone.";
            } else if (event.error === 'audio-capture') {
                message = "No microphone found. Please check your audio settings.";
            } else if (event.error === 'not-allowed') {
                message = "Microphone access was denied. Please allow microphone access.";
            }

            toast({ title: "Error", description: message, variant: "destructive" });
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
            setInterimText('');
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setInterimText('');
    };

    // Send answer to AI for evaluation
    const evaluateAnswer = async (answer: string) => {
        if (!activeSession || !transcript.length) return;

        const lastQuestion = transcript.filter(t => t.role === 'ai').pop()?.content;
        if (!lastQuestion) return;

        try {
            const feedback = await apiRequest<{ score: number; feedback: string; suggestion: string }>(
                '/ai/interview/evaluate',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        question: lastQuestion,
                        answer,
                        language: speechLang.split('-')[0]
                    })
                }
            );

            // Add AI feedback as next message
            const feedbackMessage = feedback.feedback
                ? `${feedback.feedback}\n\nNext question: What documents do you have to support your application?`
                : "Thank you for your answer. Can you tell me more about your travel history?";

            setTranscript(prev => [...prev, { role: 'ai', content: feedbackMessage }]);
        } catch (err) {
            // If AI fails, add a generic follow-up
            setTranscript(prev => [...prev, {
                role: 'ai',
                content: "Thank you. What is the purpose of your visit?"
            }]);
        }
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
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            The AI agent will simulate a real consular officer. Speak clearly into your microphone.
                        </p>

                        {/* Language Selector */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <Globe className="w-5 h-5 text-slate-400" />
                            <select
                                value={speechLang}
                                onChange={(e) => setSpeechLang(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                                {SUPPORTED_LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        {!speechSupported && (
                            <div className="text-amber-600 text-sm mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                ⚠️ Speech recognition not supported. Please use Chrome or Edge.
                            </div>
                        )}

                        <LiveButton size="lg" onClick={startSession} icon={Play} disabled={loading || !speechSupported}>
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
                            {(isRecording || interimText) && (
                                <div className="flex justify-end">
                                    <div className="bg-brand-600/50 text-white p-4 rounded-xl rounded-tr-none animate-pulse">
                                        {interimText || 'Listening...'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Language & Controls */}
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-slate-400" />
                                <select
                                    value={speechLang}
                                    onChange={(e) => setSpeechLang(e.target.value)}
                                    className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                                    disabled={isRecording}
                                >
                                    {SUPPORTED_LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                            <LiveButton
                                size="lg"
                                variant={isRecording ? "danger" : "primary"}
                                onClick={isRecording ? stopRecording : startRecording}
                                className="w-full md:w-auto shadow-xl"
                                icon={isRecording ? Square : Mic}
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
