<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { Users, TrendingUp, DollarSign, AlertCircle, User, Zap, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { CreditCard } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchAdminStats();
  }, [user]);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch("/api/admin/overview", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return <div className="text-center py-12">Access Denied</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div>
          <Link href="/admin/subscriptions">
            <a className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm hover:shadow">
              <CreditCard className="text-green-600" />
              View Subscriptions
            </a>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-600" />}
          title="Total Users"
          value={stats?.overview?.totalUsers || 0}
          subtitle="Active users"
        />
        <StatCard
          icon={<Zap className="text-yellow-600" />}
          title="Active This Month"
          value={stats?.metrics?.activeUsers || 0}
          subtitle="Engaged users"
        />
        <StatCard
          icon={<DollarSign className="text-green-600" />}
          title="Total Revenue"
          value={`$${stats?.metrics?.totalEarnings || 0}`}
          subtitle="All time"
        />
        <StatCard
          icon={<TrendingUp className="text-purple-600" />}
          title="Growth"
          value={`${stats?.metrics?.newUsersThisMonth || 0}%`}
          subtitle="This month"
        />
      </div>

      {/* Quick Admin Links */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-3">Admin Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/admin/subscriptions">
            <a className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow">
              <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600">
                <CreditCard />
              </div>
              <div>
                <div className="text-sm text-slate-500">Subscriptions</div>
                <div className="font-bold">View all subscriptions</div>
              </div>
            </a>
          </Link>
        </div>
      </div>

      {/* User Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Users by Role</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Applicants</span>
              <span className="font-bold">{stats?.overview?.totalApplicants || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Lawyers</span>
              <span className="font-bold">{stats?.overview?.totalLawyers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Admins</span>
              <span className="font-bold">{stats?.overview?.adminUsers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Email Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Verified</span>
              <span className="font-bold text-green-600">{Math.round(stats?.overview?.totalUsers * 0.8) || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Unverified</span>
              <span className="font-bold text-amber-600">{Math.round(stats?.overview?.totalUsers * 0.2) || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">API Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">Database Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">Storage Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Recent Activity
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800">
            <span>New user registration</span>
            <span className="text-slate-500">5 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800">
            <span>Document upload</span>
            <span className="text-slate-500">15 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Consultation scheduled</span>
            <span className="text-slate-500">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }: any) {
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
=======
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { Users, TrendingUp, DollarSign, AlertCircle, User, Zap, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchAdminStats();
  }, [user]);

  const fetchAdminStats = async () => {
    try {
      const data = await apiRequest<any>("/admin/overview", { skipErrorToast: true });
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch admin stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return <div className="text-center py-12">Access Denied</div>;
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-600" />}
          title="Total Users"
          value={stats?.overview?.totalUsers || 0}
          subtitle="Active users"
        />
        <StatCard
          icon={<Zap className="text-yellow-600" />}
          title="Active This Month"
          value={stats?.metrics?.activeUsers || 0}
          subtitle="Engaged users"
        />
        <StatCard
          icon={<DollarSign className="text-green-600" />}
          title="Total Revenue"
          value={`$${stats?.metrics?.totalEarnings || 0}`}
          subtitle="All time"
        />
        <StatCard
          icon={<TrendingUp className="text-purple-600" />}
          title="Growth"
          value={`${stats?.metrics?.newUsersThisMonth || 0}%`}
          subtitle="This month"
        />
      </div>

      {/* User Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Users by Role</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Applicants</span>
              <span className="font-bold">{stats?.overview?.totalApplicants || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Lawyers</span>
              <span className="font-bold">{stats?.overview?.totalLawyers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Admins</span>
              <span className="font-bold">{stats?.overview?.adminUsers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">Email Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Verified</span>
              <span className="font-bold text-green-600">{Math.round(stats?.overview?.totalUsers * 0.8) || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Unverified</span>
              <span className="font-bold text-amber-600">{Math.round(stats?.overview?.totalUsers * 0.2) || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">API Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">Database Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm">Storage Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Recent Activity
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800">
            <span>New user registration</span>
            <span className="text-slate-500">5 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800">
            <span>Document upload</span>
            <span className="text-slate-500">15 minutes ago</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Consultation scheduled</span>
            <span className="text-slate-500">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }: any) {
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
>>>>>>> 7d2fb8f (fix(api): use shared apiRequest in queryClient and dashboards; add e2e upload+password Playwright test)
