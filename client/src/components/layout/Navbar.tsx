import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Menu, User, X } from "lucide-react";
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

  const isDark = location === "/lawyer";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30 transition-transform group-hover:scale-110">
              IA
            </div>
            <span className={`font-heading font-bold text-xl tracking-tight ${
               !isScrolled && location === "/" ? "text-white" : "text-foreground"
            }`}>
              ImmigrationAI
            </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${!isScrolled && location === "/" ? "text-white hover:text-white/80 hover:bg-white/10" : ""}`}
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase">{lang}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("uz")}>O'zbekcha</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("ru")}>Русский</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("de")}>Deutsch</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("fr")}>Français</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("es")}>Español</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/help">
            <Button
              variant="ghost"
              size="sm"
              className={`${!isScrolled && location === "/" ? "text-white hover:text-white/80 hover:bg-white/10" : ""}`}
            >
              Help
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full pl-2 pr-4 border-primary/20 hover:bg-primary/5">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                    {user.name[0]}
                  </div>
                  <span className="max-w-[100px] truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.location.href = user.role === 'lawyer' || user.role === 'admin' ? '/lawyer' : '/dashboard'}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  {t.dash.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth">
                <Button variant="ghost" className={!isScrolled && location === "/" ? "text-white hover:bg-white/10 hover:text-white" : ""}>
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                  {t.nav.start}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className={`md:hidden ${!isScrolled && location === "/" ? "text-white hover:bg-white/10" : ""}`}>
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-4 mt-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant={lang === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLang('en')}>EN</Button>
                <Button variant={lang === 'uz' ? 'default' : 'outline'} size="sm" onClick={() => setLang('uz')}>UZ</Button>
                <Button variant={lang === 'ru' ? 'default' : 'outline'} size="sm" onClick={() => setLang('ru')}>RU</Button>
                <Button variant={lang === 'de' ? 'default' : 'outline'} size="sm" onClick={() => setLang('de')}>DE</Button>
                <Button variant={lang === 'fr' ? 'default' : 'outline'} size="sm" onClick={() => setLang('fr')}>FR</Button>
                <Button variant={lang === 'es' ? 'default' : 'outline'} size="sm" onClick={() => setLang('es')}>ES</Button>
              </div>

              <Link href="/help">
                <Button variant="outline" className="w-full justify-start">Help & Support</Button>
              </Link>
              
              {user ? (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button onClick={() => window.location.href = user.role === 'lawyer' || user.role === 'admin' ? '/lawyer' : '/dashboard'}>
                    Dashboard
                  </Button>
                  <Button variant="destructive" onClick={logout}>{t.dash.logout}</Button>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <Button variant="outline" className="w-full justify-start">{t.nav.login}</Button>
                  </Link>
                  <Link href="/auth">
                    <Button className="w-full">{t.nav.start}</Button>
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