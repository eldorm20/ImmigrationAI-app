import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }: any) => {
  const base = "px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer";
  const styles: any = {
    primary: "bg-brand-600 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-700",
    secondary: "bg-white text-slate-700 border hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      {children}
    </button>
  );
};

const Input = ({ label, id, error, hint, ...props }: any) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-xs font-bold uppercase text-slate-500 mb-1">{label}</label>
    <input id={id} {...props} className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border focus:ring-2 outline-none transition ${error ? "border-danger-600 focus:ring-danger-600" : "border-slate-200 dark:border-slate-700 focus:ring-brand-500"}`} />
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
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const e: any = {};
    if (!email) {
      e.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      e.email = "Please enter a valid email address.";
    }
    if (!password) {
      e.password = "Password is required.";
    } else if (password.length < 8) {
      e.password = "Password must be at least 8 characters.";
    }
    if (mode === "register") {
      if (!firstName.trim()) {
        e.firstName = "First name is required.";
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
          title: "Success",
          description: "Logged in successfully!",
        });
      } else {
        await register(email, password, firstName, lastName, role);
        toast({
          title: "Success",
          description: "Account created! Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || `${mode === "login" ? "Login" : "Registration"} failed. Please try again.` });
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
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
            Login
          </button>
          <button
            onClick={() => {
              setMode("register");
              setErrors({});
            }}
            className={`flex-1 py-2 px-4 rounded-xl font-bold transition ${mode === "register" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
          >
            Register
          </button>
        </div>

        <h2 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">
          {mode === "login" ? t.auth.applicantLogin : "Create Account"}
        </h2>
        <p className="text-slate-500 mb-8">{mode === "login" ? t.auth.enterDetails : "Sign up to get started"}</p>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <>
              <Input
                label="First Name"
                id="auth-firstname"
                type="text"
                required
                value={firstName}
                onChange={(e: any) => setFirstName(e.target.value)}
                placeholder="John"
                error={errors.firstName}
              />
              <Input
                label="Last Name"
                id="auth-lastname"
                type="text"
                required
                value={lastName}
                onChange={(e: any) => setLastName(e.target.value)}
                placeholder="Doe"
                error={errors.lastName}
              />
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Account Type</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "applicant" | "lawyer")}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="applicant">Applicant</option>
                  <option value="lawyer">Lawyer</option>
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
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="name@email.com"
            error={errors.email}
          />
          <Input
            label={t.auth.password}
            id="auth-pass"
            type="password"
            required
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={errors.password}
            hint={mode === "register" ? "Minimum 8 characters" : t.auth.minChars}
          />
          {errors.submit && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {errors.submit}
            </div>
          )}
          <Button type="submit" className="w-full py-4 mt-4 h-14 text-lg shadow-brand-500/40" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : mode === "login" ? t.auth.signIn : "Create Account"}
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
              Already have an account?{" "}
              <span
                className="text-brand-600 dark:text-brand-400 font-bold cursor-pointer hover:underline"
                onClick={() => setMode("login")}
              >
                Sign in
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
