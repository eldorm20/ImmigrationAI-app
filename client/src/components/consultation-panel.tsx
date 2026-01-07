import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { Loader2, Calendar, Clock, User, MessageSquare, CheckCircle, X, Plus, ArrowLeft, Trash2 } from "lucide-react";
import { error as logError } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { RealtimeChat } from "./realtime-chat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import VideoCall from "./video-call";
import { LiveButton } from "@/components/ui/live-elements";

interface Consultation {
  id: string;
  lawyerId: string;
  userId: string;
  applicationId?: string;
  scheduledTime: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

interface Lawyer {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

export default function ConsultationPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<string>("");
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [formData, setFormData] = useState({
    scheduledTime: "",
    duration: 60,
    notes: "",
  });
  const [activeCall, setActiveCall] = useState<{ roomName: string; displayName: string } | null>(null);

  const handleJoinCall = (consultation: Consultation) => {
    if (!consultation.meetingLink) return;

    // Extract room name from Jitsi link
    const match = consultation.meetingLink.match(/meet\.jit\.si\/([^?&]+)/);
    if (match) {
      setActiveCall({
        roomName: decodeURIComponent(match[1]),
        displayName: `${user?.firstName} ${user?.lastName || ''}`,
      });
    } else {
      window.open(consultation.meetingLink, '_blank');
    }
  };

  // Fetch consultations and available lawyers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch consultations
        try {
          const consultsData = await apiRequest<Consultation[]>("/consultations");
          setConsultations(Array.isArray(consultsData) ? consultsData : []);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logError("Failed to load consultations:", msg);
          setConsultations([]);
          setFetchError(msg);
        }

        // Fetch available lawyers
        try {
          const lawyersData = await apiRequest<Lawyer[]>("/consultations/available/lawyers");
          setLawyers(Array.isArray(lawyersData) ? lawyersData : []);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logError("Failed to load lawyers:", msg);
          setLawyers([]);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logError("Failed to load consultation data:", msg);
        toast({
          title: t.error?.title || "Error",
          description: msg || t.error?.message || "Failed to load consultations",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawyer || !formData.scheduledTime) {
      toast({
        title: t.common.error,
        description: t.consultation.missingInfo,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest<Consultation>("/consultations", {
        method: "POST",
        body: JSON.stringify({
          lawyerId: selectedLawyer,
          scheduledTime: new Date(formData.scheduledTime).toISOString(),
          duration: formData.duration,
          notes: formData.notes,
        }),
      });

      setConsultations([...consultations, response]);
      setShowModal(false);
      setFormData({ scheduledTime: "", duration: 60, notes: "" });
      setSelectedLawyer("");

      toast({
        title: t.common.success,
        description: t.consultation.requestSubmitted,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error,
        description: msg || t.consultation.submitError,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (consultationId: string) => {
    try {
      await apiRequest(`/consultations/${consultationId}`, {
        method: "DELETE",
      });

      setConsultations(consultations.filter(c => c.id !== consultationId));
      toast({
        title: t.common.success,
        description: t.consultation.cancelled,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error,
        description: msg || t.consultation.cancelError,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "no_show":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // Show chat view when a consultation is selected
  if (selectedConsultation) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedConsultation(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="font-semibold">{t.consultation?.consultationChat}</h3>
            <p className="text-xs text-slate-500">
              {new Date(selectedConsultation.scheduledTime).toLocaleDateString()} at{" "}
              {new Date(selectedConsultation.scheduledTime).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <RealtimeChat recipientId={selectedConsultation.lawyerId} />
        </div>

        {selectedConsultation.meetingLink && (
          <button
            onClick={() => handleJoinCall(selectedConsultation)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <CheckCircle size={16} />
            {t.consultation?.joinVideoCall}
          </button>
        )}
      </div>
    );
  }

  const handleClearHistory = async () => {
    if (!confirm(t.consultation?.confirmClearHistory || "Are you sure you want to clear your consultation history? This will remove all completed and cancelled consultations.")) return;
    try {
      await apiRequest("/consultations/history", { method: "DELETE" });
      setConsultations(prev => prev.filter(c => c.status !== "completed" && c.status !== "cancelled"));
      toast({
        title: t.common.success || "Success",
        description: t.consultation?.historyCleared || "Consultation history cleared",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: t.common.error || "Error",
        description: msg || "Failed to clear history",
        variant: "destructive",
      });
    }
  };

  const [view, setView] = useState<"list" | "schedule" | "ask">("list");

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawyer || !formData.notes) {
      toast({
        title: t.common.error,
        description: "Please select a lawyer and enter your question",
        variant: "destructive",
      });
      return;
    }

    try {
      const resp = await apiRequest<Consultation>("/consultations/ask", {
        method: "POST",
        body: JSON.stringify({
          lawyerId: selectedLawyer,
          question: formData.notes,
        }),
      });

      setConsultations([...consultations, resp]);
      setView("list");
      setFormData({ scheduledTime: "", duration: 60, notes: "" });
      setSelectedLawyer("");

      toast({
        title: t.common.success,
        description: "Your question has been sent to the lawyer. You'll be notified of their response.",
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || "Failed to send question",
        variant: "destructive",
      });
    }
  };

  const renderLawyerSelection = () => (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <User size={16} className="text-brand-500" />
        {t.consultation.selectLawyer}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lawyers.length > 0 ? (
          lawyers.map((lawyer) => (
            <div
              key={lawyer.id}
              onClick={() => setSelectedLawyer(lawyer.id)}
              className={`
                cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group
                ${selectedLawyer === lawyer.id
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 bg-white dark:bg-slate-800"
                }
              `}
            >
              {selectedLawyer === lawyer.id && (
                <div className="absolute top-2 right-2 text-brand-600 dark:text-brand-400">
                  <CheckCircle size={20} fill="currentColor" className="text-brand-100 dark:text-brand-900" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                  {lawyer.firstName?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {lawyer.firstName} {lawyer.lastName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{lawyer.email}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No lawyers currently available</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            {t.consultation.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Connect with immigration experts</p>
        </div>

        <div className="flex items-center gap-3">
          {fetchError && (
            <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800">{t.error?.message || 'Failed to load consultations'}</div>
          )}
          <LiveButton
            variant="ghost"
            onClick={handleClearHistory}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} className="mr-2" />
            {t.consultation?.clearHistory || "Clear History"}
          </LiveButton>
          <LiveButton
            variant="outline"
            onClick={() => { setView("ask"); setShowModal(true); }}
            className="flex items-center gap-2"
          >
            <MessageSquare size={16} />
            {t.consultation.askQuestion}
          </LiveButton>
          <LiveButton
            variant="primary"
            onClick={() => { setView("schedule"); setShowModal(true); }}
            className="flex items-center gap-2"
          >
            <Calendar size={16} />
            {t.consultation.scheduleCall}
          </LiveButton>
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {view === "ask" ? t.consultation.askTitle : t.consultation.requestConsultation}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {view === "ask" ? t.consultation.askDesc : "Schedule a video call with an immigration lawyer"}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {view === "ask" ? (
                  <form onSubmit={handleAskSubmit} className="space-y-6">
                    {renderLawyerSelection()}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare size={16} className="text-brand-500" />
                        {t.consultation.yourQuestion}
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                        rows={6}
                        required
                        placeholder="Detail your question or legal concern here..."
                      />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <LiveButton type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
                        {t.consultation.cancel}
                      </LiveButton>
                      <LiveButton type="submit" variant="primary" className="flex-1 shadow-lg shadow-brand-500/20" disabled={!selectedLawyer || !formData.notes}>
                        {t.consultation.submitQuestion}
                      </LiveButton>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {renderLawyerSelection()}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar size={16} className="text-brand-500" />
                          {t.consultation.preferredDateTime}
                        </label>
                        <div className="relative">
                          <input
                            type="datetime-local"
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                            className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                            required
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Clock size={16} className="text-brand-500" />
                          {t.consultation.duration} <span className="text-slate-400 font-normal">(minutes)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="15"
                            max="480"
                            step="15"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                            className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageSquare size={16} className="text-brand-500" />
                        {t.consultation.notes}
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
                        rows={3}
                        placeholder={t.consultation?.notesPlaceholder || "Briefly describe your case or questions..."}
                      />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                      <LiveButton
                        type="button"
                        variant="ghost"
                        onClick={() => setShowModal(false)}
                        className="flex-1"
                      >
                        {t.consultation.cancel}
                      </LiveButton>
                      <LiveButton
                        type="submit"
                        variant="primary"
                        className="flex-1 shadow-lg shadow-brand-500/20"
                        disabled={!selectedLawyer || !formData.scheduledTime}
                      >
                        {t.consultation.submitRequest}
                      </LiveButton>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consultations List */}
      <div className="grid gap-4 flex-1 overflow-y-auto p-1">
        {consultations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4 text-brand-600 dark:text-brand-400">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.consultation.noConsultations}</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Connect with experienced immigration lawyers to discuss your case and get professional advice.
            </p>
            <LiveButton
              variant="outline"
              onClick={() => setShowModal(true)}
              icon={Plus}
            >
              Request Consultation
            </LiveButton>
          </div>
        ) : (
          consultations.map((consultation) => (
            <motion.div
              key={consultation.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConsultation(consultation)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <User size={16} />
                    </div>
                    <span className="font-bold text-lg text-slate-900 dark:text-white">
                      {t.consultation?.title || 'Consultation'}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(consultation.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {(() => {
                      const st = String(consultation?.status || "");
                      if (!st) return "";
                      const key = st === 'no_show' ? 'noShow' : st;
                      return t.consultation?.[key] || st.charAt(0).toUpperCase() + st.slice(1).replace("_", " ");
                    })()}
                  </span>
                </div>
                {consultation.status === "scheduled" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(consultation.id);
                    }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors z-10"
                    title="Cancel Consultation"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-brand-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(consultation.scheduledTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-brand-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(consultation.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {consultation.meetingLink && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinCall(consultation);
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="inline-flex items-center gap-2 px-4 py-2 mb-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm w-full justify-center"
                >
                  <CheckCircle size={16} />
                  {t.consultation?.joinVideoCall}
                </motion.button>
              )}

              {consultation.notes && (
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700 line-clamp-2">
                  {consultation.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-sm font-medium group-hover:underline">
                  <MessageSquare size={16} />
                  <span>{t.consultation?.consultationChat}</span>
                </div>
                {consultation.meetingLink && (
                  <a
                    href={consultation.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-bold transition-colors"
                  >
                    <CheckCircle size={14} />
                    {t.consultation?.joinVideoCall}
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>


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
    </div >
  );
}
