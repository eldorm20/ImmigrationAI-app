import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LiveButton } from '@/components/ui/live-elements';
import { Plus, CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
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
            setTasks(data);
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
        const title = prompt("Enter task title:");
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
            toast({ title: "Task added" });
        } catch (err) {
            toast({ title: "Failed to add task", variant: "destructive" });
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));

            await apiRequest(`/tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            fetchTasks(); // Revert on error
            toast({ title: "Failed to update task", variant: "destructive" });
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm("Delete this task?")) return;
        try {
            setTasks(prev => prev.filter(t => t.id !== id));
            await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
            toast({ title: "Task deleted" });
        } catch (err) {
            fetchTasks();
            toast({ title: "Failed to delete task", variant: "destructive" });
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            case 'medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Tasks</h2>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                    >
                        <option value="all">All Tasks</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <LiveButton onClick={addTask} icon={Plus}>Add Task</LiveButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['todo', 'in_progress', 'review', 'done'].map(status => (
                    <div key={status} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[400px]">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-4 flex justify-between">
                            {status.replace('_', ' ')}
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 rounded-full text-xs items-center flex">
                                {tasks.filter(t => t.status === status).length}
                            </span>
                        </h3>

                        <div className="space-y-3">
                            <AnimatePresence>
                                {tasks.filter(t => t.status === status).map(task => (
                                    <motion.div
                                        layoutId={task.id}
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 cursor-move group relative"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {status !== 'todo' && (
                                                    <button onClick={() => updateStatus(task.id, 'todo')} className="p-1 hover:bg-slate-100 rounded" title="Move to Todo">
                                                        ←
                                                    </button>
                                                )}
                                                {status !== 'done' && (
                                                    <button onClick={() => updateStatus(task.id, 'done')} className="p-1 hover:bg-green-100 text-green-600 rounded" title="Done">
                                                        ✓
                                                    </button>
                                                )}
                                                <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-red-100 text-red-600 rounded" title="Delete">
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{task.title}</p>

                                        {task.dueDate && (
                                            <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                                                <Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {tasks.filter(t => t.status === status).length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    <p className="text-xs text-slate-400">No tasks</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
