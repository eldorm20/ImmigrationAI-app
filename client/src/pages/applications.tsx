import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function ApplicationsPage() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useI18n();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !isLoading) {
      setLocation('/auth');
    }
  }, [user, isLoading]);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<{ applications: any[] }>(`/applications`);
        setApps(data.applications || []);
      } catch (err) {
        setApps([]);
      } finally { setLoading(false); }
    };
    fetchApps();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold">{t.applications?.title || 'My Applications'}</h1>
        <p className="text-sm text-slate-500 mb-4">View submitted assessments and track progress</p>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          {loading ? (
            <p>Loading...</p>
          ) : apps.length === 0 ? (
            <p>No applications yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 uppercase">
                  <th className="p-3">ID</th>
                  <th className="p-3">Visa Type</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Fee</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer" onClick={() => setLocation(`/applications/${a.id}`)}>
                    <td className="p-3 text-sm font-mono text-slate-600">{a.id?.slice(0,8)}</td>
                    <td className="p-3">{a.visaType}</td>
                    <td className="p-3">{a.country}</td>
                    <td className="p-3">{(a.status || 'new').replace('_',' ')}</td>
                    <td className="p-3">${a.fee || 0}</td>
                    <td className="p-3">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
