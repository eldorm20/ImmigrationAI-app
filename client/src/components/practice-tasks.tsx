import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import {
    Plus, Search, Filter, Clock, CheckCircle,
    AlertCircle, Calendar, MoreHorizontal, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "completed" | "archived";
    priority: "low" | "medium" | "high";
    dueDate?: string;
    applicationId?: string;
    createdAt: string;
}

export default function PracticeTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        priority: "medium" as const,
        status: "pending" as const,
        dueDate: ""
    });
    const { toast } = useToast();
    const { t } = useI18n();

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<Task[]>("/tasks");
            setTasks(data || []);
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to load tasks",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const taskData = {
                title: newTask.title,
                description: newTask.description || "",
                priority: newTask.priority,
                status: newTask.status,
                dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
                applicationId: null // Optional field
            };
            const created = await apiRequest<Task>("/tasks", {
                method: "POST",
                body: JSON.stringify(taskData)
            });
            setTasks([created, ...tasks]);
            setIsModalOpen(false);
            setNewTask({ title: "", description: "", priority: "medium", status: "pending", dueDate: "" });
            toast({ title: "Success", description: "Task created successfully" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
        }
    };

    const handleUpdateStatus = async (id: string, status: Task["status"]) => {
        try {
            const updated = await apiRequest<Task>(`/tasks/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
            setTasks(tasks.map(t => t.id === id ? updated : t));
        } catch (err) {
            toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await apiRequest(`/tasks/${id}`, { method: "DELETE" });
            setTasks(tasks.filter(t => t.id !== id));
            toast({ title: "Deleted", description: "Task removed" });
        } catch (err) {
            toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high": return "text-red-500 bg-red-50 dark:bg-red-900/20";
            case "medium": return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
            case "low": return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
            default: return "text-slate-500 bg-slate-50 dark:bg-slate-900/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed": return <CheckCircle className="text-green-500" size={16} />;
            case "in_progress": return <Clock className="text-blue-500" size={16} />;
            default: return <AlertCircle className="text-slate-400" size={16} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Practice Management</h2>
                    <p className="text-slate-500 text-sm">Organize and track your legal tasks</p>
                </div>
                <LiveButton
                    variant="primary"
                    icon={Plus}
                    onClick={() => setIsModalOpen(true)}
                >
                    New Task
                </LiveButton>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400">Loading tasks...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                            <p className="text-slate-500">No active tasks found. Start by creating one!</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <AnimatedCard key={task.id} className="group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                                        {task.priority} Priority
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <h4 className={`font-bold mb-2 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                    {task.title}
                                </h4>
                                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{task.description}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Calendar size={14} />
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                                    </div>

                                    <select
                                        value={task.status}
                                        onChange={(e) => handleUpdateStatus(task.id, e.target.value as any)}
                                        className="text-xs font-bold bg-transparent outline-none cursor-pointer text-brand-600 dark:text-brand-400"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">Working</option>
                                        <option value="completed">Done</option>
                                        <option value="archived">Archive</option>
                                    </select>
                                </div>
                            </AnimatedCard>
                        ))
                    )}
                </div>
            )}

            {/* New Task Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Create New Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Task Title</label>
                            <input
                                required
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="e.g., Review Visa Documents for Smith"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</label>
                            <textarea
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                rows={3}
                                placeholder="Details about the task..."
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Priority</label>
                                <select
                                    value={newTask.priority}
                                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Due Date</label>
                                <input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6">
                            <LiveButton
                                type="button"
                                variant="ghost"
                                className="flex-1"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </LiveButton>
                            <LiveButton
                                type="submit"
                                variant="primary"
                                className="flex-1 font-bold"
                            >
                                Create Task
                            </LiveButton>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
