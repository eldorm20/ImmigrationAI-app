import React from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EmployerVerificationPanel } from '@/components/employer-verification-panel';

export default function EmployerVerificationPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto py-12 px-4 max-w-6xl">
          <EmployerVerificationPanel />
        </div>
      </div>
    </ErrorBoundary>
  );
}
