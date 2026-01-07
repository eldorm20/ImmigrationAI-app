import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Clock, List, Timer, History, Zap, CheckCircle } from 'lucide-react';
import { AnimatedCard, GlassInput, LiveButton } from '@/components/ui/live-elements';
import { motion, AnimatePresence } from 'framer-motion';

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
            setEntries(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleTimer = () => {
        if (isTimerRunning) {
            stopTimer();
        } else {
            if (!description) {
                toast({ title: "Narrative Required", description: "Please enter a description for this session.", variant: "destructive" });
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
            toast({ title: "Phase Logged", description: `${durationMinutes} minutes added to practice records.` });
            setDescription("");
            setElapsed(0);
            setStartTime(null);
            fetchEntries();
        } catch (err) {
            toast({ title: "Logging failed", variant: "destructive" });
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Timer Widget */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <AnimatedCard className="lg:col-span-1 bg-slate-950 text-white p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden border-none rounded-[40px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-indigo-600/20"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>

                    <div className="relative z-10 w-full">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 text-brand-400">
                                <Timer size={32} />
                            </div>
                        </div>

                        <div className="mb-8 font-black text-6xl tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {formatTime(elapsed)}
                        </div>

                        <div className="space-y-4 mb-10 text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Working Context</label>
                            <GlassInput
                                placeholder="Describe current objective..."
                                className="w-full bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                disabled={isTimerRunning}
                            />
                        </div>

                        <div className="flex flex-col items-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={toggleTimer}
                                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isTimerRunning
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                                    : 'bg-brand-500 hover:bg-brand-600 shadow-[0_0_30px_rgba(37,99,235,0.4)]'
                                    }`}
                            >
                                {isTimerRunning ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" className="ml-1" size={32} />}
                            </motion.button>
                            <p className="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                {isTimerRunning ? 'Synchronizing Time' : 'Initialize Session'}
                            </p>
                        </div>
                    </div>
                </AnimatedCard>
            </motion.div>

            {/* Recent Entries */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
                <AnimatedCard className="h-full p-8 border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black flex items-center gap-3 text-slate-900 dark:text-white">
                                <History className="text-brand-500" size={24} /> Practice History
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Historical audit of billable initiatives</p>
                        </div>
                        <div className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl">
                            {entries.length} Records
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                        <AnimatePresence>
                            {entries.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Clock size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold uppercase text-[10px] tracking-widest">No session data available</p>
                                </motion.div>
                            ) : (
                                entries.map((entry, idx) => (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group flex justify-between items-center p-5 bg-white/50 dark:bg-slate-900/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 transition-transform group-hover:scale-110">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-slate-900 dark:text-white leading-tight">{entry.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Practice Audit</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="font-black text-xl text-slate-900 dark:text-white tabular-nums tracking-tight">
                                                {entry.duration}<span className="text-[10px] text-slate-400 ml-1">MIN</span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${entry.status === 'billed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                <CheckCircle size={10} />
                                                {entry.status || 'Pending'}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </AnimatedCard>
            </motion.div>
        </div>
    );
}
