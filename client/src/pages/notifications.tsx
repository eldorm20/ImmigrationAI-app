import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { Bell, LogOut, Trash2, Check, X, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const mockNotifications = [
  {
    id: 1,
    type: "consultation",
    title: "Consultation Scheduled",
    description: "Your consultation with Sarah Johnson has been scheduled for tomorrow at 2:00 PM",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    icon: "calendar",
  },
  {
    id: 2,
    type: "document",
    title: "Document Uploaded",
    description: "John Smith uploaded a new passport document for review",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    icon: "document",
  },
  {
    id: 3,
    type: "application",
    title: "Application Status Updated",
    description: "Your visa application status has been updated to 'Under Review'",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    icon: "check",
  },
  {
    id: 4,
    type: "payment",
    title: "Payment Received",
    description: "Payment of $500 has been received for consultation services",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    read: true,
    icon: "payment",
  },
  {
    id: 5,
    type: "system",
    title: "System Maintenance",
    description: "Scheduled maintenance will occur on Sunday from 2-4 AM",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    read: true,
    icon: "system",
  },
];

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  if (!user) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleDelete = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "consultation":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "document":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "application":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "payment":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const getTypeIcon = (icon: string) => {
    switch (icon) {
      case "calendar":
        return <Calendar size={20} />;
      case "document":
        return <Check size={20} />;
      case "check":
        return <Check size={20} />;
      case "payment":
        return <Bell size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-slate-900 dark:text-white">Notifications</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => { logout(); setLocation("/"); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              {t.dash.logout}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 lg:p-12">
        {/* Header with Filters */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Notifications</h1>
              <p className="text-slate-600 dark:text-slate-400">You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            </div>
            {unreadCount > 0 && (
              <LiveButton variant="ghost" onClick={handleMarkAllAsRead} className="text-brand-600">
                Mark all as read
              </LiveButton>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-3">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  filter === f.id
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <AnimatedCard className="text-center py-12">
            <Bell size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {filter === 'unread' ? "You're all caught up!" : "No notifications yet"}
            </p>
          </AnimatedCard>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AnimatedCard
                  className={`p-6 border-l-4 ${
                    !notification.read ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getTypeColor(notification.type)} flex-shrink-0`}>
                        {getTypeIcon(notification.icon)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">{notification.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{notification.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
