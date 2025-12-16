import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import {
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    CalendarDays,
    Bell,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
    MapPin,
    Video,
    FileText
} from "lucide-react";

interface Deadline {
    id: string;
    type: "roadmap" | "consultation" | "visa_expiry" | "document" | "custom";
    title: string;
    description?: string;
    dueDate: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "upcoming" | "due_today" | "overdue" | "completed";
    relatedTo?: string;
    metadata?: Record<string, unknown>;
}

interface DeadlineStats {
    total: number;
    overdue: number;
    dueToday: number;
    upcoming: number;
    completed: number;
    urgent: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DeadlineTrackerView: React.FC = () => {
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();

    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [stats, setStats] = useState<DeadlineStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [view, setView] = useState<"calendar" | "list">("calendar");

    useEffect(() => {
        fetchDeadlines();
    }, []);

    const fetchDeadlines = async () => {
        setLoading(true);
        try {
            const response = await apiRequest<{ deadlines: Deadline[]; stats: DeadlineStats }>("/deadlines");
            setDeadlines(response.deadlines);
            setStats(response.stats);
        } catch (err) {
            toast({
                title: "Failed to load deadlines",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const markComplete = async (id: string) => {
        try {
            await apiRequest(`/deadlines/${id}/complete`, { method: "PATCH" });
            toast({ title: "Deadline completed", className: "bg-green-50 text-green-900 border-green-200" });
            fetchDeadlines();
        } catch (err) {
            toast({ title: "Failed to complete", variant: "destructive" });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "consultation": return <Video className="w-4 h-4 text-purple-500" />;
            case "roadmap": return <MapPin className="w-4 h-4 text-blue-500" />;
            case "document": return <FileText className="w-4 h-4 text-orange-500" />;
            default: return <Calendar className="w-4 h-4 text-slate-500" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-500";
            case "high": return "bg-orange-500";
            case "medium": return "bg-yellow-500";
            default: return "bg-green-500";
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "overdue": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "due_today": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        }
    };

    // Calendar rendering
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: (Date | null)[] = [];
        for (let i = 0; i < startingDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        return days;
    };

    const getDeadlinesForDate = (date: Date) => {
        return deadlines.filter(d => {
            const dueDate = new Date(d.dueDate);
            return dueDate.toDateString() === date.toDateString();
        });
    };

    const navigateMonth = (direction: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        if (diffDays === -1) return "Yesterday";
        if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
        if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedCard className="p-4 text-center">
                    <div className="text-3xl font-black text-red-500">{stats?.overdue || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Overdue</div>
                </AnimatedCard>
                <AnimatedCard className="p-4 text-center">
                    <div className="text-3xl font-black text-orange-500">{stats?.dueToday || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Due Today</div>
                </AnimatedCard>
                <AnimatedCard className="p-4 text-center">
                    <div className="text-3xl font-black text-brand-500">{stats?.upcoming || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Upcoming</div>
                </AnimatedCard>
                <AnimatedCard className="p-4 text-center">
                    <div className="text-3xl font-black text-green-500">{stats?.completed || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Completed</div>
                </AnimatedCard>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setView("calendar")}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === "calendar" ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}
                >
                    <CalendarDays className="w-4 h-4 inline mr-2" />
                    Calendar
                </button>
                <button
                    onClick={() => setView("list")}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === "list" ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}
                >
                    <Clock className="w-4 h-4 inline mr-2" />
                    List
                </button>
            </div>

            <div className="grid md:grid-cols-5 gap-6">
                {/* Calendar or List View */}
                <div className="md:col-span-3">
                    <AnimatedCard className="p-6">
                        {view === "calendar" ? (
                            <>
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </h3>
                                    <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {DAYS.map(day => (
                                        <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {getDaysInMonth(currentMonth).map((day, idx) => {
                                        if (!day) return <div key={idx} className="aspect-square" />;

                                        const dayDeadlines = getDeadlinesForDate(day);
                                        const isToday = day.toDateString() === new Date().toDateString();
                                        const isSelected = selectedDate?.toDateString() === day.toDateString();
                                        const hasUrgent = dayDeadlines.some(d => d.priority === "urgent" || d.status === "overdue");

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDate(day)}
                                                className={`aspect-square p-1 rounded-xl text-sm font-medium transition-all relative ${isSelected ? "bg-brand-500 text-white" :
                                                        isToday ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300" :
                                                            "hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    }`}
                                            >
                                                {day.getDate()}
                                                {dayDeadlines.length > 0 && (
                                                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${hasUrgent ? "bg-red-500" : "bg-brand-500"}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            /* List View */
                            <div className="space-y-3">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">All Deadlines</h3>
                                {deadlines.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No deadlines found</p>
                                    </div>
                                ) : (
                                    deadlines.map(deadline => (
                                        <motion.div
                                            key={deadline.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        >
                                            <div className={`w-1 h-12 rounded-full ${getPriorityColor(deadline.priority)}`} />
                                            {getTypeIcon(deadline.type)}
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900 dark:text-white">{deadline.title}</div>
                                                {deadline.relatedTo && (
                                                    <div className="text-xs text-slate-500">{deadline.relatedTo}</div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{formatDate(deadline.dueDate)}</div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(deadline.status)}`}>
                                                    {deadline.status.replace("_", " ")}
                                                </span>
                                            </div>
                                            {deadline.status !== "completed" && deadline.type === "roadmap" && (
                                                <button
                                                    onClick={() => markComplete(deadline.id)}
                                                    className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-green-600"
                                                    title="Mark complete"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}
                    </AnimatedCard>
                </div>

                {/* Selected Date or Upcoming Section */}
                <div className="md:col-span-2">
                    <AnimatedCard className="p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <Bell className="text-brand-500" />
                            {selectedDate ? formatDate(selectedDate.toISOString()) : "Urgent Items"}
                        </h3>

                        {selectedDate ? (
                            <div className="space-y-3">
                                {getDeadlinesForDate(selectedDate).length === 0 ? (
                                    <p className="text-slate-400 text-sm">No deadlines on this date</p>
                                ) : (
                                    getDeadlinesForDate(selectedDate).map(d => (
                                        <div key={d.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getTypeIcon(d.type)}
                                                <span className="font-bold text-sm">{d.title}</span>
                                            </div>
                                            {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                                            <div className="flex justify-between items-center mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(d.status)}`}>
                                                    {d.priority}
                                                </span>
                                                {d.status !== "completed" && d.type === "roadmap" && (
                                                    <button
                                                        onClick={() => markComplete(d.id)}
                                                        className="text-xs text-green-600 hover:underline"
                                                    >
                                                        Mark done
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {deadlines.filter(d => d.priority === "urgent" || d.status === "overdue").slice(0, 5).map(d => (
                                    <div key={d.id} className={`p-3 rounded-xl ${d.status === "overdue" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-orange-50 dark:bg-orange-900/20"}`}>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className={`w-4 h-4 ${d.status === "overdue" ? "text-red-500" : "text-orange-500"}`} />
                                            <span className="font-bold text-sm">{d.title}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{formatDate(d.dueDate)}</div>
                                    </div>
                                ))}
                                {deadlines.filter(d => d.priority === "urgent" || d.status === "overdue").length === 0 && (
                                    <div className="text-center py-4 text-green-600">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm font-medium">No urgent deadlines!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </AnimatedCard>
                </div>
            </div>
        </motion.div>
    );
};

export default DeadlineTrackerView;
