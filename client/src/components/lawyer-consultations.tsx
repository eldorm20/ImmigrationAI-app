import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import {
  Loader2,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  LinkIcon,
  Mail,
  Menu,
  Video,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VideoCall from "./video-call";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

import { error as logError } from "@/lib/logger";

interface Consultation {
  id: string;
  lawyerId: string;
  userId: string;
  applicationId?: string;
  scheduledTime: string;
  duration: number;
  status: "pending" | "scheduled" | "completed" | "cancelled" | "no_show";
  notes?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
}

export default function LawyerConsultations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeCall, setActiveCall] = useState<{ roomName: string; displayName: string } | null>(null);

  // Fetch lawyer's consultations
  useEffect(() => {
    // ... same as before
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<Consultation[]>("/consultations");
        setConsultations(data || []);

        // ... user fetching code
      } catch (error: unknown) {
        // ... error handling
      } finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, [t.consultation.submitError, t.common.error]); // Added deps for safety


  const handleAccept = async (consultationId: string) => {
    try {
      const updated = await apiRequest<Consultation>(
        `/consultations/${consultationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "scheduled",
            meetingLink: meetingLink || undefined,
            notes: notes || undefined,
          }),
        }
      );

      setConsultations((prev) =>
        prev.map((c) => (c.id === consultationId ? updated : c))
      );
      setEditingId(null);
      setMeetingLink("");
      setNotes("");

      toast({
        title: t.common.success || "Success",
        description: t.consultation.requestSubmitted || "Consultation accepted",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error || "Error",
        description: msg || t.consultation.submitError || "Failed to accept consultation",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (consultationId: string) => {
    try {
      const updated = await apiRequest<Consultation>(
        `/consultations/${consultationId}`,
        {
          method: "DELETE",
        }
      );

      setConsultations((prev) => prev.filter((c) => c.id !== consultationId));

      toast({
        title: t.common.success || "Success",
        description: t.consultation.cancelled || "Consultation cancelled",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error || "Error",
        description: msg || t.consultation.cancelError || "Failed to reject consultation",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async (consultationId: string) => {
    try {
      const updated = await apiRequest<Consultation>(
        `/consultations/${consultationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      setConsultations((prev) =>
        prev.map((c) => (c.id === consultationId ? updated : c))
      );

      toast({
        title: t.common.success || "Success",
        description: t.consultation.requestSubmitted || "Consultation marked as completed",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error || "Error",
        description: msg || "Failed to complete consultation",
        variant: "destructive",
      });
    }
  };

  const handleStartCall = (consultation: Consultation) => {
    if (!consultation.meetingLink) return;

    // Extract room name from Jitsi link
    const match = consultation.meetingLink.match(/meet\.jit\.si\/([^?&]+)/);
    if (match) {
      setActiveCall({
        roomName: decodeURIComponent(match[1]),
        displayName: `${user?.firstName || 'Lawyer'} ${user?.lastName || ''}`,
      });
    } else {
      // Fallback for other links - open in new tab
      window.open(consultation.meetingLink, '_blank');
    }
  };

  const filteredConsultations = consultations.filter((c) =>
    filterStatus === "all" ? true : c.status === filterStatus
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      scheduled:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      completed:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    };

    const icons: Record<string, React.ElementType> = {
      pending: Clock,
      scheduled: Calendar,
      completed: CheckCircle,
      cancelled: XCircle,
      no_show: AlertCircle,
    };

    const Icon = icons[status] || AlertCircle;

    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${styles[status] || styles.scheduled}`}>
        <Icon size={14} />
        {(() => {
          const st = String(status || "");
          if (st === 'pending') return "Requested";
          if (!st) return "";
          return st.charAt(0).toUpperCase() + st.slice(1).replace("_", " ");
        })()}
      </div>
    );
  };

  // ...

  return (
    <div className="space-y-6">
      {/* ... Header ... */}

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {['pending', 'scheduled', 'completed', 'cancelled', 'all'].map((status) => (
          <motion.button
            key={status}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filterStatus === status
              ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
          >
            {status === 'pending' ? 'Requests' : (t.lawyerDashboard?.[status] || t.lawyer?.[status] || (() => {
              const st = String(status || "");
              if (!st) return status;
              return st.charAt(0).toUpperCase() + st.slice(1).replace("_", " ");
            })())}
          </motion.button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Menu size={16} /> List
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Calendar size={16} /> Calendar
        </button>
      </div>

      {/* Consultations List / Calendar */}
      {
        viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + 1 + i); // Start from Monday
              const dateStr = date.toISOString().split('T')[0];
              const dayConsultations = filteredConsultations.filter(c => c.scheduledTime.startsWith(dateStr));

              return (
                <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 min-h-[300px] border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex justify-between items-center">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    <span className="text-xs font-normal text-slate-500">{date.getDate()}</span>
                  </h4>
                  <div className="space-y-2">
                    {dayConsultations.map(c => (
                      <div key={c.id} className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-xs shadow-sm">
                        <div className="font-bold text-brand-600 dark:text-brand-400 mb-1">
                          {new Date(c.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="truncate font-medium text-slate-900 dark:text-slate-200">
                          {userDetails[c.userId]?.firstName || 'Client'} {userDetails[c.userId]?.lastName}
                        </div>
                        <div className={`mt-2 text-[10px] uppercase font-bold tracking-wider ${c.status === 'scheduled' || c.status === 'completed' ? 'text-green-500' : 'text-slate-400'}`}>
                          {c.status}
                        </div>
                      </div>
                    ))}
                    {dayConsultations.length === 0 && (
                      <div className="text-center text-slate-400 text-xs py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        No slots
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredConsultations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">{t.consultation.noConsultations || "No consultations found"}</p>
                <p className="text-sm">
                  {filterStatus === "scheduled"
                    ? t.consultation.requestSubmitted || "You'll see incoming consultation requests here"
                    : `${t.consultation.title || "No"} ${filterStatus}`}
                </p>
              </div>
            ) : (
              filteredConsultations.map((consultation) => {
                const applicant = userDetails[consultation.userId];
                const isEditing = editingId === consultation.id;

                return (
                  <motion.div
                    key={consultation.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <User size={20} className="text-brand-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {applicant?.firstName} {applicant?.lastName}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {applicant?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>{getStatusBadge(consultation.status)}</div>
                    </div>

                    {/* Contact Info */}
                    {applicant?.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                        <Mail size={16} />
                        <span>{applicant.phone}</span>
                      </div>
                    )}

                    {/* Timing */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-brand-600" />
                        <div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Requested Date
                          </p>
                          <p className="text-sm font-semibold">
                            {new Date(consultation.scheduledTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-brand-600" />
                        <div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Time & Duration
                          </p>
                          <p className="text-sm font-semibold">
                            {new Date(consultation.scheduledTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ({consultation.duration} min)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {consultation.notes && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                          Applicant Notes
                        </p>
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          {consultation.notes}
                        </p>
                      </div>
                    )}

                    {/* Meeting Link Display */}
                    {consultation.meetingLink && consultation.status === "scheduled" && (
                      <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                          Meeting Link
                        </p>
                        <a
                          href={consultation.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:underline"
                        >
                          <LinkIcon size={16} />
                          {consultation.meetingLink}
                        </a>
                      </div>
                    )}

                    {/* Edit Meeting Link Form */}
                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg"
                        >
                          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                            Confirm and Set Meeting Link
                          </p>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                Meeting Link (Zoom, Google Meet, etc.)
                              </label>

                              <input
                                type="url"
                                placeholder="https://meet.google.com/..."
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                className="w-full px-3 py-2 border border-yellow-200 dark:border-yellow-700 rounded-lg dark:bg-slate-800 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                Internal Notes (optional)
                              </label>
                              <textarea
                                placeholder="Any additional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-yellow-200 dark:border-yellow-700 rounded-lg dark:bg-slate-800 text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {consultation.meetingLink && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleStartCall(consultation)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                        >
                          <Video size={16} />
                          {consultation.meetingLink.includes('jit.si') ? "Start Call" : "Open Meeting"}
                        </motion.button>
                      )}

                      {consultation.status === "pending" && (
                        <>
                          {!isEditing ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setEditingId(consultation.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                <CheckCircle size={16} />
                                {t.consultation.acceptAndConfirm || "Accept & Confirm"}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReject(consultation.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                              >
                                <XCircle size={16} />
                                {t.consultation.reject || "Reject"}
                              </motion.button>
                            </>
                          ) : (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAccept(consultation.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                <CheckCircle size={16} />
                                {t.consultation.confirm || "Confirm"}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setEditingId(null);
                                  setMeetingLink("");
                                  setNotes("");
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                              >
                                {t.consultation.cancel || "Cancel"}
                              </motion.button>
                            </>
                          )}
                        </>
                      )}

                      {consultation.status === "completed" && (
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          {t.consultation.completedLabel || "✓ Completed"}
                        </div>
                      )}

                      {consultation.status === "cancelled" && (
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">
                          {t.consultation.cancelledLabel || "✗ Cancelled"}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      {/* Video Call Modal */}
      <Dialog open={!!activeCall} onOpenChange={(open) => !open && setActiveCall(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-900 border-slate-800">
          {activeCall && (
            <VideoCall
              roomName={activeCall.roomName}
              displayName={activeCall.displayName}
              email={user?.email}
              onLeave={() => setActiveCall(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
