import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Check, AlertCircle, Calendar, Zap } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: Date;
  dueDate?: Date;
  progress: number;
}

export default function ProgressTracker() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "1",
      title: "Upload Documents",
      description: "Upload all required documents for your application",
      completed: true,
      completedDate: new Date("2025-11-15"),
      progress: 100,
    },
    {
      id: "2",
      title: "Schedule Consultation",
      description: "Book a consultation with an immigration lawyer",
      completed: false,
      dueDate: new Date("2025-12-15"),
      progress: 0,
    },
    {
      id: "3",
      title: "Prepare Application",
      description: "Complete and review your visa application",
      completed: false,
      dueDate: new Date("2026-01-15"),
      progress: 45,
    },
    {
      id: "4",
      title: "Submit Application",
      description: "Submit your visa application to the government",
      completed: false,
      dueDate: new Date("2026-02-15"),
      progress: 0,
    },
  ]);

  const overallProgress = Math.round(
    milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length
  );

  const daysRemaining = milestones
    .filter((m) => !m.completed && m.dueDate)
    .map((m) => {
      const days = Math.ceil((m.dueDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days;
    })
    .filter((days) => days > 0);

  const nextDueDate = daysRemaining.length > 0 ? Math.min(...daysRemaining) : null;

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
            <p className="text-sm text-slate-600 dark:text-slate-400">Est. Completion</p>
            <p className="text-2xl font-bold">Feb 2026</p>
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    milestone.completed
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {milestone.completed ? <Check size={20} /> : index + 1}
                </div>
                {index < milestones.length - 1 && (
                  <div
                    className={`w-0.5 h-16 my-2 ${
                      milestone.completed ? "bg-green-600" : "bg-slate-200 dark:bg-slate-700"
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
