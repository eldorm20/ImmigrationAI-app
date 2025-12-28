import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LiveButton, AnimatedCard, GlassSelect } from '@/components/ui/live-elements';
import { Plus, CheckCircle, Circle, Clock, AlertCircle, Layout, ArrowRight, Trash2, SlidersHorizontal, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    assignedTo?: string;
}

export default function TaskManager() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const query = filter !== 'all' ? `?status=${filter}` : '';
            const data = await apiRequest<Task[]>(`/tasks${query}`);
            setTasks(data || []);
        } catch (err) {
            toast({ title: "Failed to load tasks", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [filter]);

    const addTask = async () => {
        const title = prompt("Specify new practice objective:");
        if (!title) return;

        try {
            await apiRequest('/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    status: 'todo',
                    priority: 'medium'
                })
            });
            fetchTasks();
            toast({ title: "Objective registered" });
        } catch (err) {
            toast({ title: "Failed to register task", variant: "destructive" });
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
            await apiRequest(`/tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            fetchTasks();
            toast({ title: "State transition failed", variant: "destructive" });
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm("Decommission this objective?")) return;
        try {
            setTasks(prev => prev.filter(t => t.id !== id));
            await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
            toast({ title: "Task decommissioned" });
        } catch (err) {
            fetchTasks();
            toast({ title: "Decommission failed", variant: "destructive" });
        }
    };

    const getPriorityProps = (p: string) => {
        switch (p) {
            case 'urgent': return "bg-rose-500 text-white shadow-rose-500/20";
            case 'high': return "bg-amber-500 text-white shadow-amber-500/20";
            case 'medium': return "bg-indigo-500 text-white shadow-indigo-500/20";
            default: return "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
        }
    };

    const STATUS_MAP = [
        { key: 'todo', label: 'Backlog', color: 'blue' },
        { key: 'in_progress', label: 'Active', color: 'indigo' },
        { key: 'review', label: 'Audit', color: 'amber' },
        { key: 'done', label: 'Closed', color: 'emerald' }
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
                        <Layout size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Practice Orchestrator</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Strategic project management and task routing</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <GlassSelect value={filter} onChange={e => setFilter(e.target.value)} className="min-w-[160px]">
                        <option value="all">Global Filter</option>
                        <option value="todo">Backlog Only</option>
                        <option value="in_progress">Active Only</option>
                        <option value="done">Completed Only</option>
                    </GlassSelect>
                    <LiveButton onClick={addTask} icon={Plus} size="lg" className="rounded-2xl">
                        New Objective
                    </LiveButton>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STATUS_MAP.map((statusObj, idx) => (
                    <div key={statusObj.key} className="flex flex-col gap-4">
                        <div className="flex justify-between items-center px-4 py-2 bg-white/20 dark:bg-slate-900/20 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                                <span className={`w-2 h-2 rounded-full bg-${statusObj.color}-500`} />
                                {statusObj.label}
                            </span>
                            <span className="bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 px-2 by-1 rounded-lg text-[10px] font-black min-w-[24px] text-center">
                                {tasks.filter(t => t.status === statusObj.key).length}
                            </span>
                        </div>

                        <div className="space-y-4 min-h-[500px] p-2 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-transparent hover:border-brand-500/10 transition-colors">
                            <AnimatePresence mode="popLayout">
                                {tasks.filter(t => t.status === statusObj.key).map((task, taskIdx) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                        transition={{ delay: taskIdx * 0.05 }}
                                    >
                                        <AnimatedCard className="p-5 bg-white dark:bg-slate-900 border-white/20 dark:border-white/5 shadow-xl hover:shadow-brand-500/10 group cursor-grab active:cursor-grabbing">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm ${getPriorityProps(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    {statusObj.key !== 'done' && (
                                                        <button
                                                            onClick={() => updateStatus(task.id, STATUS_MAP[Math.min(3, idx + 1)].key)}
                                                            className="p-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-600 rounded-lg transition-colors"
                                                            title="Advance State"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteTask(task.id)}
                                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg transition-colors"
                                                        title="Delete Objective"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 leading-snug group-hover:text-brand-600 transition-colors">{task.title}</p>

                                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    <Clock size={12} className="text-brand-500" />
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Scheduled'}
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                    {task.assignedTo?.[0] || 'AI'}
                                                </div>
                                            </div>
                                        </AnimatedCard>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {tasks.filter(t => t.status === statusObj.key).length === 0 && (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-40">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Vacuum</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
