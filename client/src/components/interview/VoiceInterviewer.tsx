import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, StopCircle, RefreshCw, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface VoiceInterviewerProps {
    visaType: string;
    onSessionComplete?: () => void;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function VoiceInterviewer({ visaType, onSessionComplete }: VoiceInterviewerProps) {
    const { toast } = useToast();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [transcript, setTranscript] = useState("");

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        // Initialize Speech Synthesis
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            synthRef.current = window.speechSynthesis;
        }

        // Initialize Speech Recognition
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => {
                    setIsListening(false);
                    // Verify if we have a final transcript to process
                    // Note: The 'result' event handles the processing trigger
                };

                recognition.onresult = (event: any) => {
                    let interimTranscript = "";
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    setTranscript(finalTranscript || interimTranscript);

                    if (finalTranscript) {
                        handleUserMessage(finalTranscript);
                    }
                };

                recognitionRef.current = recognition;
            }
        }

        // Initial greeting
        if (messages.length === 0) {
            const greeting = `Hello. I am the AI officer conducting your ${visaType} visa interview. Please introduce yourself.`;
            setMessages([{ role: "assistant", content: greeting }]);
            speak(greeting);
        }

        return () => {
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    const speak = (text: string) => {
        if (!synthRef.current) return;

        // Cancel ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        // Select a voice (preferably female/authoritative if available)
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English")) || voices.find(v => v.lang === "en-US");
        if (preferredVoice) utterance.voice = preferredVoice;

        synthRef.current.speak(utterance);
    };

    const handleUserMessage = async (text: string) => {
        if (isProcessing) return; // Prevent double submit

        const newMessages = [...messages, { role: "user" as const, content: text }];
        setMessages(newMessages);
        setIsProcessing(true);
        setTranscript(""); // Clear transcript for next turn

        try {
            const res = await apiRequest("/api/voice/interact", {
                method: "POST",
                body: JSON.stringify({
                    message: text,
                    history: newMessages.slice(-5), // Keep context manageable
                    visaType
                })
            });

            const data = await res.json();
            const aiResponse = data.response;

            setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
            speak(aiResponse);

        } catch (error) {
            toast({
                title: "Connection Error",
                description: "Failed to get AI response. Please try speaking again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast({ title: "Not Supported", description: "Your browser does not support voice recognition.", variant: "destructive" });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            // Stop speaking if active
            if (synthRef.current) synthRef.current.cancel();
            recognitionRef.current.start();
        }
    };

    return (
        <div className="flex flex-col h-[500px] bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
            {/* Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                {/* AI Avatar / Status */}
                <div className="relative mb-8">
                    <motion.div
                        animate={{
                            scale: isSpeaking ? [1, 1.1, 1] : 1,
                            boxShadow: isSpeaking ? "0 0 30px rgba(37, 99, 235, 0.5)" : "none"
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg z-10 relative"
                    >
                        <Sparkles className="text-white w-12 h-12" />
                    </motion.div>
                    {/* Ripple Effect when speaking */}
                    {isSpeaking && (
                        <>
                            <motion.div animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full bg-brand-500/30 -z-10" />
                            <motion.div animate={{ scale: [1, 2.5], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="absolute inset-0 rounded-full bg-brand-500/20 -z-10" />
                        </>
                    )}
                </div>

                {/* Status Text */}
                <div className="h-8 mb-4">
                    {isListening && <p className="text-brand-600 font-medium animate-pulse">Listening...</p>}
                    {isProcessing && <p className="text-slate-500 font-medium animate-pulse">Thinking...</p>}
                    {isSpeaking && <p className="text-purple-600 font-medium">Speaking...</p>}
                </div>

                {/* Transcript Preview */}
                <div className="h-16 w-full max-w-md text-center">
                    <AnimatePresence mode="wait">
                        {transcript && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-lg text-slate-700 dark:text-slate-300 font-medium"
                            >
                                "{transcript}"
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-6">
                <button
                    onClick={toggleListening}
                    disabled={isProcessing || isSpeaking}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening
                            ? "bg-red-500 hover:bg-red-600 text-white scan-pulse"
                            : "bg-brand-600 hover:bg-brand-700 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
                >
                    {isListening ? <StopCircle size={32} /> : <Mic size={32} />}
                </button>

                {messages.length > 0 && (
                    <button
                        onClick={() => speak(messages[messages.length - 1].content)}
                        disabled={isListening}
                        className="p-4 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all"
                        title="Repeat last message"
                    >
                        <Volume2 size={24} />
                    </button>
                )}

                {onSessionComplete && (
                    <button
                        onClick={onSessionComplete}
                        className="absolute right-6 bottom-6 text-sm text-slate-500 hover:text-slate-700"
                    >
                        End Session
                    </button>
                )}
            </div>
        </div>
    );
}
