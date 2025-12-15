import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";

export default function ApplicationView() {
  const [params] = useParams();
  const id = (params as any).id as string;
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [app, setApp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !isLoading) setLocation('/auth');
  }, [user, isLoading]);

  const fetchApp = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiRequest(`/applications/${id}`);
      setApp(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load application';
      setError(message);
      setApp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchApp();
  }, [id]);

  if (loading) return <div className="p-6 text-center"><div className="animate-spin text-slate-500">Loading...</div></div>;
  if (error) return <div className="p-6"><div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded border border-red-200 dark:border-red-800">Error: {error}<br/><button onClick={fetchApp} className="mt-2 text-blue-600 hover:underline">Retry</button></div></div>;
  if (!app) return <div className="p-6 text-center text-slate-500">Application not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Application #{app.id?.slice(0,8)}</h1>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mt-4">
          <p><strong>Visa Type:</strong> {app.visaType}</p>
          <p><strong>Country:</strong> {app.country}</p>
          <p><strong>Status:</strong> {app.status}</p>
          <p><strong>Fee:</strong> ${app.fee || 0}</p>
          <p><strong>Notes:</strong> {app.notes}</p>
          <p><strong>Created at:</strong> {new Date(app.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
