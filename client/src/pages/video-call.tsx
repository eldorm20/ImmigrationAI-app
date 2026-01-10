import React from 'react';
import { useRoute } from 'wouter';
import { VideoConsultation } from '@/components/consultation/VideoConsultation';
import { useAuth } from '@/lib/auth';

export default function VideoCallPage() {
    const [match, params] = useRoute('/video-call/:roomId');
    const roomId = params?.roomId;
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!roomId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <p>Invalid Meeting Room</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-slate-900">
            <VideoConsultation
                meetingId={roomId}
                participantName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Guest'}
                isLawyer={user?.role === 'lawyer' || user?.role === 'admin'}
                onEnd={() => window.location.href = '/dashboard'}
            />
        </div>
    );
}
