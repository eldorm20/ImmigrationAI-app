import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, StopCircle, RefreshCw, Sparkles, X, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import Vapi from "@vapi-ai/web";

interface VoiceInterviewerProps {
    visaType: string;
    onSessionComplete?: () => void;
}

const vapi = new Vapi("2bef7e95-1052-4f7e-92fd-28aea3c3ff04"); // Public Token

export default function VoiceInterviewer({ visaType, onSessionComplete }: VoiceInterviewerProps) {
    const { toast } = useToast();
    const { t } = useI18n();
    const [isActive, setIsActive] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        // Event listeners
        vapi.on("call-start", () => setIsActive(true));
        vapi.on("call-end", () => setIsActive(false));
        vapi.on("speech-start", () => setIsSpeaking(true));
        vapi.on("speech-end", () => setIsSpeaking(false));
        vapi.on("volume-level", (level) => setVolume(level));
        vapi.on("message", (message: any) => {
            if (message.type === "transcript" && message.transcriptType === "final") {
                setTranscript(message.transcript);
            }
        });
        vapi.on("error", (e) => {
            console.error(e);
            toast({ title: "Voice Error", description: "Connection failed", variant: "destructive" });
        });

        return () => {
            vapi.stop();
        };
    }, []);

    const toggleCall = async () => {
        if (isActive) {
            vapi.stop();
        } else {
            try {
                await vapi.start("e61ced86-058c-4813-88e7-62ee549a0036"); // Assistant ID
            } catch (err) {
                toast({ title: "Error", description: "Could not start voice session", variant: "destructive" });
            }
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
                            scale: isSpeaking ? 1.1 : 1,
                            boxShadow: isSpeaking || isActive ? "0 0 40px rgba(37, 99, 235, 0.4)" : "0 0 20px rgba(0,0,0,0.1)"
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-40 h-40 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-2xl relative z-10 overflow-hidden"
                    >
                        {isActive ? (
                            <Activity className="text-white w-20 h-20 animate-pulse" />
                        ) : (
                            <MicOff className="text-white/50 w-16 h-16" />
                        )}
                    </motion.div>
                </div>

                {/* Status Text */}
                <div className="h-10 mb-6 z-10 text-center">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                        {isActive ? (isSpeaking ? "Riley is speaking..." : "Listening...") : "Ready to Start"}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-2">{visaType} Interview Preparation</p>
                </div>

                {/* Transcript Preview */}
                <div className="h-24 w-full max-w-lg text-center px-6 overflow-hidden z-10">
                    <AnimatePresence mode="wait">
                        {transcript && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-lg text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed"
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
                    onClick={toggleCall}
                    className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl ${isActive
                        ? "bg-red-500 hover:bg-red-600 text-white scale-110"
                        : "bg-green-500 hover:bg-green-600 text-white hover:scale-105"
                        } active:scale-95`}
                >
                    {isActive ? <StopCircle size={36} /> : <Mic size={36} />}
                </button>
            </div>
        </div>
    );
}
