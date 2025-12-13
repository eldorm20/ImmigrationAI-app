import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { useLocation } from "wouter";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [userId, setUserId] = useState("");
  const [tier, setTier] = useState<"starter"|"pro"|"premium"|"enterprise">("enterprise");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!user) {
    setLocation("/auth");
    return null;
  }
  if (user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!userId) return setResult("Please provide a user ID");
    try {
      setLoading(true);
      const res = await apiRequest<any>(`/admin/users/${userId}/adjust-tier`, {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      setResult(res?.message || "Success");
    } catch (err: any) {
      setResult(err?.message || "Failed to set tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin — Set User Subscription Tier</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 rounded-md p-6 border dark:border-slate-800">
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as any)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-md">
              {loading ? 'Saving...' : 'Set Tier'}
            </button>
            <button type="button" onClick={() => { setUserId(''); setTier('enterprise'); setResult(null); }} className="px-3 py-2 border rounded-md">Reset</button>
          </div>

          {result && <div className="mt-2 text-sm">{result}</div>}
        </form>
      </div>
    </div>
  );
}
