import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/api";

export default function AdminAiUsagePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [adjusting, setAdjusting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      setLocation("/");
      return;
    }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/admin/ai-usage?month=${month}`);
      setUsers(data.users || []);
    } catch (e) {
      console.error("Failed to fetch ai usage", e);
    } finally {
      setLoading(false);
    }
  }

  async function setTier(userId: string, tier: string) {
    setAdjusting(userId);
    try {
      const res = await apiRequest<{ success?: boolean }>(`/admin/users/${userId}/adjust-tier`, {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      if (res?.success) {
        await fetchData();
      }
    } catch (e) {
      console.error("Failed to set tier", e);
    } finally {
      setAdjusting(null);
    }
  }

  if (!user || user.role !== "admin") return <div className="py-12 text-center">Access denied</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Usage & Quotas</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm">Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-2 py-1" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={fetchData}>Refresh</button>
      </div>

      <div className="bg-white rounded p-4 border">
        <h3 className="font-semibold mb-3">Cost Estimates (approx)</h3>
        <div className="text-sm space-y-2">
          <div>Small HF model (e.g., small-llama): ~ $0.02 per 1k tokens</div>
          <div>Medium HF model (e.g., Llama-2-13B): ~ $0.12 per 1k tokens</div>
          <div>Large HF model / OpenAI GPT-4 style: ~ $0.50+ per 1k tokens</div>
          <div className="text-xs text-slate-500">Estimate depends on provider and instance. Use smaller models for low-cost workflows.</div>
        </div>
      </div>

      <div className="bg-white rounded border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Tier</th>
              <th className="p-2 text-left">AI Used</th>
              <th className="p-2 text-left">Limit</th>
              <th className="p-2 text-left">Remaining</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4">Loading...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.firstName} {u.lastName}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.tier}</td>
                  <td className="p-2">{u.usage?.aiMonthlyRequests || 0}</td>
                  <td className="p-2">{u.remaining?.limit ?? '—'}</td>
                  <td className="p-2">{u.remaining?.remaining ?? '—'}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <select defaultValue={u.tier} onChange={(e) => setTier(u.id, e.target.value)} className="border rounded px-2 py-1">
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                      <button disabled={adjusting === u.id} onClick={() => fetchData()} className="px-2 py-1 bg-gray-200 rounded">Refresh</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
