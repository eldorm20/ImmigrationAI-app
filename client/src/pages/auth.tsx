import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
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
  const [authMethod, setAuthMethod] = useState<"email" | "phone" | "google">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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

  const brandName = "ImmigrationAI";
  const brandLogo: string | undefined = undefined; // No custom logo

  const handleSendOTP = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await apiRequest("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setOtpSent(true);
      toast({ title: "OTP Sent", description: "Verification code sent to " + phone });
    } catch (error: any) {
      toast({ title: t.error.title, description: error.message, variant: "destructive" });
    } finally {
      setLoading(true); // Keep loading state if we want, or disable
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      });
      // In a real app, this would set the user session
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await apiRequest("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: "dummy-token" }),
      });
    } catch (error: any) {
      toast({ title: "Google login failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100">
      <AnimatedCard className="w-full max-w-md bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
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
<<<<<<< HEAD
  <p className="text-slate-500 mb-8 text-center text-sm">{mode === "login" ? t.auth.enterDetails : t.auth.enterDetails}</p>
=======
        <p className="text-slate-500 mb-6">{mode === "login" ? t.auth.enterDetails : t.auth.enterDetails}</p>
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720

  {
    mode === "login" && (
      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setAuthMethod("email")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${authMethod === "email" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600" : "text-slate-500"}`}
        >
          {t.auth.email || "Email"}
        </button>
        <button
          onClick={() => setAuthMethod("phone")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${authMethod === "phone" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600" : "text-slate-500"}`}
        >
          {t.auth.phone || "Phone"}
        </button>
        <button
          onClick={() => setAuthMethod("google")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${authMethod === "google" ? "bg-white dark:bg-slate-800 shadow-sm text-brand-600" : "text-slate-500"}`}
        >
          Google
        </button>
      </div>
    )
  }

  {
    authMethod === "email" || mode === "register" ? (
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
    ) : authMethod === "phone" ? (
      <div className="space-y-4">
        {!otpSent ? (
          <>
            <Input
              label={t.auth.phone || "Phone Number"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
            <LiveButton onClick={handleSendOTP} className="w-full py-4" disabled={loading} loading={loading}>
              Send OTP
            </LiveButton>
          </>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <Input
              label="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
            <LiveButton type="submit" className="w-full py-4" disabled={loading} loading={loading}>
              Verify & Login
            </LiveButton>
            <button
              onClick={() => setOtpSent(false)}
              className="w-full text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    ) : (
    <div className="py-8 text-center space-y-6">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M24 12.27c0-.85-.07-1.7-.22-2.53H12.27v4.8h6.6a5.66 5.66 0 0 1-2.43 3.71v3.08h3.94c2.31-2.12 3.62-5.25 3.62-9.06z" />
          <path fill="#34A853" d="M12.27 24a11.53 11.53 0 0 0 7.97-2.93l-3.94-3.08c-1.12.75-2.55 1.2-4.03 1.2a7.04 7.04 0 0 1-6.6-4.88H1.61v3.18A12 12 0 0 0 12.27 24z" />
          <path fill="#FBBC05" d="M5.67 14.31A7.2 7.2 0 0 1 5.27 12c0-.8.14-1.58.4-2.31V6.51H1.61A12 12 0 0 0 0 12c0 2.04.51 3.96 1.61 5.68l4.06-3.37z" />
          <path fill="#4285F4" d="M12.27 4.79c1.55 0 2.94.53 4.04 1.58l3.03-3.03A12 12 0 0 0 1.61 6.51l4.06 3.18a7.04 7.04 0 0 1 6.6-4.9z" />
        </svg>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 dark:text-white">Sign in with Google</h4>
        <p className="text-xs text-slate-500 mt-1">Faster access to your immigration documents</p>
      </div>
      <LiveButton onClick={handleGoogleLogin} className="w-full py-4 h-14" disabled={loading} loading={loading}>
        Continue with Google
      </LiveButton>
    </div>
  )
  }

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
      </AnimatedCard >
    </div >
  );
}
