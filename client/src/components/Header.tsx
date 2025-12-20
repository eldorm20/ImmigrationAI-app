import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Download, Code, LogOut, Eye, Filter, Briefcase } from 'lucide-react';
import { LiveButton } from '@/components/ui/live-elements';
import { useI18n, Language } from '@/lib/i18n';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  simple?: boolean;
}

export default function Header({ title, showBack, onBack, simple }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [compactNav, setCompactNav] = useState<boolean>(false);

  useEffect(() => {
    try {
      setCompactNav(localStorage.getItem('navbarCompact') === '1');
    } catch (_) { }
  }, []);

  const toggleCompact = () => {
    const next = !compactNav;
    setCompactNav(next);
    try { localStorage.setItem('navbarCompact', next ? '1' : '0'); } catch (_) { }
    // trigger a small visual refresh by dispatching an event
    window.dispatchEvent(new Event('navbarCompactChange'));
  };

  if (simple) {
    return (
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          {showBack && (
            <button onClick={() => (onBack ? onBack() : setLocation('/'))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Eye size={20} />
            </button>
          )}
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-0 z-40 flex justify-between items-center">
      <div className="flex items-center gap-3 font-extrabold text-lg text-brand-600 dark:text-brand-400 cursor-pointer" onClick={() => setLocation('/')}>
        <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-blue-400 rounded-lg text-white flex items-center justify-center shadow">L</div>
        <span className="hidden sm:inline">ImmigrationAI</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Language selector - Uzbek first, then Russian, then English */}
        <div className="hidden sm:flex items-center">
          <select
            aria-label="Select language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-2 py-1 text-sm"
          >
            <option value="uz">{t.langNames?.uz || "O'zbekcha"}</option>
            <option value="ru">{t.langNames?.ru || 'Русский'}</option>
            <option value="en">{t.langNames?.en || 'English'}</option>
          </select>
        </div>
        {!compactNav && (
          <>
            <LiveButton variant="ghost" className="hidden sm:inline-flex" onClick={() => window.dispatchEvent(new Event('exportCsv'))} icon={Download}>Export CSV</LiveButton>
            <LiveButton variant="ghost" className="hidden sm:inline-flex" onClick={() => window.dispatchEvent(new Event('exportJson'))} icon={Code}>Export JSON</LiveButton>
          </>
        )}

        <div className="hidden md:flex flex-col items-end">
          <span className="font-bold text-sm text-slate-900 dark:text-white">{user?.name}</span>
          <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{user?.role || ''}</span>
        </div>

        <ThemeToggle />

        <button title={compactNav ? 'Expand navbar' : 'Compact navbar'} onClick={toggleCompact} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
          {compactNav ? <Filter size={18} /> : <Eye size={18} />}
        </button>

        <LiveButton
          variant="ghost"
          className="p-2 rounded-full text-slate-400 hover:text-red-500 transition-colors animate-pulse"
          onClick={() => { logout(); setLocation('/'); }}
          icon={LogOut}
        >
          {"Logout"}
        </LiveButton>
      </div>
    </header>
  );
}
