import React from "react";
import { useI18n } from "@/lib/i18n";

const languages: { code: "en" | "uz" | "ru"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur px-1 py-1 shadow-sm border border-white/40 dark:border-white/10">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors " +
            (locale === l.code
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10")
          }
          aria-pressed={locale === l.code}
          aria-label={`Switch language to ${l.label}`}
          type="button"
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
