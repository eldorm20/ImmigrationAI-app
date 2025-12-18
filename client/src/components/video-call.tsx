import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface VideoCallProps {
    roomName: string;
    displayName: string;
    email?: string;
    onLeave: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export default function VideoCall({ roomName, displayName, email, onLeave }: VideoCallProps) {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [jitsiApi, setJitsiApi] = useState<any>(null);

    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
            setLoading(false);
            initializeJitsi();
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
            if (jitsiApi) {
                jitsiApi.dispose();
            }
        };
    }, []);

    const initializeJitsi = () => {
        if (!window.JitsiMeetExternalAPI) return;

        const domain = 'meet.jit.si';
        const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: displayName,
                email: email
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'e2ee'
                ],
            }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);

        api.addEventListeners({
            videoConferenceLeft: () => {
                onLeave();
            },
            readyToClose: () => {
                onLeave();
            }
        });

        setJitsiApi(api);
    };

    return (
        <div className="relative w-full h-[600px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-slate-900">
                    <Loader2 className="animate-spin mb-4" size={48} />
                    <p className="font-medium animate-pulse">Initializing Secure Connection...</p>
                </div>
            )}
            <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
    );
}
