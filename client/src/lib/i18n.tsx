import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Supported locales
export type Locale = "en" | "uz" | "ru";

// Translation catalogs
const messages: Record<Locale, Record<string, string>> = {
  en: {
    // nav
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.lawyer": "Lawyer",
    "nav.research": "Research",
    "nav.messages": "Messages",
    "nav.settings": "Settings",
    "nav.logout": "Logout",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.partner": "Partner",

    // auth
    "auth.signIn": "Sign In",
    "auth.register": "Register",
    "auth.applicantLogin": "Applicant Login",
    "auth.enterDetails": "Enter your details to access the portal.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.minChars": "Min 6 characters",
    "auth.emailRequired": "Email is required",
    "auth.invalidEmail": "Invalid email address",
    "auth.passwordRequired": "Password is required",
    "auth.passwordTooShort": "Password must be at least 8 characters",
    "auth.firstName": "First Name",
    "auth.lastName": "Last Name",
    "auth.accountType": "Account Type",
    "auth.phone": "Phone",
    "auth.phonePlaceholder": "+1234567890",
    "auth.otpSent": "OTP Sent",
    "auth.verificationCodeSent": "Verification code sent to ",
    "auth.verificationFailed": "Verification Failed",
    "auth.sendOtp": "Send OTP",
    "auth.enterOtp": "Enter 6-digit OTP",
    "auth.otpPlaceholder": "123456",
    "auth.verifyAndLogin": "Verify & Login",
    "auth.changePhone": "Change phone number",
    "auth.signInWithGoogle": "Sign in with Google",
    "auth.googleBenefit": "Faster access to your immigration documents",
    "auth.continueWithGoogle": "Continue with Google",
    "auth.noAccount": "Don't have an account?",
    "auth.back": "Back",

    // common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.success": "Success",
    "common.error": "Error",

    // error
    "error.title": "Error",
    "error.message": "Something went wrong. Please try again.",

    // roles
    "roles.applicant": "Applicant",
    "roles.lawyer": "Lawyer",

    // dash nav shortcuts
    "dash.welcome": "Welcome,",

    // interview
    "interview.title": "Interview Coach",
    "interview.ready": "Ready to Practice?",
    "interview.readyDesc": "Select your visa type and destination to generate custom interview questions",
    "interview.startSession": "Start Session",
    "interview.question": "Question",
    "interview.category": "Category",
    "interview.answerPlaceholder": "Type your answer here...",
    "interview.evaluate": "Evaluate",
    "interview.feedback": "AI Feedback",
    "interview.strengths": "Strengths",
    "interview.weaknesses": "Areas to Improve",
    "interview.suggestions": "Suggestions",
    "interview.next": "Next Question",
    "interview.finish": "Finish Session",
    "interview.sessionComplete": "Session Complete",
    "interview.allQuestions": "You've completed all questions!",
    "interview.progress": "Progress",
    "interview.textPractice": "Text Practice",
    "interview.voiceMode": "Voice Mode",
  },
  uz: {
    // nav
    "nav.home": "Bosh sahifa",
    "nav.dashboard": "Panel",
    "nav.lawyer": "Yurist",
    "nav.research": "Tadqiqot",
    "nav.messages": "Xabarlar",
    "nav.settings": "Sozlamalar",
    "nav.logout": "Chiqish",
    "nav.features": "Xususiyatlar",
    "nav.pricing": "Narxlar",
    "nav.partner": "Hamkor",

    // auth
    "auth.signIn": "Kirish",
    "auth.register": "Ro'yxatdan o'tish",
    "auth.applicantLogin": "Arizachi Kirishi",
    "auth.enterDetails": "Portalga kirish uchun ma'lumotlarni kiriting.",
    "auth.email": "Email",
    "auth.password": "Parol",
    "auth.minChars": "Minimal 6 belgi",
    "auth.emailRequired": "Email talab qilinadi",
    "auth.invalidEmail": "Noto'g'ri email manzili",
    "auth.passwordRequired": "Parol talab qilinadi",
    "auth.passwordTooShort": "Parol kamida 8 belgidan iborat bo'lishi kerak",
    "auth.firstName": "Ism",
    "auth.lastName": "Familiya",
    "auth.accountType": "Hisob turi",
    "auth.phone": "Telefon",
    "auth.phonePlaceholder": "+998901234567",
    "auth.otpSent": "OTP yuborildi",
    "auth.verificationCodeSent": "Tasdiqlash kodi yuborildi: ",
    "auth.verificationFailed": "Tasdiqlash muvaffaqiyatsiz",
    "auth.sendOtp": "OTP yuborish",
    "auth.enterOtp": "6 xonali OTP ni kiriting",
    "auth.otpPlaceholder": "123456",
    "auth.verifyAndLogin": "Tasdiqlash va kirish",
    "auth.changePhone": "Telefon raqamini o'zgartirish",
    "auth.signInWithGoogle": "Google orqali kirish",
    "auth.googleBenefit": "Hujjatlarga tezkor kirish",
    "auth.continueWithGoogle": "Google bilan davom eting",
    "auth.noAccount": "Hisobingiz yo'qmi?",
    "auth.back": "Orqaga",

    // common
    "common.save": "Saqlash",
    "common.cancel": "Bekor qilish",
    "common.close": "Yopish",
    "common.loading": "Yuklanmoqda...",
    "common.success": "Muvaffaqiyatli",
    "common.error": "Xato",

    // error
    "error.title": "Xato",
    "error.message": "Xatolik yuz berdi. Qayta urinib ko'ring.",

    // roles
    "roles.applicant": "Arizachi",
    "roles.lawyer": "Yurist",

    // dash
    "dash.welcome": "Xush kelibsiz,",

    // interview
    "interview.title": "Intervyu Mashqlari",
    "interview.ready": "Mashq qilishga tayyormisiz?",
    "interview.readyDesc": "Maxsus intervyu savollarini yaratish uchun viza turini va manzilni tanlang",
    "interview.startSession": "Boshla",
    "interview.question": "Savol",
    "interview.category": "Turkum",
    "interview.answerPlaceholder": "Javobingizni yozing...",
    "interview.evaluate": "Baholash",
    "interview.feedback": "AI Fikri",
    "interview.strengths": "Kuchli tomonlar",
    "interview.weaknesses": "Yaxshilanishi kerak",
    "interview.suggestions": "Takliflar",
    "interview.next": "Keyingi Savol",
    "interview.finish": "Tugatish",
    "interview.sessionComplete": "Mashg'ulot tugadi",
    "interview.allQuestions": "Barcha savollarni tugatdingiz!",
    "interview.progress": "Jarayon",
    "interview.textPractice": "Matn Mashqi",
    "interview.voiceMode": "Ovozli Rejim",
  },
  ru: {
    // nav
    "nav.home": "Главная",
    "nav.dashboard": "Панель",
    "nav.lawyer": "Юрист",
    "nav.research": "Исследования",
    "nav.messages": "Сообщения",
    "nav.settings": "Настройки",
    "nav.logout": "Выйти",
    "nav.features": "Возможности",
    "nav.pricing": "Цены",
    "nav.partner": "Партнер",

    // auth
    "auth.signIn": "Войти",
    "auth.register": "Зарегистрироваться",
    "auth.applicantLogin": "Вход Заявителя",
    "auth.enterDetails": "Введите данные для доступа к порталу.",
    "auth.email": "Email",
    "auth.password": "Пароль",
    "auth.minChars": "Мин. 6 символов",
    "auth.emailRequired": "Требуется email",
    "auth.invalidEmail": "Неверный адрес email",
    "auth.passwordRequired": "Требуется пароль",
    "auth.passwordTooShort": "Пароль должен быть не менее 8 символов",
    "auth.firstName": "Имя",
    "auth.lastName": "Фамилия",
    "auth.accountType": "Тип аккаунта",
    "auth.phone": "Телефон",
    "auth.phonePlaceholder": "+79991234567",
    "auth.otpSent": "OTP отправлен",
    "auth.verificationCodeSent": "Код отправлен на ",
    "auth.verificationFailed": "Проверка не удалась",
    "auth.sendOtp": "Отправить OTP",
    "auth.enterOtp": "Вве��ите 6-значный OTP",
    "auth.otpPlaceholder": "123456",
    "auth.verifyAndLogin": "Подтвердить и войти",
    "auth.changePhone": "Изменить номер телефона",
    "auth.signInWithGoogle": "Войти с Google",
    "auth.googleBenefit": "Быстрый доступ к вашим документам",
    "auth.continueWithGoogle": "Продолжить с Google",
    "auth.noAccount": "Нет аккаунта?",
    "auth.back": "Назад",

    // common
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.close": "Закрыть",
    "common.loading": "Загрузка...",
    "common.success": "Успех",
    "common.error": "Ошибка",

    // error
    "error.title": "Ошибка",
    "error.message": "Произошла ошибка. Попробуйте снова.",

    // roles
    "roles.applicant": "Заявитель",
    "roles.lawyer": "Юрист",

    // dash
    "dash.welcome": "Привет,",

    // interview
    "interview.title": "Тренер Интервью",
    "interview.ready": "Готовы к практике?",
    "interview.readyDesc": "Выберите тип визы и страну назначения для генерации индивидуальных вопросов",
    "interview.startSession": "Начать Сессию",
    "interview.question": "Вопрос",
    "interview.category": "Категория",
    "interview.answerPlaceholder": "Введите ваш ответ...",
    "interview.evaluate": "Оценить",
    "interview.feedback": "Обратная связь AI",
    "interview.strengths": "Сильные стороны",
    "interview.weaknesses": "Области для улучшения",
    "interview.suggestions": "Предложения",
    "interview.next": "Следующий Вопрос",
    "interview.finish": "Завершить Сессию",
    "interview.sessionComplete": "Сессия завершена",
    "interview.allQuestions": "Вы ответили на все вопросы!",
    "interview.progress": "Прогресс",
    "interview.textPractice": "Текстовая Практика",
    "interview.voiceMode": "Голосовой Режим",
  },
};

const DEFAULT_LOCALE: Locale = "en";
const STORAGE_KEY = "immigrationai.locale";

interface I18nContextValue {
  locale: Locale;
  t: any; // callable + namespaced
  setLocale: (locale: Locale) => void;
  lang: Locale;
  setLang: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return Object.keys(params).reduce((acc, k) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(params[k])), template);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    return saved && messages[saved] ? saved : DEFAULT_LOCALE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch { }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    if (messages[l]) setLocaleState(l);
  }, []);

  const t = useMemo(() => {
    const fn = (key: string, params?: Record<string, string | number>) => {
      const dict = messages[locale] || messages[DEFAULT_LOCALE];
      const fallbackDict = messages[DEFAULT_LOCALE];
      const raw = dict[key] ?? fallbackDict[key] ?? key;
      return interpolate(raw, params);
    };
    const dict = messages[locale] || messages[DEFAULT_LOCALE];

    // Lang names and basic nav/dash
    (fn as any).langNames = { en: "English", uz: "O'zbekcha", ru: "Русский" } as Record<Locale, string>;
    (fn as any).nav = {
      login: dict["auth.signIn"] || "Sign In",
      start: dict["auth.register"] || "Register",
      features: dict["nav.features"] || "Features",
      pricing: dict["nav.pricing"] || "Pricing",
      partner: dict["nav.partner"] || "Partner",
      help: "Help & Support",
    };
    (fn as any).dash = {
      welcome: dict["dash.welcome"] || "Welcome,",
      logout: dict["nav.logout"] || "Logout",
    };

    // Auth namespace for backward-compat
    (fn as any).auth = {
      signIn: dict["auth.signIn"],
      register: dict["auth.register"],
      applicantLogin: dict["auth.applicantLogin"],
      enterDetails: dict["auth.enterDetails"],
      email: dict["auth.email"],
      password: dict["auth.password"],
      minChars: dict["auth.minChars"],
      emailRequired: dict["auth.emailRequired"],
      invalidEmail: dict["auth.invalidEmail"],
      passwordRequired: dict["auth.passwordRequired"],
      passwordTooShort: dict["auth.passwordTooShort"],
      firstName: dict["auth.firstName"],
      lastName: dict["auth.lastName"],
      accountType: dict["auth.accountType"],
      phone: dict["auth.phone"],
      phonePlaceholder: dict["auth.phonePlaceholder"],
      otpSent: dict["auth.otpSent"],
      verificationCodeSent: dict["auth.verificationCodeSent"],
      verificationFailed: dict["auth.verificationFailed"],
      sendOtp: dict["auth.sendOtp"],
      enterOtp: dict["auth.enterOtp"],
      otpPlaceholder: dict["auth.otpPlaceholder"],
      verifyAndLogin: dict["auth.verifyAndLogin"],
      changePhone: dict["auth.changePhone"],
      signInWithGoogle: dict["auth.signInWithGoogle"],
      googleBenefit: dict["auth.googleBenefit"],
      continueWithGoogle: dict["auth.continueWithGoogle"],
      noAccount: dict["auth.noAccount"],
      back: dict["auth.back"],
    };

    (fn as any).common = {
      save: dict["common.save"],
      cancel: dict["common.cancel"],
      close: dict["common.close"],
      loading: dict["common.loading"],
      success: dict["common.success"],
      error: dict["common.error"],
    };

    (fn as any).error = {
      title: dict["error.title"],
      message: dict["error.message"],
    };

    (fn as any).roles = {
      applicant: dict["roles.applicant"],
      lawyer: dict["roles.lawyer"],
    };

    // Lawyer Dashboard Translations
    (fn as any).lawyer = {
      leads: {
        title: dict["lawyer.leads.title"] || "Lead Pipeline",
        subtitle: dict["lawyer.leads.subtitle"] || "Manage and convert your potential clients",
        add: dict["lawyer.leads.add"] || "Add Lead",
        search: dict["lawyer.leads.search"] || "Search leads...",
        searchPlaceholder: dict["lawyer.leads.search"] || "Search conversations...",
        filter: dict["lawyer.leads.filter"] || "Filter View",
        register: dict["lawyer.leads.register"] || "Register New Lead",
        capture: dict["lawyer.leads.capture"] || "Capture prospect details",
        promote: dict["lawyer.leads.promote"] || "Promote",
        empty: dict["lawyer.leads.empty"] || "No leads found",
        sync: dict["lawyer.leads.sync"] || "Syncing leads...",
        stats: {
          potential: dict["lawyer.leads.stats.potential"] || "Potential Value",
        },
        stages: {
          all: dict["lawyer.leads.stages.all"] || "All Stages",
          new: dict["lawyer.leads.stages.new"] || "New Inquiry",
          inquiry: dict["lawyer.leads.stages.inquiry"] || "Inquiry",
          contacted: dict["lawyer.leads.stages.contacted"] || "Contacted",
          qualified: dict["lawyer.leads.stages.qualified"] || "Qualified",
          converted: dict["lawyer.leads.stages.converted"] || "Converted",
          lost: dict["lawyer.leads.stages.lost"] || "Lost",
          consultation_scheduled: "Consultation Scheduled",
          consultation_completed: "Consultation Completed",
          proposal_sent: "Proposal Sent"
        },

        table: {
          client: dict["lawyer.leads.table.client"] || "Prospect",
          contact: dict["lawyer.leads.table.contact"] || "Contact Info",
          objective: dict["lawyer.leads.table.objective"] || "Visa Objective",
          stage: dict["lawyer.leads.table.stage"] || "Stage",
          value: dict["lawyer.leads.table.value"] || "Est. Value",
          action: dict["lawyer.leads.table.action"] || "Action",
        },
        form: {
          firstName: dict["lawyer.leads.form.firstName"] || "First Name",
          lastName: dict["lawyer.leads.form.lastName"] || "Last Name",
          email: dict["lawyer.leads.form.email"] || "Email Address",
          visa: dict["lawyer.leads.form.visa"] || "Visa Interest",
          val: dict["lawyer.leads.form.val"] || "Est. Value ($)",
          source: dict["lawyer.leads.form.source"] || "Lead Source",
          discard: dict["lawyer.leads.form.discard"] || "Discard",
          deploy: dict["lawyer.leads.form.deploy"] || "Save Lead",
        }
      },
      financials: {
        title: "Financials",
        subtitle: "Manage billing & revenue",
        create: "New Invoice",
        pendingPayments: "No pending payments found",
        form: {
          client: "Client",
          items: "Service Line Items",
          quantity: "Qty",
          rate: "Rate",
          tax: "Tax",
          amount: "Amount"
        },
        table: {
          invoice: "Invoice #",
          client: "Client",
          date: "Date Issued",
          amount: "Amount",
          status: "Status",
          actions: "Actions"
        }
      },
      clientsHub: {
        title: dict["lawyer.clientsHub.title"] || "Client Portfolio",
        subtitle: dict["lawyer.clientsHub.subtitle"] || "View and manage your active client base",
        register: dict["lawyer.clientsHub.register"] || "Register Client",
        newClient: dict["lawyer.clientsHub.newClient"] || "New Client",
        addDesc: dict["lawyer.clientsHub.addDesc"] || "Add a new client to your portfolio manually",
        search: dict["lawyer.clientsHub.search"] || "Search clients...",
        totalNetwork: dict["lawyer.clientsHub.totalNetwork"] || "Total Network",
        activeMandates: dict["lawyer.clientsHub.activeMandates"] || "Active Mandates",
        potentialValue: dict["lawyer.clientsHub.potentialValue"] || "Leads",
        practiceRevenue: dict["lawyer.clientsHub.practiceRevenue"] || "Practice Revenue",
        loading: dict["lawyer.clientsHub.loading"] || "Loading portfolio...",
        empty: dict["lawyer.clientsHub.empty"] || "No clients found",
        table: {
          identity: dict["lawyer.clientsHub.table.identity"] || "Identity",
          contact: dict["lawyer.clientsHub.table.contact"] || "Contact",
          engagement: dict["lawyer.clientsHub.table.engagement"] || "Engagement Status",
          acquisition: dict["lawyer.clientsHub.table.acquisition"] || "Acquisition",
          lastSync: dict["lawyer.clientsHub.table.lastSync"] || "Last Sync",
        },
        actions: {
          copy: dict["lawyer.clientsHub.actions.copy"] || "Copy Email",
          profile: dict["lawyer.clientsHub.actions.profile"] || "View Profile",
          file: dict["lawyer.clientsHub.actions.file"] || "View File",
          msg: dict["lawyer.clientsHub.actions.msg"] || "Send Message",
        }
      }
    };

    // Comprehensive namespaces to prevent "Cannot read properties of undefined (reading 'title')"
    (fn as any).features = { title: dict["features.title"] || "Features" };
    (fn as any).pricing = { title: dict["pricing.title"] || "Pricing" };
    (fn as any).partner = { title: dict["partner.title"] || "Partner" };
    (fn as any).hero = { title: dict["hero.title"] || "Welcome" };
    (fn as any).research = { title: dict["research.title"] || "Research" };
    (fn as any).terms = { title: dict["terms.title"] || "Terms" };
    (fn as any).settings = { title: dict["settings.title"] || "Settings" };
    (fn as any).help = { title: "Help & Support" };

    (fn as any).tools = {
      next: "Next",
      back: "Back",
      save: "Save",
      cancel: "Cancel"
    };

    (fn as any).roadmap = {
      title: "Roadmap",
      assessment: "Assessment",
      documents: "Documents",
      lawyerReview: "Lawyer Review",
      submission: "Submission",
      completionLabel: "Completion",
      nextStepLabel: "Next Step",
      applicationReference: "Ref",
      defaults: {
        assessmentDesc: "Initial assessment",
        documentsDesc: "Document gathering",
        lawyerReviewDesc: "Expert review",
        submissionDesc: "Final submission"
      }
    };

    (fn as any).simulator = {
      title: "Visa Simulator",
      desc: "Simulate your visa application success",
      config: "Configuration",
      country: "Country",
      education: "Education",
      experience: "Experience",
      language: "Language",
      salary: "Salary",
      simulate: "Simulate",
      analyzing: "Analyzing...",
      results: "Results",
      likelihood: "Likelihood",
      score: "Score",
      processing: "Processing Time",
      tips: "Improvement Tips",
      tryAnother: "Try Another",
      options: {
        countries: { uk: "United Kingdom", us: "USA", ca: "Canada", au: "Australia" },
        visaTypes: { skilled_worker: "Skilled Worker", student: "Student", visitor: "Visitor" },
        education: { high_school: "High School", bachelors: "Bachelors", masters: "Masters", phd: "PhD" },
        experience: { '0-2': "0-2 years", '3-5': "3-5 years", '5-10': "5-10 years", '10+': "10+ years" },
        language: { none: "None", basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" },
        salary: { under_50k: "< $50k", '50k_80k': "$50k - $80k", '80k_120k': "$80k - $120k", '120k_plus': "$120k+" }
      }
    };

    (fn as any).interview = {
      title: "Interview Coach",
      desc: "Practice with AI",
      options: {
        visaTypes: ["Skilled Worker", "Student Visa", "Family Visa", "Business Visa"],
        countries: ["United States", "United Kingdom", "Canada", "Australia", "Germany"]
      }
    };

    (fn as any).messaging = {
      title: dict["messaging.title"] || "Messages",
      refresh: "Refresh",
      noConversations: "No conversations yet",
      participant: "Participant",
      noMessages: "No messages yet",
      selectConversation: "Select a conversation to start chatting",
      inputPlaceholder: "Type a message...",
      sendHint: "Press Enter to send",
      sendError: "Failed to send message",
      connected: "Connected",
      disconnected: "Disconnected"
    };

    (fn as any).review = {
      title: "AI Review",
      desc: "Instant AI document analysis"
    };

    (fn as any).gov = {
      title: "Gov Checks",
      desc: "Official status monitoring",
      visaType: "Visa Type"
    };

    (fn as any).voice = {
      title: "Interview Coach",
      desc: "Practice with AI"
    };

    (fn as any).consultation = {
      title: dict["consultation.title"] || "Consultations",
      submitError: "Failed to submit request",
      requestSubmitted: "Request submitted successfully",
      cancelled: "Consultation cancelled",
      cancelError: "Failed to cancel",
      acceptAndConfirm: "Accept & Confirm",
      reject: "Reject",
      confirm: "Confirm",
      cancel: "Cancel",
      completedLabel: "Completed",
      cancelledLabel: "Cancelled",
      noConsultations: "No consultations found",
      confirmClearHistory: "Are you sure you want to clear history?",
      historyCleared: "History cleared",
      clearHistory: "Clear History",
      selectLawyer: "Select a Lawyer",
      askQuestion: "Ask a Question",
      scheduleCall: "Schedule a Call",
      askTitle: "Ask a Question",
      requestConsultation: "Request Consultation",
      askDesc: "Get answers to your immigration questions",
      yourQuestion: "Your Question",
      submitQuestion: "Submit Question",
      preferredDateTime: "Preferred Date & Time",
      duration: "Duration",
      notes: "Notes",
      notesPlaceholder: "Briefly describe your case or questions...",
      submitRequest: "Submit Request",
      consultationChat: "Consultation Chat",
      joinVideoCall: "Join Video Call",
      inputPlaceholder: "Type a message...",
      connected: "Connected",
      disconnected: "Disconnected",
      missingInfo: "Please fill in all required fields"
    };

    (fn as any).applications = { title: dict["applications.title"] || "Applications" };
    (fn as any).lawyerDashboard = {
      title: dict["lawyerDashboard.title"] || "Lawyer Dashboard",
      consultations: "Consultations",
      pending: "Pending",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      all: "All",
      typeResponse: "Type your response here...",
      suggestConsultation: "Suggest scheduling a consultation call",
      sendResponse: "Send Response",
      replyToInquiry: "Reply to Inquiry"
    };
    (fn as any).dashStatus = {
      label: dict["dashStatus.label"] || "Status",
      active: dict["dashStatus.active"] || "Active"
    };

    // Fill out dash keys to avoid empty labels
    (fn as any).dash = {
      welcome: dict["dash.welcome"] || "Welcome,",
      logout: dict["nav.logout"] || "Logout",
      roadmap: dict["dash.roadmap"] || "Roadmap",
      checklist: dict["dash.checklist"] || "Checklist",
      docs: dict["dash.docs"] || "Documents",
      templates: dict["dash.templates"] || "Templates",
      simulator: dict["dash.simulator"] || "Visa Simulator",
      agency: dict["dash.agency"] || "Agency",
      gov: dict["dash.gov"] || "Gov Check",
      trainer: dict["dash.trainer"] || "Interview Coach",
      upload: dict["dash.upload"] || "Upload",
      translate: dict["dash.translate"] || "Translate",
      chat: dict["dash.chat"] || "AI Lawyer",
      messages: dict["dash.messages"] || "Messages",
      lawyer: dict["nav.lawyer"] || "Lawyer",
      research: dict["nav.research"] || "Research",
      submitToLawyer: dict["dash.submitToLawyer"] || "Submit to Lawyer",
      tabSwitched: dict["dash.tabSwitched"] || "Tab Switched",
      noActiveApp: dict["dash.noActiveApp"] || "No active application",
      submittedSuccess: dict["dash.submittedSuccess"] || "Application Submitted",
    };

    return fn;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, t, setLocale, lang: locale, setLang: setLocale }),
    [locale, t, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  const { t } = useI18n();
  return (key: string, params?: Record<string, string | number>) => (typeof t === 'function' ? t(key, params) : key);
}
