import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Clock, List } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/live-elements';

export default function TimeTracker() {
    const { toast } = useToast();
    const [entries, setEntries] = useState<any[]>([]);
    const [description, setDescription] = useState('');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        fetchEntries();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                if (startTime) {
                    setElapsed(Math.floor((Date.now() - startTime) / 1000));
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, startTime]);

    const fetchEntries = async () => {
        try {
            const data = await apiRequest<any[]>('/time-entries');
            setEntries(data);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleTimer = () => {
        if (isTimerRunning) {
            // Stop timer and save
            stopTimer();
        } else {
            // Start timer
            if (!description) {
                toast({ title: "Please enter a description first", variant: "destructive" });
                return;
            }
            setIsTimerRunning(true);
            setStartTime(Date.now());
        }
    };

    const stopTimer = async () => {
        setIsTimerRunning(false);
        const durationMinutes = Math.ceil(elapsed / 60);

        try {
            await apiRequest('/time-entries', {
                method: 'POST',
                body: JSON.stringify({
                    description,
                    duration: durationMinutes,
                    isBillable: true,
                    date: new Date().toISOString()
                })
            });
            toast({ title: "Time logged successfully" });
            setDescription("");
            setElapsed(0);
            setStartTime(null);
            fetchEntries();
        } catch (err) {
            toast({ title: "Failed to save time entry", variant: "destructive" });
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Timer Widget */}
            <AnimatedCard className="md:col-span-1 bg-slate-900 text-white p-6 flex flex-col items-center justify-center text-center">
                <div className="mb-6 font-mono text-5xl font-bold tracking-widest text-brand-400">
                    {formatTime(elapsed)}
                </div>

                <input
                    placeholder="What are you working on?"
                    className="w-full mb-6 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    disabled={isTimerRunning}
                />

                <button
                    onClick={toggleTimer}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isTimerRunning
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                        }`}
                >
                    {isTimerRunning ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" className="ml-1" size={28} />}
                </button>
                <p className="mt-4 text-sm text-slate-400 font-medium uppercase tracking-wider">
                    {isTimerRunning ? 'Timer Running' : 'Start Timer'}
                </p>
            </AnimatedCard>

            {/* Recent Entries */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                    <List size={20} /> Recent Entries
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {entries.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No time entries logged yet</p>
                    ) : (
                        entries.map(entry => (
                            <div key={entry.id} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{entry.description}</p>
                                    <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-bold text-slate-900 dark:text-white">{entry.duration} min</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.status === 'billed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {entry.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
