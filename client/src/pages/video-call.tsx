import React, { useEffect, useRef, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Users, ShieldCheck, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

// ICE configuration - will be fetched from server
const DEFAULT_ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ]
};

export default function VideoCallPage() {
    const [match, params] = useRoute('/video-call/:roomId');
    const roomId = params?.roomId;
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const [_, setLocation] = useLocation();

    // State
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [status, setStatus] = useState<'initializing' | 'waiting' | 'connected' | 'ended' | 'error'>('initializing');
    const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
    const [participants, setParticipants] = useState<string[]>([]);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null); // Ref for stable access in callbacks

    useEffect(() => {
        if (!roomId || authLoading) return;
        if (!user) {
            setLocation('/auth');
            return;
        }

        initializeCall();

        return () => {
            cleanupCall();
        };
    }, [roomId, user, authLoading]);

    // Attach streams to video elements
    useEffect(() => {
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const initializeCall = async () => {
        try {
            // 1. Get ICE servers
            const iceResponse = await apiRequest<{ iceServers: any[] }>('/video/ice-servers');
            const iceConfig = { iceServers: iceResponse.iceServers || DEFAULT_ICE_SERVERS.iceServers };

            // 2. Get User Media
            const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(userStream);

            // 3. Connect to Signaling Server
            const socket = io(`${window.location.origin}/video`, {
                auth: { token: localStorage.getItem('accessToken') }
            });
            socketRef.current = socket;

            // 4. Initialize Peer Connection
            const pc = new RTCPeerConnection(iceConfig);
            peerRef.current = pc;
            setPeerConnection(pc);

            // Add local tracks to peer connection
            userStream.getTracks().forEach(track => {
                pc.addTrack(track, userStream);
            });

            // Handle remote track
            pc.ontrack = (event) => {
                console.log('Remote track received', event.streams[0]);
                setRemoteStream(event.streams[0]);
                setStatus('connected');
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        roomId,
                        candidate: event.candidate,
                    });
                }
            };

            // Socket Events
            socket.on('connect', () => {
                console.log('Connected to signaling server');
                socket.emit('join-room', { roomId, userId: user?.id });
            });

            socket.on('user-joined', async ({ userId }: { userId: string }) => {
                console.log('User joined:', userId);
                setParticipants(prev => [...prev, userId]);
                setStatus('connected');

                // Create Offer (Initiator)
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('offer', { roomId, offer, targetId: userId });
                } catch (err) {
                    console.error('Error creating offer:', err);
                }
            });

            socket.on('offer', async (data: { offer: RTCSessionDescriptionInit, senderId: string, senderSocketId: string }) => {
                console.log('Received offer from:', data.senderId);
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', {
                        roomId,
                        answer,
                        targetSocketId: data.senderSocketId
                    });
                    setStatus('connected');
                } catch (err) {
                    console.error('Error handling offer:', err);
                }
            });

            socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
                console.log('Received answer');
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error('Error handling answer:', err);
                }
            });

            socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            });

            socket.on('user-left', () => {
                toast({ title: "Participant left the call" });
                setRemoteStream(null);
                setStatus('waiting');
            });

            setStatus('waiting');

        } catch (err) {
            console.error('Failed to initialize call:', err);
            setStatus('error');
            toast({
                title: "Camera/Mic Error",
                description: "Could not access camera or microphone.",
                variant: 'destructive'
            });
        }
    };

    const cleanupCall = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        if (peerRef.current) {
            peerRef.current.close();
        }
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = () => {
        cleanupCall();
        setLocation('/dashboard');
    };

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
                <VideoOff className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
                <p className="text-slate-400 mb-6">Unable to access media devices or server connection failed.</p>
                <button onClick={() => setLocation('/dashboard')} className="px-6 py-2 bg-white text-slate-900 rounded-lg font-bold">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-2 text-white/80">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                    <span className="text-sm font-medium">End-to-End Encrypted</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white/90 text-sm flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    {status === 'waiting' ? 'Waiting for participant...' :
                        status === 'connected' ? 'Connected' : 'Initializing...'}
                </div>
            </div>

            {/* Share Link Overlay */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-900/50 backdrop-blur-sm p-2 rounded-full border border-white/10 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                <div className="bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {roomId}
                </div>
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({ title: "Link Copied", description: "Share this link with your client" });
                    }}
                    className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                    Copy Link
                </button>
            </div>

            {/* Video Grid */}
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className="relative w-full max-w-6xl aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">

                    {/* Remote Video (Main) */}
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            {status === 'waiting' ? (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 animate-pulse" />
                                        <Loader2 className="w-16 h-16 animate-spin text-brand-500 relative z-10" />
                                    </div>
                                    <p className="mt-4 font-medium">Waiting for participant to join...</p>
                                </>
                            ) : (
                                <Users className="w-16 h-16 opacity-50" />
                            )}
                        </div>
                    )}

                    {/* Local Video (PiP) */}
                    <div className="absolute bottom-4 right-4 w-48 sm:w-64 aspect-video bg-black rounded-lg overflow-hidden shadow-xl border border-white/10 z-20">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted // Mute local video to prevent echo
                            className={`w-full h-full object-cover mirror ${isVideoOff ? 'hidden' : ''}`}
                        />
                        {isVideoOff && (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white/50">
                                <VideoOff className="w-8 h-8" />
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 text-white/70 text-xs font-medium bg-black/50 px-2 py-0.5 rounded">
                            You
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleMute}
                    className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={endCall}
                    className="p-5 rounded-full shadow-lg bg-red-500 text-white hover:bg-red-600 transition-colors mx-4"
                >
                    <PhoneOff className="w-8 h-8" />
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleVideo}
                    className={`p-4 rounded-full shadow-lg backdrop-blur-md transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </motion.button>
            </div>

            <style>{`
                .mirror {
                    transform: scaleX(-1);
                }
            `}</style>
        </div>
    );
}
