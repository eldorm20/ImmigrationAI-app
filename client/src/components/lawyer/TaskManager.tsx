import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LiveButton, AnimatedCard, GlassSelect, GlassInput } from '@/components/ui/live-elements';
import { Plus, CheckCircle, Circle, Clock, AlertCircle, Layout, ArrowRight, Trash2, SlidersHorizontal, MoreVertical, X } from 'lucide-react';
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

    // Create Task Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: '',
        priority: 'medium',
        status: 'todo',
        dueDate: ''
    });

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

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiRequest('/tasks', {
                method: 'POST',
                body: JSON.stringify(newTask)
            });
            fetchTasks();
            toast({ title: "Objective registered", description: "Task successfully added to the board." });
            setIsCreateOpen(false);
            setNewTask({ title: '', priority: 'medium', status: 'todo', dueDate: '' });
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
                    <LiveButton onClick={() => setIsCreateOpen(true)} icon={Plus} size="lg" className="rounded-2xl">
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

            {/* Create Task Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
                            onClick={() => setIsCreateOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-white/20 dark:border-white/5"
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-indigo-600">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-black text-2xl text-white">New Objective</h3>
                                        <p className="text-brand-100 text-sm font-medium">Define a strategic task for the practice</p>
                                    </div>
                                    <button onClick={() => setIsCreateOpen(false)} className="text-white/70 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleCreateTask} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Task Title</label>
                                    <GlassInput required className="w-full font-bold"
                                        placeholder="e.g. Review Visa Application"
                                        value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Priority Level</label>
                                        <GlassSelect className="w-full"
                                            value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}>
                                            <option value="low">Low Priority</option>
                                            <option value="medium">Medium Priority</option>
                                            <option value="high">High Priority</option>
                                            <option value="urgent">Urgent</option>
                                        </GlassSelect>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                                        <GlassInput type="date" className="w-full"
                                            value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <LiveButton variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Discard</LiveButton>
                                    <LiveButton icon={CheckCircle} className="px-8" type="submit">
                                        Deploy Objective
                                    </LiveButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
