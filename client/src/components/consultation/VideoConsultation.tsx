// Jitsi Video Consultation Component
// Fully integrated for both clients and lawyers

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    ScreenShare,
    MessageSquare,
    Users,
    Settings,
    Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

// Extend window type to include JitsiMeetExternalAPI
declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface VideoConsultationProps {
    meetingId: string;
    participantName?: string;
    isLawyer?: boolean;
    onEnd?: () => void;
}

export function VideoConsultation({
    meetingId,
    participantName,
    isLawyer = false,
    onEnd
}: VideoConsultationProps) {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();

    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const [jitsiApi, setJitsiApi] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [participantCount, setParticipantCount] = useState(1);

    useEffect(() => {
        // Load Jitsi Meet External API script
        const loadJitsiScript = () => {
            if (window.JitsiMeetExternalAPI) {
                initializeJitsi();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = () => initializeJitsi();
            script.onerror = () => {
                toast({
                    title: t.common?.error || 'Error',
                    description: 'Failed to load video conferencing service',
                    variant: 'destructive'
                });
                setIsLoading(false);
            };
            document.body.appendChild(script);
        };

        const initializeJitsi = () => {
            if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

            const displayName = participantName || `${user?.firstName} ${user?.lastName}` || 'Guest';
            const roomName = `ImmigrationAI_${meetingId}`;

            const options = {
                roomName: roomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    displayName: displayName,
                    email: user?.email || '',
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    enableWelcomePage: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    defaultLanguage: 'en',
                    enableNoisyMicDetection: true,
                    toolbarButtons: [
                        'microphone',
                        'camera',
                        'closedcaptions',
                        'desktop',
                        'fullscreen',
                        'fodeviceselection',
                        'hangup',
                        'chat',
                        'recording',
                        'livestreaming',
                        'etherpad',
                        'sharedvideo',
                        'settings',
                        'raisehand',
                        'videoquality',
                        'filmstrip',
                        'feedback',
                        'stats',
                        'shortcuts',
                        'tileview',
                        'download',
                        'help',
                        'mute-everyone',
                    ],
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_ALWAYS_VISIBLE: false,
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    SHOW_BRAND_WATERMARK: false,
                    MOBILE_APP_PROMO: false,
                    DISPLAY_WELCOME_PAGE_CONTENT: false,
                },
            };

            const api = new window.JitsiMeetExternalAPI('meet.jit.si', options);

            // Event listeners
            api.addEventListener('videoConferenceJoined', () => {
                setIsLoading(false);
                toast({
                    title: t.common?.success || 'Success',
                    description: 'Joined consultation successfully',
                    className: 'bg-green-50 text-green-900 border-green-200'
                });

                // Log consultation start
                logConsultationEvent('joined');
            });

            api.addEventListener('videoConferenceLeft', () => {
                logConsultationEvent('left');
                onEnd?.();
            });

            api.addEventListener('participantJoined', () => {
                setParticipantCount(prev => prev + 1);
            });

            api.addEventListener('participantLeft', () => {
                setParticipantCount(prev => Math.max(1, prev - 1));
            });

            api.addEventListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
                setIsAudioMuted(muted);
            });

            api.addEventListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
                setIsVideoMuted(muted);
            });

            api.addEventListener('readyToClose', () => {
                api.dispose();
                onEnd?.();
            });

            setJitsiApi(api);
        };

        const logConsultationEvent = async (event: 'joined' | 'left') => {
            try {
                await apiRequest('/consultations/log', {
                    method: 'POST',
                    body: JSON.stringify({
                        meetingId,
                        userId: user?.id,
                        event,
                        timestamp: new Date().toISOString(),
                        role: isLawyer ? 'lawyer' : 'client'
                    })
                });
            } catch (error) {
                console.error('Failed to log consultation event:', error);
            }
        };

        loadJitsiScript();

        // Cleanup
        return () => {
            if (jitsiApi) {
                jitsiApi.dispose();
            }
        };
    }, [meetingId, user, participantName, isLawyer]);

    const toggleAudio = () => {
        if (jitsiApi) {
            jitsiApi.executeCommand('toggleAudio');
        }
    };

    const toggleVideo = () => {
        if (jitsiApi) {
            jitsiApi.executeCommand('toggleVideo');
        }
    };

    const shareScreen = () => {
        if (jitsiApi) {
            jitsiApi.executeCommand('toggleShareScreen');
        }
    };

    const toggleChat = () => {
        if (jitsiApi) {
            jitsiApi.executeCommand('toggleChat');
        }
    };

    const endCall = () => {
        if (jitsiApi) {
            jitsiApi.executeCommand('hangup');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="text-center space-y-4">
                    <Loader2 className="w-16 h-16 animate-spin text-brand-500 mx-auto" />
                    <h3 className="text-xl font-semibold text-white">Connecting to consultation...</h3>
                    <p className="text-slate-400">Please wait while we set up your video call</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full bg-slate-900">
            {/* Jitsi Meet Container */}
            <div ref={jitsiContainerRef} className="w-full h-full" />

            {/* Custom Control Overlay (Optional - Jitsi has its own controls) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50"
            >
                <Card className="glass-card border-white/10 px-6 py-4">
                    <div className="flex items-center gap-4">
                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={toggleAudio}
                                variant={isAudioMuted ? 'destructive' : 'default'}
                                size="icon"
                                className="rounded-full w-12 h-12"
                                title={isAudioMuted ? 'Unmute' : 'Mute'}
                            >
                                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </Button>

                            <Button
                                onClick={toggleVideo}
                                variant={isVideoMuted ? 'destructive' : 'default'}
                                size="icon"
                                className="rounded-full w-12 h-12"
                                title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                            >
                                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                            </Button>

                            <Button
                                onClick={shareScreen}
                                variant="outline"
                                size="icon"
                                className="rounded-full w-12 h-12"
                                title="Share screen"
                            >
                                <ScreenShare className="w-5 h-5" />
                            </Button>

                            <Button
                                onClick={toggleChat}
                                variant="outline"
                                size="icon"
                                className="rounded-full w-12 h-12"
                                title="Toggle chat"
                            >
                                <MessageSquare className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="h-8 w-px bg-white/20" />

                        {/* Participant Count */}
                        <div className="flex items-center gap-2 text-white px-3">
                            <Users className="w-5 h-5" />
                            <span className="font-semibold">{participantCount}</span>
                        </div>

                        <div className="h-8 w-px bg-white/20" />

                        {/* End Call */}
                        <Button
                            onClick={endCall}
                            variant="destructive"
                            className="rounded-full px-6"
                        >
                            <PhoneOff className="w-5 h-5 mr-2" />
                            End Call
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
