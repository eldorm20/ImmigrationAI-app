import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TrendingUp, Award, CheckCircle, Clock, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const data = await apiRequest<any>("/analytics/dashboard", { skipErrorToast: true });
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">No analytics data available</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<CheckCircle className="text-green-600" />}
          title="Profile Completion"
          value={`${stats.profile.completionPercentage}%`}
          subtitle="Documents uploaded"
        />
        <MetricCard
          icon={<Clock className="text-blue-600" />}
          title="Consultations"
          value={stats.consultations.scheduled}
          subtitle={`Avg. ${stats.consultations.averageDuration} min`}
        />
        <MetricCard
          icon={<Award className="text-purple-600" />}
          title="Engagement Score"
          value={stats.engagement.score}
          subtitle={stats.engagement.level}
        />
        <MetricCard
          icon={<TrendingUp className="text-orange-600" />}
          title="Applications"
          value={stats.applications.submitted}
          subtitle={`${stats.applications.started} started`}
        />
      </div>

      {/* Progress Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-4">Application Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-slate-600">{stats.profile.completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-brand-600 to-brand-700 h-3 rounded-full transition-all"
                style={{ width: `${stats.profile.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox title="Documents Uploaded" value={stats.profile.documentsUploaded} />
        <StatBox title="Estimated Approval" value={stats.applications.estimatedApproval ? new Date(stats.applications.estimatedApproval).toLocaleDateString() : "N/A"} />
        <StatBox title="Active Consultations" value={stats.consultations.scheduled} />
      </div>
    </div>
  );
}

function MetricCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        </div>
        <div className="ml-4">{icon}</div>
      </div>
    </div>
  );
}

function StatBox({ title, value }: any) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
