import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const base = 'px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer';
  const styles: Record<string, string> = {
    primary: 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
};

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl animate-slide-up border border-slate-100 dark:border-slate-700">
        <button onClick={() => setLocation("/")} className="mb-6 flex gap-2 text-slate-500 font-bold hover:text-brand-600 items-center transition-colors">
          <ArrowLeft size={18} /> {t.auth.back}
        </button>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setMode("login");
              setErrors({});
            }}
            className={`flex-1 py-2 px-4 rounded-xl font-bold transition ${mode === "login" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
          >
            {t.auth.signIn}
          </button>
          <button
            onClick={() => {
              setMode("register");
              setErrors({});
            }}
            className={`flex-1 py-2 px-4 rounded-xl font-bold transition ${mode === "register" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
          >
            {t.auth.register}
          </button>
        </div>

        <h2 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">
          {mode === "login" ? t.auth.applicantLogin : t.auth.register}
        </h2>
        <p className="text-slate-500 mb-8">{mode === "login" ? t.auth.enterDetails : t.auth.enterDetails}</p>

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
          <Button type="submit" className="w-full py-4 mt-4 h-14 text-lg shadow-brand-500/40" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : mode === "login" ? t.auth.signIn : t.auth.register}
          </Button>
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
      </div>
    </div>
  );
}
