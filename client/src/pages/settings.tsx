<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Settings, LogOut, Bell, Lock, User, Globe, Moon, Eye, Upload, Save, X, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'preferences'>('account');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: false,
    showEmail: false,
    allowMessages: true,
    dataSharing: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    documentReminders: true,
    consultationReminders: true,
    newsAndUpdates: false,
  });

  const [preferences, setPreferences] = useState({
    language: language || 'en',
    theme: 'light',
    fontSize: 'normal',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  if (!user) return null;

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ] as const;

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          avatar: formData.avatar,
        }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully",
        className: "bg-green-50 text-green-900 border-green-200",
      });
      setEditing(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        className: "bg-red-50 text-red-900 border-red-200",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) throw new Error('Failed to change password');

      toast({
        title: "Success",
        description: "Your password has been updated",
        className: "bg-green-50 text-green-900 border-green-200",
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to change password",
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings),
      });

      if (!res.ok) throw new Error('Failed to update privacy settings');

      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update settings",
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings),
      });

      if (!res.ok) throw new Error('Failed to update notification settings');

      toast({
        title: "Notification Settings Updated",
        description: "Your preferences have been saved",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update settings",
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      if (preferences.language !== language) {
        setLanguage(preferences.language);
      }

      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: preferences.language,
          theme: preferences.theme,
          fontSize: preferences.fontSize,
        }),
      });

      if (!res.ok) throw new Error('Failed to update preferences');

      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved",
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update preferences",
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Settings size={20} />
            </div>
            <span className="text-slate-900 dark:text-white">Settings</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => { logout(); setLocation("/"); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              {t.dash.logout}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                  activeSection === section.id
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </motion.button>
            ))}
          </motion.aside>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {activeSection === 'account' && (
              <>
                <AnimatedCard>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.settings.accountSettings}</h2>
                    <LiveButton
                      variant={editing ? "ghost" : "primary"}
                      onClick={() => setEditing(!editing)}
                      icon={editing ? X : User}
                      disabled={loading}
                    >
                      {editing ? t.settings.cancel : t.settings.editProfile}
                    </LiveButton>
                  </div>

                  <div className="space-y-6">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.firstName}</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          disabled={!editing}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.lastName}</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          disabled={!editing}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.emailAddress}</label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white opacity-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t.settings.emailCannotChange}</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.phoneNumber}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!editing}
                        placeholder={t.settings.phonePlaceholder}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    {editing && (
                      <LiveButton 
                        variant="primary" 
                        onClick={handleSaveProfile} 
                        icon={loading ? Loader : Save}
                        disabled={loading}
                      >
                        {loading ? t.settings.saving : t.settings.saveChanges}
                      </LiveButton>
                    )}
                  </div>
                </AnimatedCard>

                {/* Password Section */}
                <AnimatedCard>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t.settings.changePassword}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.currentPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.newPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.confirmPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <LiveButton 
                      variant="primary" 
                      onClick={handleChangePassword}
                      icon={loading ? Loader : Lock}
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Change Password"}
                    </LiveButton>
                  </div>
                </AnimatedCard>
              </>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.privacySecurity}</h2>
                <div className="space-y-6">
                  {Object.entries(privacySettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Control who can see your information
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, [key]: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>
                  ))}
                  <LiveButton 
                    variant="primary" 
                    onClick={handleSavePrivacy}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Privacy Settings"}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.notificationPreferences}</h2>
                <div className="space-y-6">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Get updates about your applications and documents
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>
                  ))}
                  <LiveButton 
                    variant="primary" 
                    onClick={handleSaveNotifications}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Notification Settings"}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.preferences}</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t.settings.language}</label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="en">English</option>
                      <option value="uz">Uzbek</option>
                      <option value="ru">Russian</option>
                      <option value="de">German</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Font Size</label>
                    <div className="flex gap-3">
                      {['small', 'normal', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setPreferences({ ...preferences, fontSize: size })}
                          className={`px-4 py-2 rounded-lg font-bold capitalize transition-all ${
                            preferences.fontSize === size
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <LiveButton 
                    variant="primary" 
                    onClick={handleSavePreferences}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Preferences"}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
=======
import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Settings, LogOut, Bell, Lock, User, Globe, Moon, Eye, Upload, Save, X, Loader, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiRequest } from "@/lib/api";
import { error as logError } from "@/lib/logger";

export default function SettingsPage() {
  const { user, logout, isLoading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'preferences'>('account');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: false,
    showEmail: false,
    allowMessages: true,
    dataSharing: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    documentReminders: true,
    consultationReminders: true,
    newsAndUpdates: false,
  });

  const [preferences, setPreferences] = useState({
    language: lang || 'en',
    theme: 'light',
    fontSize: 'normal',
  });

  const [aiStatus, setAiStatus] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [checkingServices, setCheckingServices] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
    // initial service check for authenticated users
    if (!isLoading && user) {
      checkServices();
    }
  }, [isLoading, user, setLocation]);

  const checkServices = async () => {
    setCheckingServices(true);
    try {
      try {
        const a = await apiRequest<any>('/ai/status', { skipErrorToast: true });
        setAiStatus(a.providers);
      } catch (err) {
        setAiStatus({ error: String(err) });
      }

      try {
        const s = await apiRequest<any>('/stripe/validate', { skipErrorToast: true });
        setStripeStatus(s);
      } catch (err) {
        setStripeStatus({ ok: false, reason: String(err) });
      }
    } finally {
      setCheckingServices(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  const sections = [
    { id: 'account', label: t.settings.accountSettings, icon: User },
    { id: 'privacy', label: t.settings.privacySecurity, icon: Lock },
    { id: 'notifications', label: t.settings.notificationPreferences, icon: Bell },
    { id: 'preferences', label: t.settings.preferences, icon: Globe },
  ] as const;

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      setError(null);
      await apiRequest('/users/settings', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          avatar: formData.avatar,
        }),
      });

      toast({
        title: t.settings.profileUpdated,
        description: t.settings.profileUpdatedDesc,
        className: "bg-green-50 text-green-900 border-green-200",
      });
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      logError("Profile update error:", msg);
      setError(msg);
      toast({
        title: t.error.title,
        description: msg,
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: t.error.title,
        description: t.settings.passwordMismatch,
        className: "bg-red-50 text-red-900 border-red-200",
      });
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      toast({
        title: t.common.success,
        description: t.settings.passwordChangedDesc,
        className: "bg-green-50 text-green-900 border-green-200",
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast({
        title: "Error",
        description: msg,
        className: "bg-red-50 text-red-900 border-red-200",
      });
      logError("Change password error:", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      await apiRequest('/users/privacy-settings', {
        method: 'PUT',
        body: JSON.stringify(privacySettings),
      });

      toast({
        title: t.settings.profileUpdated,
        description: t.settings.profileUpdatedDesc,
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update settings";
      logError("Privacy settings update error:", msg);
      toast({
        title: t.error.title,
        description: msg,
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await apiRequest('/users/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(notificationSettings),
      });

      toast({
        title: t.settings.profileUpdated,
        description: t.settings.profileUpdatedDesc,
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update settings";
      logError("Notification settings update error:", msg);
      toast({
        title: t.error.title,
        description: msg,
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      if (preferences.language !== lang) {
        setLang(preferences.language);
      }

      await apiRequest('/users/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          language: preferences.language,
          theme: preferences.theme,
          fontSize: preferences.fontSize,
        }),
      });

      toast({
        title: t.settings.profileUpdated,
        description: t.settings.profileUpdatedDesc,
        className: "bg-green-50 text-green-900 border-green-200",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update preferences";
      logError("Preferences update error:", msg);
      toast({
        title: t.error.title,
        description: msg,
        className: "bg-red-50 text-red-900 border-red-200",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer"
            onClick={() => setLocation("/dashboard")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Settings size={20} />
            </div>
            <span className="text-slate-900 dark:text-white">{t.settings.title}</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LiveButton variant="ghost" onClick={() => { logout(); setLocation("/"); }} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              {t.dash.logout}
            </LiveButton>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 lg:p-12">
        {/* Error Banner */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">An error occurred</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Services Status Panel */}
        <div className="lg:col-span-4">
          <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Service Status</div>
              <div className="text-xs text-slate-500 mt-1">AI & payment provider connectivity</div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${aiStatus ? (aiStatus.local?.enabled || aiStatus.openai?.enabled || aiStatus.huggingface?.enabled ? 'bg-green-600' : 'bg-amber-500') : 'bg-gray-400'}`} />
                  <div className="text-sm">AI: {aiStatus ? (aiStatus.local?.enabled ? 'Local' : aiStatus.huggingface?.enabled ? `HF: ${aiStatus.huggingface.model}` : aiStatus.openai?.enabled ? 'OpenAI' : 'None configured') : 'Unknown'}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stripeStatus ? (stripeStatus.ok ? 'bg-green-600' : 'bg-amber-500') : 'bg-gray-400'}`} />
                  <div className="text-sm">Stripe: {stripeStatus ? (stripeStatus.ok ? 'Connected' : `Error: ${stripeStatus.reason || 'invalid'}`) : 'Unknown'}</div>
                </div>
              </div>
            </div>
            <div>
              <button onClick={checkServices} disabled={checkingServices} className="px-3 py-2 bg-brand-600 text-white rounded-md">
                {checkingServices ? 'Checking...' : 'Check Services'}
              </button>
            </div>
          </div>
        </div>
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                  activeSection === section.id
                    ? "bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </motion.button>
            ))}
          </motion.aside>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 space-y-6"
          >
            {activeSection === 'account' && (
              <>
                <AnimatedCard>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.settings.accountSettings}</h2>
                    <LiveButton
                      variant={editing ? "ghost" : "primary"}
                      onClick={() => setEditing(!editing)}
                      icon={editing ? X : User}
                      disabled={loading}
                    >
                      {editing ? t.settings.cancel : t.settings.editProfile}
                    </LiveButton>
                  </div>

                  <div className="space-y-6">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.firstName}</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          disabled={!editing}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.lastName}</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          disabled={!editing}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.emailAddress}</label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white opacity-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t.settings.emailCannotChange}</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.phoneNumber}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!editing}
                        placeholder={t.settings.phonePlaceholder}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    {editing && (
                      <LiveButton 
                        variant="primary" 
                        onClick={handleSaveProfile} 
                        icon={loading ? Loader : Save}
                        disabled={loading}
                      >
                        {loading ? t.settings.saving : t.settings.saveChanges}
                      </LiveButton>
                    )}
                  </div>
                </AnimatedCard>

                {/* Password Section */}
                <AnimatedCard>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">{t.settings.changePassword}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.currentPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.newPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.confirmPassword}</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <LiveButton 
                      variant="primary" 
                      onClick={handleChangePassword}
                      icon={loading ? Loader : Lock}
                      disabled={loading}
                    >
                      {loading ? t.settings.saving : t.settings.changePassword}
                    </LiveButton>
                  </div>
                </AnimatedCard>
              </>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.privacySecurity}</h2>
                <div className="space-y-6">
                  {Object.entries(privacySettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Control who can see your information
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, [key]: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>
                  ))}
                  <LiveButton 
                    variant="primary" 
                    onClick={handleSavePrivacy}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? t.settings.saving : t.settings.saveChanges}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.notificationPreferences}</h2>
                <div className="space-y-6">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Get updates about your applications and documents
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>
                  ))}
                  <LiveButton 
                    variant="primary" 
                    onClick={handleSaveNotifications}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? t.settings.saving : t.settings.saveChanges}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">{t.settings.preferences}</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t.settings.language}</label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="en">English</option>
                      <option value="uz">Uzbek</option>
                      <option value="ru">Russian</option>
                      <option value="de">German</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Font Size</label>
                    <div className="flex gap-3">
                      {['small', 'normal', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setPreferences({ ...preferences, fontSize: size })}
                          className={`px-4 py-2 rounded-lg font-bold capitalize transition-all ${
                            preferences.fontSize === size
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <LiveButton 
                    variant="primary" 
                    onClick={handleSavePreferences}
                    icon={loading ? Loader : Save}
                    disabled={loading}
                  >
                    {loading ? t.settings.saving : t.settings.saveChanges}
                  </LiveButton>
                </div>
              </AnimatedCard>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> 3358f8f (feat: Implement all 5 growth optimizations - pricing redesign, eligibility quiz, partner program, feature badges, mobile optimization)
