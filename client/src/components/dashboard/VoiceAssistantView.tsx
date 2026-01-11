import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Volume2, MicOff, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
    audioUrl?: string;
}

export default function VoiceAssistantView() {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [conversationId] = useState(() => crypto.randomUUID());

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = handleRecordingStop;

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast({
                title: "Microphone Error",
                description: "Could not access microphone. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks to release microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleRecordingStop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        await processAudio(audioBlob);
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);

        try {
            // 1. Add simplified user message (transcript will come later)
            const userMsgId = crypto.randomUUID();

            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            formData.append("conversationId", conversationId);
            formData.append("language", "en"); // Could make this selectable

            const response = await fetch("/api/voice/chat", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || "Processing failed");
            }

            // Add messages
            setMessages(prev => [
                ...prev,
                {
                    id: userMsgId,
                    role: "user",
                    text: result.userText,
                    timestamp: new Date()
                },
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: result.aiText,
                    timestamp: new Date(),
                    audioUrl: result.audio ? `data:audio/wav;base64,${result.audio}` : undefined
                }
            ]);

            // Auto-play response
            if (result.audio) {
                playAudio(`data:audio/wav;base64,${result.audio}`);
            }

        } catch (error: any) {
            console.error("Voice processing error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to process voice command",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const playAudio = (url: string) => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.src = url;
            audioPlayerRef.current.play();
            setIsPlaying(true);
            audioPlayerRef.current.onended = () => setIsPlaying(false);
        }
    };

    return (
        <div className="container max-w-4xl mx-auto p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Mic className="h-8 w-8 text-primary" />
                    Voice Assistant
                </h1>
                <p className="text-muted-foreground">
                    Speak naturally with our AI immigration expert.
                </p>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-2 shadow-lg">
                <CardContent className="flex-1 p-0 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    <ScrollArea ref={scrollRef} className="h-full p-4">
                        <div className="space-y-6 pb-20">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground opacity-50">
                                    <Mic className="h-16 w-16 mb-4" />
                                    <p className="text-lg">Tap microphone to start speaking</p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex w-full mb-4",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-5 py-3 shadow-sm",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-white dark:bg-slate-800 border rounded-tl-none"
                                        )}
                                    >
                                        <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                                        {msg.audioUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="mt-2 h-6 px-2 text-xs opacity-70 hover:opacity-100"
                                                onClick={() => playAudio(msg.audioUrl!)}
                                            >
                                                <Volume2 className="h-3 w-3 mr-1" />
                                                Replay
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isProcessing && (
                                <div className="flex justify-start w-full">
                                    <div className="bg-white dark:bg-slate-800 border rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Audio Player (Hidden) */}
                    <audio ref={audioPlayerRef} className="hidden" />

                </CardContent>

                <CardFooter className="p-4 bg-white dark:bg-slate-950 border-t flex justify-center items-center gap-4">
                    {isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-4">
                                <span className="animate-pulse text-red-500 font-bold flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-red-500"></span>
                                    Recording...
                                </span>
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-all"
                                    onClick={stopRecording}
                                >
                                    <Square className="h-6 w-6 fill-current" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Tap to stop</p>
                        </div>
                    ) : (
                        <Button
                            size="lg"
                            className={cn(
                                "h-16 w-16 rounded-full shadow-xl hover:scale-105 transition-all",
                                isProcessing ? "opacity-50 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                            )}
                            onClick={startRecording}
                            disabled={isProcessing}
                        >
                            <Mic className="h-8 w-8" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
