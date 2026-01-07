import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import { useLocation } from "wouter";
import { AnimatedCard } from "@/components/ui/live-elements";

interface SubRecord {
  id: string;
  userId: string;
  provider: string;
  providerSubscriptionId: string;
  planId?: string | null;
  status: string;
  currentPeriodEnd?: string | null;
  metadata?: any;
  createdAt: string;
}

export default function AdminSubscriptionsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SubRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await apiRequest<any>("/subscription/admin/list");
        if (!mounted) return;
        setRows(resp.subscriptions || []);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch subscriptions");
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false };
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Subscriptions (Admin)</h1>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="space-y-4">
            {rows.map((r) => (
              <AnimatedCard key={r.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="text-sm text-slate-500">User</div>
                    <div className="font-mono text-sm text-slate-800 dark:text-white">{r.userId}</div>
                    <div className="text-xs text-slate-400">Created: {(() => {
                      const d = new Date(r.createdAt);
                      return isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
                    })()}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-slate-500">Provider</div>
                    <div className="font-medium">{r.provider}</div>
                    <div className="text-xs font-mono text-slate-600">{r.providerSubscriptionId}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-slate-500">Plan</div>
                    <div className="font-medium">{r.planId || "-"}</div>
                    <div className="text-sm text-slate-500">Status</div>
                    <div className="font-bold">{r.status}</div>
                  </div>

                  <div className="max-w-xs text-sm text-slate-600">
                    <div>Current Period End:</div>
                    <div className="font-mono">{(() => {
                      if (!r.currentPeriodEnd) return "-";
                      const d = new Date(r.currentPeriodEnd);
                      return isNaN(d.getTime()) ? "-" : d.toLocaleString();
                    })()}</div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-slate-500">Metadata</summary>
                      <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(r.metadata || {}, null, 2)}</pre>
                    </details>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
