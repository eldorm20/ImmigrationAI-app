import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout/Layout";

// Pages
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import Applications from "@/pages/applications";
import ApplicationView from "@/pages/application-view";
import Dashboard from "@/pages/dashboard";
import LawyerDashboard from "@/pages/lawyer-dashboard";
import Messages from "@/pages/messages";
import Pricing from "@/pages/pricing";
import Checkout from "@/pages/checkout";
import Features from "@/pages/features";
import Research from "@/pages/research";
import Blog from "@/pages/blog";
import Help from "@/pages/help";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import Notifications from "@/pages/notifications";
import PaymentHistory from "@/pages/payment-history";
import { AssessmentPage } from "@/pages/assessment";
import PartnerPage from "@/pages/partner";
import NotFound from "@/pages/not-found";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import VisaComparison from "@/pages/visa-comparison";
import CommunityForum from "@/pages/forum";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminSubscriptions from "@/pages/admin/subscriptions";
import AdminUsersPage from "@/pages/admin/users";
import Partner from "@/pages/partner";
import EmployerVerificationPage from "@/pages/employer-verification";

function ProtectedRoute({ component: Component, role }: { component: React.ComponentType, role?: 'lawyer' | 'applicant' | 'admin' }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  // If still loading, show loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin">Loading...</div></div>;
  }

  // If not authenticated, redirect to auth
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // If role doesn't match, redirect to appropriate dashboard
  if (role && user.role !== role) {
    const targetRoute = (user.role === 'lawyer' || user.role === 'admin') ? '/lawyer' : '/dashboard';
    setLocation(targetRoute);
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/assessment" component={AssessmentPage} />
        <Route path="/partner" component={PartnerPage} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/features" component={Features} />

        <Route path="/research">
          <Research />
        </Route>

        <Route path="/blog">
          <Blog />
        </Route>

        <Route path="/help">
          <Help />
        </Route>

        <Route path="/privacy">
          <Privacy />
        </Route>

        <Route path="/terms">
          <Terms />
        </Route>

        <Route path="/contact">
          <Contact />
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} role="applicant" />
        </Route>
        <Route path="/applications">
          <ProtectedRoute component={Applications} role="applicant" />
        </Route>

        <Route path="/applications/:id">
          <ProtectedRoute component={ApplicationView} role="applicant" />
        </Route>

        <Route path="/subscription">
          <ProtectedRoute component={Subscription} role="applicant" />
        </Route>

        <Route path="/settings">
          <ProtectedRoute component={Settings} role="applicant" />
        </Route>

        <Route path="/notifications">
          <ProtectedRoute component={Notifications} role="applicant" />
        </Route>

        <Route path="/payment-history">
          <ProtectedRoute component={PaymentHistory} role="applicant" />
        </Route>

        <Route path="/messages">
          <ProtectedRoute component={Messages} />
        </Route>

        <Route path="/analytics">
          <ProtectedRoute component={AnalyticsDashboard} role="applicant" />
        </Route>

        <Route path="/visa-comparison">
          <VisaComparison />
        </Route>

        <Route path="/employer-verification">
          <ProtectedRoute component={EmployerVerificationPage} role="applicant" />
        </Route>

        <Route path="/forum">
          <CommunityForum />
        </Route>

        <Route path="/admin">
          <ProtectedRoute component={AdminDashboard} role="admin" />
        </Route>
        <Route path="/admin/subscriptions">
          <ProtectedRoute component={AdminSubscriptions} role="admin" />
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute component={AdminUsersPage} role="admin" />
        </Route>

        <Route path="/lawyer">
          <ProtectedRoute component={LawyerDashboard} role="lawyer" />
        </Route>

        {/* Legacy/alternate path for compatibility */}
        <Route path="/lawyer-dashboard">
          <ProtectedRoute component={LawyerDashboard} role="lawyer" />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
