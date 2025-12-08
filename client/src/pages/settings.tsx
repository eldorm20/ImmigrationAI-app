import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Settings, LogOut, Bell, Lock, User, Globe, Moon, Eye, Upload, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'preferences'>('account');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    avatar: '',
  });

  if (!user) return null;

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ] as const;

  const handleSaveProfile = async () => {
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully",
      className: "bg-green-50 text-green-900 border-green-200",
    });
    setEditing(false);
  };

  const handleChangePassword = () => {
    toast({
      title: "Password Reset Email Sent",
      description: "Check your email for password reset instructions",
      className: "bg-blue-50 text-blue-900 border-blue-200",
    });
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
            className="lg:col-span-3"
          >
            {/* Account Section */}
            {activeSection === 'account' && (
              <AnimatedCard>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h2>
                  <LiveButton
                    variant={editing ? "ghost" : "primary"}
                    onClick={() => setEditing(!editing)}
                    icon={editing ? X : User}
                  >
                    {editing ? "Cancel" : "Edit Profile"}
                  </LiveButton>
                </div>

                <div className="space-y-6">
                  {/* Avatar */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 p-[2px]">
                        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-2xl text-slate-900 dark:text-white">
                          {user.name[0]}
                        </div>
                      </div>
                      {editing && (
                        <LiveButton variant="ghost" className="border-2 border-dashed border-slate-300" icon={Upload}>
                          Upload Photo
                        </LiveButton>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!editing}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!editing}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editing}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                    />
                  </div>

                  {editing && (
                    <LiveButton variant="primary" onClick={handleSaveProfile} icon={Save}>
                      Save Changes
                    </LiveButton>
                  )}
                </div>

                {/* Password Section */}
                <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Password & Security</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Keep your account secure by regularly updating your password
                    </p>
                    <LiveButton variant="ghost" className="border-2 border-slate-300" icon={Lock} onClick={handleChangePassword}>
                      Change Password
                    </LiveButton>
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Privacy & Security</h2>
                <div className="space-y-6">
                  {[
                    { title: "Profile Visibility", description: "Control who can see your profile" },
                    { title: "Data Usage", description: "Manage how your data is used" },
                    { title: "Login Activity", description: "View recent login attempts" },
                    { title: "Connected Apps", description: "Manage connected third-party applications" },
                  ].map((item, i) => (
                    <motion.div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <LiveButton variant="ghost">Manage</LiveButton>
                    </motion.div>
                  ))}
                </div>
              </AnimatedCard>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Notification Preferences</h2>
                <div className="space-y-6">
                  {[
                    { title: "Email Notifications", description: "Receive updates via email", enabled: true },
                    { title: "Push Notifications", description: "Get push notifications on your device", enabled: true },
                    { title: "SMS Alerts", description: "Receive important alerts via SMS", enabled: false },
                    { title: "Marketing Emails", description: "Receive promotional content", enabled: false },
                  ].map((item, i) => (
                    <motion.div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={item.enabled}
                        onChange={() => toast({ title: "Preference Updated" })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </motion.div>
                  ))}
                </div>
              </AnimatedCard>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <AnimatedCard>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Preferences</h2>
                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Globe size={16} />
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="en">English</option>
                      <option value="uz">Uzbek (Ўзбек)</option>
                      <option value="ru">Russian (Русский)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="fr">French (Français)</option>
                      <option value="es">Spanish (Español)</option>
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Moon size={16} />
                      Theme
                    </label>
                    <div className="flex gap-4">
                      {[
                        { id: 'light', label: 'Light' },
                        { id: 'dark', label: 'Dark' },
                        { id: 'auto', label: 'Auto' },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          className="px-4 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 font-bold hover:border-brand-500 transition-colors"
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Default View */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Eye size={16} />
                      Default Dashboard View
                    </label>
                    <select className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                      <option>Roadmap</option>
                      <option>Documents</option>
                      <option>Chat</option>
                      <option>Applications</option>
                    </select>
                  </div>
                </div>
              </AnimatedCard>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
