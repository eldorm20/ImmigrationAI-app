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

  useEffect(() => {
    if (!user && !isLoading) setLocation('/auth');
  }, [user, isLoading]);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const data = await apiRequest(`/applications/${id}`);
        setApp(data);
      } catch (err) {
        setApp(null);
      }
    };
    if (id) fetchApp();
  }, [id]);

  if (!app) return <div className="p-6">Loading...</div>;

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
