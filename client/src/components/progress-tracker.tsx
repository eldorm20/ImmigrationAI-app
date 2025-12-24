import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { Check, AlertCircle, Calendar, Zap, Loader2 } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: Date;
  dueDate?: Date;
  progress: number;
}

interface ApplicationData {
  id: string;
  status: string;
  visaType: string;
  country: string;
  createdAt: string;
}

interface DocumentStats {
  total: number;
  required: number;
}

interface ConsultationStats {
  total: number;
  completed: number;
}

export default function ProgressTracker() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    fetchProgressData();
  }, [user]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      // Fetch user's applications, documents, and consultations
      const [applications, documents, consultations] = await Promise.all([
        apiRequest<ApplicationData[]>("/applications", { skipErrorToast: true }).catch(() => []),
        apiRequest<any[]>("/documents", { skipErrorToast: true }).catch(() => []),
        apiRequest<any[]>("/consultations", { skipErrorToast: true }).catch(() => []),
      ]);

      // Build milestones based on actual user data
      const dynamicMilestones: Milestone[] = [];

      // Milestone 1: Create Profile (always first)
      dynamicMilestones.push({
        id: "profile",
        title: "Create Your Profile",
        description: "Complete your account registration and basic information",
        completed: true,
        completedDate: user?.createdAt ? new Date(user.createdAt) : new Date(),
        progress: 100,
      });

      // Milestone 2: Upload Documents
      const docCount = documents.length;
      const requiredDocs = 4; // passport, photo, proof_of_address, financial
      const docProgress = Math.min(Math.round((docCount / requiredDocs) * 100), 100);
      dynamicMilestones.push({
        id: "documents",
        title: "Upload Documents",
        description: `Upload required documents for your application (${docCount}/${requiredDocs})`,
        completed: docProgress >= 100,
        completedDate: docProgress >= 100 ? new Date() : undefined,
        progress: docProgress,
      });

      // Milestone 3: Schedule Consultation
      const hasConsultation = consultations.length > 0;
      const completedConsultations = consultations.filter((c: any) => c.status === 'completed').length;
      dynamicMilestones.push({
        id: "consultation",
        title: "Schedule Consultation",
        description: hasConsultation
          ? `${completedConsultations} consultation(s) completed`
          : "Book a consultation with an immigration lawyer",
        completed: completedConsultations > 0,
        completedDate: completedConsultations > 0 ? new Date() : undefined,
        dueDate: !hasConsultation ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined,
        progress: hasConsultation ? (completedConsultations > 0 ? 100 : 50) : 0,
      });

      // Milestone 4: Prepare Application
      const hasApplication = applications.length > 0;
      const latestApp = applications[0];
      const appProgress = hasApplication
        ? getApplicationProgress(latestApp?.status)
        : 0;
      dynamicMilestones.push({
        id: "application",
        title: "Prepare Application",
        description: hasApplication
          ? `${latestApp?.visaType} for ${latestApp?.country} - ${formatStatus(latestApp?.status)}`
          : "Start your visa application",
        completed: latestApp?.status === 'approved',
        progress: appProgress,
        dueDate: !hasApplication ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      });

      // Milestone 5: Submit Application
      const isSubmitted = latestApp?.status && !['draft', 'pending_documents'].includes(latestApp.status);
      dynamicMilestones.push({
        id: "submit",
        title: "Submit Application",
        description: isSubmitted
          ? "Your application has been submitted for review"
          : "Submit your completed application",
        completed: isSubmitted,
        completedDate: isSubmitted && latestApp?.createdAt ? new Date(latestApp.createdAt) : undefined,
        progress: isSubmitted ? 100 : 0,
      });

      setMilestones(dynamicMilestones);
    } catch (error) {
      console.error("Failed to fetch progress data:", error);
      // Set default milestones on error
      setMilestones([
        { id: "1", title: "Create Profile", description: "Complete registration", completed: true, progress: 100 },
        { id: "2", title: "Upload Documents", description: "Upload required documents", completed: false, progress: 0 },
        { id: "3", title: "Schedule Consultation", description: "Book a lawyer consultation", completed: false, progress: 0 },
        { id: "4", title: "Prepare Application", description: "Complete your application", completed: false, progress: 0 },
        { id: "5", title: "Submit Application", description: "Submit for review", completed: false, progress: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getApplicationProgress = (status?: string): number => {
    switch (status) {
      case 'approved': return 100;
      case 'under_review': return 80;
      case 'pending': return 60;
      case 'pending_documents': return 40;
      case 'draft': return 20;
      default: return 0;
    }
  };

  const formatStatus = (status?: string): string => {
    if (!status) return 'Not started';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const overallProgress = milestones.length > 0
    ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
    : 0;

  const daysRemaining = milestones
    .filter((m) => !m.completed && m.dueDate)
    .map((m) => {
      const days = Math.ceil((m.dueDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days;
    })
    .filter((days) => days > 0);

  const nextDueDate = daysRemaining.length > 0 ? Math.min(...daysRemaining) : null;

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500 mb-2" />
          <p className="text-slate-500">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Your Immigration Journey</h2>
        <p className="text-slate-600 dark:text-slate-400">Track your progress through each stage</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Overall Progress</h3>
          <span className="text-2xl font-bold text-brand-600">{overallProgress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-4">
          <div
            className="bg-gradient-to-r from-brand-600 to-brand-700 h-4 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Timeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
            <p className="text-2xl font-bold">
              {milestones.filter((m) => m.completed).length}/{milestones.length}
            </p>
          </div>
          {nextDueDate && (
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Next Due</p>
              <p className="text-2xl font-bold">{nextDueDate} days</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
            <p className="text-2xl font-bold">{overallProgress >= 100 ? "Complete!" : "In Progress"}</p>
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Timeline Connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${milestone.completed
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                >
                  {milestone.completed ? <Check size={20} /> : index + 1}
                </div>
                {index < milestones.length - 1 && (
                  <div
                    className={`w-0.5 h-16 my-2 ${milestone.completed ? "bg-green-600" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold">{milestone.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {milestone.description}
                    </p>
                  </div>
                  {milestone.dueDate && !milestone.completed && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 ml-4 whitespace-nowrap">
                      <Calendar size={16} />
                      {milestone.dueDate.toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {!milestone.completed && milestone.progress > 0 && (
                  <div className="mt-3 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Progress</span>
                      <span className="text-xs font-bold">{milestone.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${milestone.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {milestone.completed && milestone.completedDate && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✓ Completed on {milestone.completedDate.toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Zap size={20} className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-2">💡 Pro Tips</h3>
            <ul className="space-y-1 text-sm text-blue-900 dark:text-blue-100">
              <li>• Start uploading documents early to avoid delays</li>
              <li>• Schedule consultations as soon as possible</li>
              <li>• Keep track of all deadlines and document expiration dates</li>
              <li>• Respond promptly to lawyer and government communications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
