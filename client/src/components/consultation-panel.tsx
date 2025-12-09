import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { Loader2, Calendar, Clock, User, MessageSquare, CheckCircle, X, Plus, ArrowLeft } from "lucide-react";
<<<<<<< HEAD
=======
import { useI18n } from "@/lib/i18n";
import { error as logError } from "@/lib/logger";
>>>>>>> 3358f8f (feat: Implement all 5 growth optimizations - pricing redesign, eligibility quiz, partner program, feature badges, mobile optimization)
import { motion, AnimatePresence } from "framer-motion";
import { RealtimeChat } from "./realtime-chat";

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
  const [showModal, setShowModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<string>("");
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [formData, setFormData] = useState({
    scheduledTime: "",
    duration: 60,
    notes: "",
  });

  // Fetch consultations and available lawyers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch consultations
        const consultsData = await apiRequest<Consultation[]>("/consultations");
        setConsultations(consultsData || []);

        // Fetch available lawyers
        const lawyersData = await apiRequest<Lawyer[]>("/consultations/available/lawyers");
        setLawyers(lawyersData || []);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logError("Failed to load consultations:", msg);
        toast({
          title: "Error",
          description: msg || "Failed to load consultations",
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
            <h3 className="font-semibold">{t.consultation.consultationChat}</h3>
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
          <a
            href={selectedConsultation.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <CheckCircle size={16} />
            {t.consultation.joinVideoCall}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t.consultation.title}</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} />
          Request Consultation
        </motion.button>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{t.consultation.requestConsultation}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t.consultation.selectLawyer}</label>
                  <select
                    value={selectedLawyer}
                    onChange={(e) => setSelectedLawyer(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                  >
                    <option value="">{`-- ${t.consultation.selectLawyer} --`}</option>
                    {lawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.firstName} {lawyer.lastName || ""} ({lawyer.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t.consultation.preferredDateTime}</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t.consultation.duration}</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t.consultation.notes}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 resize-none"
                    rows={3}
                    placeholder="Describe your consultation needs..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {t.consultation.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    {t.consultation.submitRequest}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consultations List */}
      <div className="grid gap-4 flex-1 overflow-y-auto">
        {consultations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
            <p>{t.consultation.noConsultations}</p>
          </div>
        ) : (
          consultations.map((consultation) => (
            <motion.div
              key={consultation.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConsultation(consultation)}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow cursor-pointer hover:border-brand-300 dark:hover:border-brand-600"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-brand-600" />
                    <span className="font-semibold">Lawyer Consultation</span>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(consultation.status)}`}>
                    {consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1).replace("_", " ")}
                  </span>
                </div>
                {consultation.status === "scheduled" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(consultation.id);
                    }}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg text-red-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{new Date(consultation.scheduledTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-slate-400" />
                  <span>{new Date(consultation.scheduledTime).toLocaleTimeString()}</span>
                </div>
              </div>

              {consultation.meetingLink && (
                <motion.a
                  href={consultation.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  whileHover={{ scale: 1.02 }}
                  className="inline-flex items-center gap-2 px-4 py-2 mb-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm w-full justify-center"
                >
                  <CheckCircle size={16} />
                  Join Video Call
                </motion.a>
              )}

              {consultation.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded italic">
                  "{consultation.notes}"
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-slate-400" />
                  <span>{new Date(consultation.scheduledTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-slate-400" />
                  <span>{new Date(consultation.scheduledTime).toLocaleTimeString()} ({consultation.duration} min)</span>
                </div>
              </div>

              {consultation.notes && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{consultation.notes}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-600 text-sm hover:underline">
                  <MessageSquare size={16} />
                  <span>{t.consultation.consultationChat}</span>
                </div>
                {consultation.meetingLink && (
                  <a
                    href={consultation.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                  >
                    <CheckCircle size={14} />
                    Join Meeting
                  </a>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
