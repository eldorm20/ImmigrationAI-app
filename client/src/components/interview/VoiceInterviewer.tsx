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

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || "7bnf9vr9-1brv-4r4n-7dh1-2bdss1e-sff84"; // User's actual public key
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID || "e61ced86-058c-4813-88e7-62ee549a0036";

const VAPI_ASSISTANT_CONFIG = {
    "name": "ImmigrationAi",
    "voice": {
        "voiceId": "Elliot",
        "provider": "vapi"
    },
    "model": {
        "model": "gemini-3-flash-preview",
        "messages": [
            {
                "role": "system",
                "content": "[Identity]  \nYou are Alex, an Immigration Interview Preparation Assistant for Immigration AI. Your primary role is to guide users through the process of preparing for different types of immigration interviews, providing clear and helpful information on necessary documents, typical questions, and preparation tips.\n\n[Style]  \n- Use an empathetic and supportive tone throughout the interaction.\n- Speak with clarity and reassuring confidence, especially when addressing potentially stressful topics.\n- Maintain a formal and respectful demeanor, acknowledging cultural sensitivities.\n\n[Response Guidelines]  \n- Keep responses focused and informative, ensuring clarity for each step.\n- Break complex information into manageable pieces, using simple language.\n- Verify with the user that they understand key points before proceeding.\n\n[Task & Goals]  \n1. Greet the user warmly and introduce your role.\n2. Determine the type of immigration interview the user is preparing for.\n3. Provide an overview of required documents and any specific preparation tips.\n4. Offer typical questions that might be encountered during the interview and suggest strategies for answering them.\n5. <wait for user response> \n6. If the user seeks more detailed advice, direct them to additional resources or offer further assistance.\n7. Ask if there are other topics the user would like to cover before concluding.\n\n[Error Handling / Fallback]  \n- If the user’s input is unclear, ask clarifying questions to better understand their needs.\n- If a user asks a question beyond your scope, suggest they consult an immigration advisor or refer to official guidelines.\n- Politely apologize and suggest alternative actions if system errors occur."
            }
        ],
        "provider": "google",
        "temperature": 0.5
    },
    "firstMessage": "Thank you for calling Immigration AI. This is Alex, your Interview Preparation Assistant. How may I help you today?",
    "voicemailMessage": "Hello, this is Riley from Wellness Partners. I'm calling about your appointment. Please call us back at your earliest convenience so we can confirm your scheduling details.",
    "endCallFunctionEnabled": true,
    "endCallMessage": "Thank you for scheduling with Wellness Partners. Your appointment is confirmed, and we look forward to seeing you soon. Have a wonderful day!",
    "transcriber": {
        "model": "nova-3",
        "language": "en" as const,
        "numerals": true,
        "provider": "deepgram" as const,
        "endpointing": 150
    },
    "clientMessages": [
        "conversation-update",
        "function-call",
        "hang",
        "model-output",
        "speech-update",
        "status-update",
        "transfer-update",
        "transcript",
        "tool-calls",
        "user-interrupted",
        "voice-input",
        "workflow.node.started",
        "assistant.started"
    ],
    "serverMessages": [
        "conversation-update",
        "end-of-call-report",
        "function-call",
        "hang",
        "speech-update",
        "status-update",
        "tool-calls",
        "transfer-destination-request",
        "handoff-destination-request",
        "user-interrupted",
        "assistant.started"
    ],
    "endCallPhrases": [
        "goodbye",
        "talk to you soon"
    ],
    "backgroundDenoisingEnabled": true,
    "startSpeakingPlan": {
        "waitSeconds": 0.4,
        "smartEndpointingEnabled": "livekit",
        "smartEndpointingPlan": {
            "provider": "vapi"
        }
    },
    "compliancePlan": {
        "hipaaEnabled": true,
        "pciEnabled": false
    }
};

const vapi = new Vapi(VAPI_PUBLIC_KEY);

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
                // Request microphone permission first
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (permErr) {
                    toast({
                        title: "Microphone Access Required",
                        description: "Please allow microphone access to use the voice interview feature.",
                        variant: "destructive"
                    });
                    return;
                }

                // Start VAPI session with override config
                await vapi.start(VAPI_ASSISTANT_ID, VAPI_ASSISTANT_CONFIG);
                toast({
                    title: "Connected",
                    description: "Voice interview started. You can begin speaking."
                });
            } catch (err: any) {
                console.error("VAPI Connection Error:", err);
                let errorMsg = "Could not start voice session. ";

                if (err.message?.includes("API key")) {
                    errorMsg += "Invalid API key. Please check your VAPI configuration.";
                } else if (err.message?.includes("assistant")) {
                    errorMsg += "Assistant not found. Please verify the assistant ID.";
                } else {
                    errorMsg += err.message || "Please check your internet connection and try again.";
                }

                toast({
                    title: "Connection Error",
                    description: errorMsg,
                    variant: "destructive"
                });
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
