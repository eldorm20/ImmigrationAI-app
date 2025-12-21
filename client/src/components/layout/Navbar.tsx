import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LiveButton } from "@/components/ui/live-elements";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Menu, Plane, User, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t, setLang, lang } = useI18n();
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const transparentNav = location === "/";
  const isTransparent = transparentNav && !isScrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isTransparent
        ? "bg-transparent py-4"
        : "glass py-2"
        }`}
    >
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-transform ${isTransparent ? 'bg-white/20 backdrop-blur-md border border-white/30' : 'bg-gradient-to-br from-brand-600 to-brand-400 shadow-brand-500/20'}`}>
              <Plane className={`transform -rotate-45 ${isTransparent ? 'text-white' : 'text-white'}`} size={20} />
            </div>
            <div className="flex flex-col">
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`font-heading font-extrabold text-xl tracking-tight leading-none ${isTransparent ? "text-white" : "text-slate-900 dark:text-white"}`}
              >
                Immigration<span className={`${isTransparent ? "text-brand-200" : "text-brand-600 dark:text-brand-400"}`}>AI</span>
              </motion.span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${isTransparent ? "text-white/70" : "text-slate-400"}`}>Visa Assistant</span>
            </div>
          </motion.div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <LiveButton
                  variant={isTransparent ? "glass" : "ghost"}
                  size="sm"
                  className={`gap-2 ${isTransparent ? "bg-white/10 hover:bg-white/20 border-white/20" : ""}`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="uppercase">{t.langNames?.[lang] || lang}</span>
                </LiveButton>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card border-none">
              <DropdownMenuItem onClick={() => setLang("en")}>{t.langNames?.en || "English"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("uz")}>{t.langNames?.uz || "O'zbekcha"}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("ru")}>{t.langNames?.ru || "Русский"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/features">
            <LiveButton variant={isTransparent ? "glass" : "ghost"} size="sm" className={isTransparent ? "bg-transparent border-transparent hover:bg-white/10" : ""}>
              Features
            </LiveButton>
          </Link>
          <Link href="/pricing">
            <LiveButton variant={isTransparent ? "glass" : "ghost"} size="sm" className={isTransparent ? "bg-transparent border-transparent hover:bg-white/10" : ""}>
              Pricing
            </LiveButton>
          </Link>
          <Link href="/partner">
            <LiveButton variant={isTransparent ? "glass" : "ghost"} size="sm" className={isTransparent ? "bg-transparent border-transparent hover:bg-white/10" : ""} onClick={() => window.open('/partner', '_blank')}>
              Partner
            </LiveButton>
          </Link>

          <div className={`h-6 w-px mx-2 ${isTransparent ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}></div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div>
                  <LiveButton variant={isTransparent ? "glass" : "outline"} className={`gap-2 rounded-full pl-2 pr-4 ${isTransparent ? 'bg-white/10 border-white/20 hover:bg-white/20' : ''}`}>
                    <div className="w-6 h-6 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name[0]}
                    </div>
                    <span className="max-w-[100px] truncate">{user.name}</span>
                  </LiveButton>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card border-none min-w-[200px]">
                <div className="px-2 py-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={() => window.location.href = user.role === 'lawyer' || user.role === 'admin' ? '/lawyer' : '/dashboard'}>
                  {t.dash?.welcome || 'Dashboard'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-red-50 dark:focus:bg-red-900/20">
                  {t.dash.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth">
                <LiveButton variant={isTransparent ? "glass" : "ghost"} size="sm" className={isTransparent ? "bg-transparent border-transparent hover:bg-white/10" : ""}>
                  {t.nav.login}
                </LiveButton>
              </Link>
              <Link href="/auth">
                <LiveButton variant={isTransparent ? "secondary" : "primary"} size="sm" className={isTransparent ? "bg-white text-brand-600 hover:bg-blue-50 border-0" : ""}>
                  {t.nav.start}
                </LiveButton>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <div>
              <LiveButton variant={isTransparent ? "glass" : "ghost"} size="icon" className={`md:hidden ${isTransparent ? "bg-white/10 border-white/20 text-white" : ""}`}>
                <Menu className="w-6 h-6" />
              </LiveButton>
            </div>
          </SheetTrigger>
          <SheetContent className="glass-card border-none w-[300px]">
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex flex-wrap gap-2 mb-6 p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
                {['en', 'uz', 'ru'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l as any)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all ${lang === l ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
                  >
                    {t.langNames?.[l as any] || l}
                  </button>
                ))}
              </div>

              <Link href="/features">
                <LiveButton variant="ghost" className="w-full justify-start">Features</LiveButton>
              </Link>
              <Link href="/pricing">
                <LiveButton variant="ghost" className="w-full justify-start">Pricing</LiveButton>
              </Link>
              <Link href="/help">
                <LiveButton variant="ghost" className="w-full justify-start">{t.nav?.help || 'Help & Support'}</LiveButton>
              </Link>

              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

              {user ? (
                <>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2">
                    <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <LiveButton variant="primary" className="w-full" onClick={() => window.location.href = user.role === 'lawyer' || user.role === 'admin' ? '/lawyer' : '/dashboard'}>
                    Dashboard
                  </LiveButton>
                  <LiveButton variant="ghost" className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={logout}>{t.dash.logout}</LiveButton>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <LiveButton variant="secondary" className="w-full">{t.nav.login}</LiveButton>
                  </Link>
                  <Link href="/auth">
                    <LiveButton variant="primary" className="w-full">{t.nav.start}</LiveButton>
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}