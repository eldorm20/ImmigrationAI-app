import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, StopCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

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
    const { t, lang } = useI18n();
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

                // Set language based on current i18n language
                const speechLangMap: Record<string, string> = {
                    'en': 'en-US',
                    'uz': 'uz-UZ',
                    'ru': 'ru-RU',
                };
                recognition.lang = speechLangMap[lang] || 'en-US';

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onerror = (event: any) => {
                    setIsListening(false);
                    const errorMessages: Record<string, string> = {
                        'no-speech': lang === 'uz' ? "Nutq aniqlanmadi. Qaytadan urinib ko'ring." :
                            lang === 'ru' ? "Речь не обнаружена. Попробуйте снова." :
                                "No speech detected. Please try again.",
                        'not-allowed': lang === 'uz' ? "Mikrofon ruxsati berilmagan." :
                            lang === 'ru' ? "Доступ к микрофону запрещён." :
                                "Microphone access denied. Please enable in settings.",
                        'network': lang === 'uz' ? "Tarmoq xatosi." :
                            lang === 'ru' ? "Ошибка сети." :
                                "Network error occurred.",
                        'aborted': "Speech recognition aborted.",
                        'audio-capture': lang === 'uz' ? "Mikrofon topilmadi." :
                            lang === 'ru' ? "Микрофон не найден." :
                                "No microphone found.",
                    };

                    const errorMessage = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
                    toast({
                        title: t.common.error || "Error",
                        description: errorMessage,
                        variant: "destructive"
                    });
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
            } else {
                // Browser doesn't support speech recognition
                toast({
                    title: t.common.error || "Error",
                    description: t.voice?.notSupported || "Speech recognition not supported in this browser. Please use Chrome or Edge.",
                    variant: "destructive"
                });
            }
        }

        // Initial greeting
        if (messages.length === 0) {
            const greeting = t.voice?.greeting?.replace("{visaType}", visaType) ||
                `Hello! I'll help you prepare for your ${visaType} visa interview.`;
            setMessages([{ role: "assistant", content: greeting }]);
            setTimeout(() => speak(greeting), 500);
        }

        return () => {
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    // Update recognition language when i18n language changes
    useEffect(() => {
        if (recognitionRef.current) {
            const speechLangMap: Record<string, string> = {
                'en': 'en-US',
                'uz': 'uz-UZ',
                'ru': 'ru-RU',
            };
            recognitionRef.current.lang = speechLangMap[lang] || 'en-US';
        }
    }, [lang]);

    const speak = (text: string) => {
        if (!synthRef.current) return;

        // Cancel ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        // Select a voice based on language
        const voices = synthRef.current.getVoices();
        const preferredLang = lang === 'uz' ? 'tr-TR' : lang === 'ru' ? 'ru-RU' : 'en-US';
        const preferredVoice = voices.find(v => v.lang.includes(preferredLang)) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.lang = preferredLang;

        synthRef.current.speak(utterance);
    };

    const handleUserMessage = async (text: string) => {
        if (isProcessing) return;

        const newMessages = [...messages, { role: "user" as const, content: text }];
        setMessages(newMessages);
        setIsProcessing(true);
        setTranscript("");

        try {
            const data = await apiRequest<any>("/api/voice/interact", {
                method: "POST",
                body: JSON.stringify({
                    message: text,
                    history: newMessages.slice(-5),
                    visaType,
                    language: lang
                })
            });

            const aiResponse = data.response;
            setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
            speak(aiResponse);

        } catch (error) {
            toast({
                title: t.common.error,
                description: t.voice.connError,
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast({ title: t.common.error, description: t.voice.notSupported, variant: "destructive" });
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            if (synthRef.current) synthRef.current.cancel();
            recognitionRef.current.start();
        }
    };

    return (
        <div className="flex flex-col h-[520px] glass-premium rounded-[2.5rem] overflow-hidden border-none relative shadow-2xl">
            {/* Visualizer Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-500/5 to-indigo-500/5 pointer-events-none" />

                {/* AI Avatar / Status */}
                <div className="relative mb-10 z-10">
                    <motion.div
                        animate={{
                            scale: isSpeaking ? [1, 1.1, 1] : 1,
                            boxShadow: isSpeaking ? "0 0 40px rgba(37, 99, 235, 0.4)" : "0 0 20px rgba(0,0,0,0.1)"
                        }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-36 h-36 rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden"
                    >
                        <Sparkles className="text-white w-16 h-16 drop-shadow-glow" />
                        <div className="absolute inset-0 bg-white/10 opacity-50 blur-xl translate-x-12 -translate-y-12 rounded-full" />
                    </motion.div>

                    {/* Ripple Effects */}
                    <AnimatePresence>
                        {isSpeaking && (
                            <>
                                <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 rounded-[2.5rem] bg-brand-500/20 -z-10" />
                                <motion.div initial={{ scale: 1, opacity: 0.3 }} animate={{ scale: 2.8, opacity: 0 }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} className="absolute inset-0 rounded-[2.5rem] bg-brand-500/10 -z-10" />
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Text */}
                <div className="h-10 mb-6 z-10">
                    <AnimatePresence mode="wait">
                        {isListening && (
                            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-red-500 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {t.voice.listening}
                            </motion.p>
                        )}
                        {isProcessing && (
                            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-brand-500 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                                <RefreshCw size={14} className="animate-spin" />
                                {t.voice.thinking}
                            </motion.p>
                        )}
                        {isSpeaking && (
                            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                                <Volume2 size={14} className="animate-bounce" />
                                {t.voice.speaking}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                {/* Transcript Preview */}
                <div className="h-24 w-full max-w-lg text-center px-6 overflow-hidden z-10">
                    <AnimatePresence mode="wait">
                        {transcript && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-xl text-slate-900 dark:text-white font-black italic leading-tight"
                            >
                                "{transcript}"
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-8 z-10">
                <button
                    onClick={toggleListening}
                    disabled={isProcessing || isSpeaking}
                    className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl ${isListening
                        ? "bg-red-500 hover:bg-red-600 text-white scale-110"
                        : "bg-brand-600 hover:bg-brand-700 text-white hover:scale-105"
                        } disabled:opacity-30 disabled:cursor-not-allowed active:scale-95`}
                >
                    {isListening ? <StopCircle size={36} /> : <Mic size={36} />}
                </button>

                {messages.length > 0 && (
                    <button
                        onClick={() => speak(messages[messages.length - 1].content)}
                        disabled={isListening || isProcessing}
                        className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-500 hover:text-brand-600 flex items-center justify-center transition-all shadow-md group"
                        title={t.voice.repeat}
                    >
                        <Volume2 size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}

                {onSessionComplete && (
                    <button
                        onClick={onSessionComplete}
                        className="absolute right-10 top-10 w-10 h-10 rounded-full bg-white/50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                        title={t.voice.endSession}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Visual Bars (Decorative) */}
            {isSpeaking && (
                <div className="absolute bottom-36 left-0 w-full flex justify-center items-end gap-1 px-10 h-12 overflow-hidden pointer-events-none opacity-30">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <motion.div
                            key={i}
                            animate={{ height: [8, 24, 12, 32, 16, 8] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                            className="w-1 bg-brand-500 rounded-full"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
