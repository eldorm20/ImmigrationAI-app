import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LiveButton, AnimatedCard } from "@/components/ui/live-elements";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  id?: string;
  error?: string | null;
  hint?: React.ReactNode;
};

const Input: React.FC<InputProps> = ({ label, id, error, hint, ...props }) => (
  <div className="mb-4">
    {label && <label htmlFor={id} className="block text-xs font-bold uppercase text-slate-500 mb-1">{label}</label>}
    <input id={id} {...props} className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border focus:ring-2 outline-none transition ${error ? 'border-danger-600 focus:ring-danger-600' : 'border-slate-200 dark:border-slate-700 focus:ring-brand-500'}`} />
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    {error && <p className="text-xs text-danger-600 mt-1">{error}</p>}
  </div>
);

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"applicant" | "lawyer">("applicant");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) {
      e.email = t.auth.emailRequired;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      e.email = t.auth.invalidEmail;
    }
    if (!password) {
      e.password = t.auth.passwordRequired;
    } else if (password.length < 8) {
      e.password = t.auth.passwordTooShort;
    }
    if (mode === "register") {
      if (!firstName.trim()) {
        e.firstName = t.auth.emailRequired;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      if (mode === "login") {
        await login(email, password);
        toast({
          title: t.common.success,
          description: t.auth.signIn + " " + t.common.success,
        });
      } else {
        await register(email, password, firstName, lastName, role);
        toast({
          title: t.common.success,
          description: t.auth.register + " " + t.common.success,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors({ submit: message || `${mode === 'login' ? t.auth.signIn : t.auth.register} ` + t.common.error });
      toast({
        title: t.error.title,
        description: message || t.error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const brandName = tenant?.name || "ImmigrationAI";
  const brandLogo = tenant?.logo;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100">
      <AnimatedCard className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
        <button onClick={() => setLocation("/")} className="mb-6 flex gap-2 text-slate-500 font-bold hover:text-brand-600 items-center transition-colors">
          <ArrowLeft size={18} /> {t.auth.back}
        </button>

        {/* Dynamic Logo Section */}
        <div className="flex justify-center mb-6">
          <div className="text-center">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-12 mx-auto mb-2 object-contain" />
            ) : null}
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-blue-600">
              {brandName}
            </h1>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <LiveButton
            onClick={() => {
              setMode("login");
              setErrors({});
            }}
            variant={mode === "login" ? "primary" : "secondary"}
            className="flex-1"
          >
            {t.auth.signIn}
          </LiveButton>
          <LiveButton
            onClick={() => {
              setMode("register");
              setErrors({});
            }}
            variant={mode === "register" ? "primary" : "secondary"}
            className="flex-1"
          >
            {t.auth.register}
          </LiveButton>
        </div>

        <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white text-center">
          {mode === "login" ? t.auth.applicantLogin : t.auth.register}
        </h2>
        <p className="text-slate-500 mb-8 text-center text-sm">{mode === "login" ? t.auth.enterDetails : t.auth.enterDetails}</p>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <>
              <Input
                label={t.auth.firstName}
                id="auth-firstname"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName((e.target as HTMLInputElement).value)}
                placeholder="John"
                error={errors.firstName}
              />
              <Input
                label={t.auth.lastName}
                id="auth-lastname"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName((e.target as HTMLInputElement).value)}
                placeholder="Doe"
                error={errors.lastName}
              />
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{t.auth.accountType || 'Account Type'}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "applicant" | "lawyer")}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="applicant">{t.roles.applicant}</option>
                  <option value="lawyer">{t.roles.lawyer}</option>
                </select>
              </div>
            </>
          )}
          <Input
            label={t.auth.email}
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="name@email.com"
            error={errors.email}
          />
          <Input
            label={t.auth.password}
            id="auth-pass"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            placeholder="••••••••"
            error={errors.password}
            hint={mode === "register" ? t.auth.minChars : t.auth.minChars}
          />
          {errors.submit && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {errors.submit}
            </div>
          )}
          <LiveButton type="submit" className="w-full py-4 mt-4 h-14 text-lg shadow-brand-500/40" disabled={loading} loading={loading}>
            {mode === "login" ? t.auth.signIn : t.auth.register}
          </LiveButton>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {mode === "login" ? (
            <p>
              {t.auth.noAccount}{" "}
              <span
                className="text-brand-600 dark:text-brand-400 font-bold cursor-pointer hover:underline"
                onClick={() => setMode("register")}
              >
                {t.auth.register}
              </span>
            </p>
          ) : (
            <p>
              {t.auth.noAccount}{" "}
              <span
                className="text-brand-600 dark:text-brand-400 font-bold cursor-pointer hover:underline"
                onClick={() => setMode("login")}
              >
                {t.auth.signIn}
              </span>
            </p>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}
