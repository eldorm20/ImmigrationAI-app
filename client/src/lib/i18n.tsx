import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "uz" | "en" | "ru";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}

const I18nContext = createContext<I18nContextType | null>(null);

const TRANSLATIONS = {
  uz: {
    brand: { name: "ImmigrationAI" },
    langNames: { en: "English", uz: "O'zbekcha", ru: "Русский", de: "Deutsch", fr: "Français", es: "Español" },
    roles: { user: "Foydalanuvchi", lawyer: "Yurist", applicant: "Arizachi", admin: "Admin" },
    common: { success: "Muvaffaq", error: "Xato", connected: "Ulangan", disconnected: "Uzilgan", date: "Sana", page: "Sahifa", of: "dan", previous: "Oldingisi", next: "Keyingi", view: "Ko'rish", actions: "Harakatlar", loading: "Yuklanmoqda...", submitting: "Yuborilmoqda...", submit: "Yuborish", cancel: "Bekor qilish", save: "Saqlash", delete: "O'chirish", edit: "Tahrirlash", close: "Yopish", back: "Orqaga", confirm: "Tasdiqlash", search: "Qidirish" },
    nav: { login: "Kirish", start: "Boshlash", features: "Xususiyatlar", pricing: "Narxlar", partner: "Hamkor", help: "Yordam" },
    hero: { title: "Visa Rad'i Xavfini 90% Kamaytiring.", sub: "O'zbek mutaxassislari uchun AI visa baholash. 2 daqiqada shaxsiy yo'riqnama.", cta: "Bepul Baholash", trusted: "10,000+ o'zbek foydalanuvchisiga ishonchi" },
    dash: { welcome: "Xush kelibsiz,", roadmap: "Reja", docs: "AI Hujjatlar", lawyer: "Yurist", chat: "AI Chat", logout: "Chiqish", upload: "Hujjatlar", translate: "Tarjima", research: "Tadqiqot", messages: "Xabarlar", employerVerification: "Ish beruvchi tekshiruvi", applications: "Arizalar", tabSwitched: "Tab almashtirildi", overview: "Umumiy ko'rinish", gov: "Gov Tekshiruvlari" },
    roadmap: { eligibility: "Muvofiqlik Baholash", collection: "Hujjatlar To'plash", translation: "Rasmiy Tarjima", submission: "Viza Arizasini Topshirish", nextStepLabel: "Keyingi Qadam:", completionLabel: "Tugallanish", applicationReference: "Ariza Referensi", starting: "Boshlanmoqda", defaults: { eligibilityDesc: "Muvaffaqiyatli baholandi", collectionDesc: "Passport, Diploma, TB test", translationDesc: "Notarial tasdiqlangan tarjima kerak", submissionDesc: "Rasmiy portaldan topshirish" } },
    dashStatus: { label: "Immigratsiya Holati:", active: "Faol" },
    tools: { gen: "Yaratish", dl: "Yuklash", typing: "AI yozmoqda...", chatP: "Viza haqida so'rang...", clear: "Tozalash", next: "Keyingi", nextStep: "Keyingi Qadam" },
    pricing: { title: "Rejangizni Tanlang", subtitle: "Bepul boshlang, o'sib borayotganingizda yangilang.", starter: "Boshlang'ich", professional: "Professional", enterprise: "Korporativ", free: "Bepul", forever: "doimiy", perMonth: "oyiga", contactUs: "bog'laning", getStarted: "Bepul Boshlash", startTrial: "Bepul Sinovni Boshlash", contactSales: "Sotuvga Murojaat", mostPopular: "Eng Mashhur", faq: "Tez-tez So'raladigan Savollar", changePlans: "Rejalarni o'zgartirishingiz mumkinmi?", changePlansA: "Ha! Istalgan vaqtda yangilashingiz mumkin.", paymentMethods: "To'lov usullari", paymentMethodsA: "Biz barcha kredit kartalarini qabul qilamiz.", freeTrial: "Bepul sinov bormi?", freeTrialA: "Ha! 14 kunlik bepul sinov.", refunds: "Pul qaytarish?", refundsA: "30 kunlik qaytarish kafolati." },
    features: { title: "Muvaffaqiyatga Erishish Uchun Barcha", subtitle: "AI vositalari, hujjat yordami, yurist konsultatsiyalari.", ready: "Boshlashga Tayyormisiz?", join: "Minglab foydalanuvchiga qo'shiling.", startTrial: "Bepul Boshlang" },
    research: { title: "Tadqiqot Kutubxonasi", subtitle: "Qonuniy resurslar, holatlar, rasmiy hujjatlar.", search: "Qidiruv...", allResources: "Barcha Resurslar", visaRequirements: "Viza Talablari", caseLaw: "Holatlar Qonuni", regulations: "Qoidalar", guides: "Qo'llanmalar", noResults: "Topilmadi", tryAdjusting: "Qidiruvni o'zgartiring", source: "Manba", download: "Yuklab olish" },
    upload: { title: "Hujjat Yuklash", dropFiles: "Fayllarni tashlang yoki bosing", supports: "PDF, DOC, DOCX, JPG, PNG (Maks. 10MB)", chooseFiles: "Fayllarni Tanlang", uploading: "Yuklanmoqda...", uploaded: "Yuklangan", analyzed: "Tahlil qilindi", view: "Ko'rish", delete: "O'chirish", uploadedSuccess: "Muvaffaq", uploadedDesc: "fayl(lar) muvaffaqiyatli yuklandi", deleted: "O'chirildi", deletedDesc: "Fayl o'chirildi" },
    translate: { title: "AI Tarjima", from: "Dan", to: "Ga", textToTranslate: "Matn", enterText: "Matn kiriting...", certified: "Sertifikatlangan tarjima (+$25)", translate: "Tarjima Qilish", translating: "Tarjima qilinmoqda...", result: "Natija", willAppear: "Shu yerda paydo bo'ladi...", swap: "Almashtirish", download: "Yuklab olish", complete: "Tugallandi", certifiedReady: "Sertifikatlangan tarjima tayyor", aiComplete: "AI tarjimasi tugallandi", downloaded: "Yuklab olindi", saved: "Saqlandi", error: "Xato", enterTextError: "Matn kiriting" },
    auth: { lawyerAccess: "Yurist Kirishi", applicantLogin: "Arizachi Kirishi", enterDetails: "Ma'lumotlaringizni kiriting.", email: "Email", password: "Parol", minChars: "Minimal 8 belgi", signIn: "Kirish", noAccount: "Hisobingiz yo'qmi?", register: "Ro'yxatdan O'tish", back: "Orqaga", firstName: "Ism", lastName: "Familiya", emailRequired: "Email talab qilinadi", passwordRequired: "Parol talab qilinadi", passwordTooShort: "Parol juda qisqa", invalidEmail: "Email noto'g'ri", accountType: "Hisobning Turi" },
    assessment: { title: "Bepul Visa Baholashi", subtitle: "5 daqiqali shaxsiy baholash", question: "Savol", answer: "Javob", complete: "Tugallandi", score: "Ballingiz", successRate: "Muvaffaqiyat ehtimoli", recommendations: "Tavsiyalar", viewReport: "To'liq Hisobotni Ko'rish", takeLater: "Keyinroq" },
    consultation: {
      title: "Maslahatlar",
      requestConsultation: "Maslahat So'rash",
      selectLawyer: "Yuristni Tanlang",
      preferredDateTime: "Afzal Sana va Vaqt",
      duration: "Davomiylik (daqiqa)",
      notes: "Eslatmalar",
      notesPlaceholder: "Maslahat talablaringizni ta'riflang...",
      submitRequest: "Jo'natish",
      cancel: "Bekor Qilish",
      joinVideoCall: "Video Chaqiruvga Qo'shilish",
      consultationChat: "Chat",
      noConsultations: "Maslahatlar yo'q",
      availableLawyers: "Mavjud Yuristlar",
      requestSubmitted: "So'rov jo'natildi",
      lawyerWillReview: "Yurist ko'rib chiqadi",
      newRequest: "Yangi So'rov",
      from: "dan",
      requestedTime: "So'ralgan Vaqt",
      status: "Holat",
      scheduled: "Rejalashtirilgan",
      completed: "Tugallandi",
      cancelled: "Bekor Qilindi",
      noShow: "Kelishmadi",
      missingInfo: "Iltimos barcha maydonlarni to'ldiring.",
      submitError: "So'rov yuborilmadi.",
      cancelError: "Bekor qilishda xato.",
    },
    subscription: { title: "Rejani Tanlang", selectPlan: "Rejani Tanlang", currentPlan: "Joriy Reja", upgrade: "Yangilash", downgrade: "Pasaytirish", upgradeYourPlan: "Rejangizni Yangilang", billingHistory: "Billing Tarixi", paymentMethod: "To'lov Usuli", cardEnding: "Karta tugamasi", updatePayment: "To'lovni Yangilang", cancelSubscription: "Bekor Qilish", renewalDate: "Qayta Yangilash", features: "Xususiyatlar", included: "Kirtirilgan", notIncluded: "Kirtirilmagan", unlimitedDocuments: "Cheksiz Hujjatlar", prioritySupport: "Prioritet Qo'llab-quvvatlash", advancedAnalytics: "Ilg'or Analitika", price: "Narx", billingCycle: "Siklusi", monthly: "Oyga", started: "Boshlandi", renews: "Yangilanadi", date: "Sana", amount: "Miqdor", status: "Holat", invoice: "Hisob-faktura", noBillingHistory: "Hali billing yo'q", download: "Yuklab olish" },
    lawyer: { title: "Yurist Panelidagi", applications: "Arizalar", consultations: "Maslahatlar", earnings: "Daromad", clients: "Mijozlar", messages: "Xabarlar", approveApplication: "Tasdiqlash", rejectApplication: "Rad Etish", viewDetails: "Tafsilotlarni Ko'rish", clientInfo: "Mijoz Ma'lumoti", applicationStatus: "Ariza Holati", nextSteps: "Keyingi Qadamlar", conversationHistory: "Suhbat Tarixi", activeApplications: "Faol Arizalar", revenue: "Tushum", pending: "Kutilmoqda", approved: "Tasdiqlangan", searchPlaceholder: "Qidirish..." },
    lawyerDashboard: { title: "Yurist Paneli", applications: "Arizalar", consultations: "Maslahatlar", status: "Holat", rev: "To'lov", active: "Faol", pending: "Kutilmoqda", approved: "Tasdiqlangan", quickActions: "Tezkor Harakatlar", aiTools: "AI Vositalari", caseTools: "Ish Vositalari", topPerformer: "Eng Yaxshi Natija", messageClient: "Mijozga Xabar", newConsultation: "Yangi Maslahat", uploadDoc: "Hujjat Yuklash", generateDoc: "Hujjat Yaratish", openChat: "Chatni Ochish", allApplications: "Barcha Arizalar", analytics: "Analitika", viewReport: "Hisobotni Ko'rish", revenueAnalytics: "Daromad Analitikasi", newThisWeek: "Bu Hafta Yangi", totalFees: "Jami To'lovlar", submitted: "Topshirildi", assignToMe: "Menga Berish", assigned: "Biriktirilgan", unassigned: "Biriktirilmagan" },
    terms: { title: "Foydalanish Shartlari", lastUpdated: "So'nggi yangilandi:", section1Title: "1. Shartlarga Rozilik", section1Body: "Ushbu xizmatdan foydalanish orqali siz shartlarga rozilik bildirasiz.", section2Title: "2. Foydalanish Litsenziyasi", section2Body: "Materiallarni faqat shaxsiy foydalanish uchun tushirishingiz mumkin.", section2Item1: "Xizmatlarni nur-mahan o'z foydasiga foydalaning", section2Item2: "Materiallarni tijoratiy maqsadda qayta sotmang", section2Item3: "Mantiqan intellektual mulk huquqlarini o'ziga olmang", section2Item4: "Xizmalarni boshqa xizmatlar uchun takror chiqarmang", section2Item5: "Barcha chiqishlar o'zaro qo'llanilsin", section3Title: "3. Rad etish", section3Body: "Materiallar 'borligi sifatida' taqdim etiladi.", section4Title: "4. Cheklovlar", section4Body: "Biz zarar uchun javobgar emas.", section5Title: "5. Aniqligi", section5Body: "Materiallarning to'liqligi kafolatlanmaydi.", section6Title: "6. O'zgartirishlar", section6Body: "Shartlarni istalgan vaqtda o'zgartirishimiz mumkin.", section7Title: "7. Qonunchilik", section7Body: "Ushbu shartlar applicable qonunlarga muvofiq.", section8Title: "8. Aloqa", section8Body: "Savollar uchun biz bilan bog'laning:" },
    settings: { title: "Sozlamalar", accountSettings: "Hisob Sozlamalari", editProfile: "Profilni Tahrirlash", cancel: "Bekor Qilish", save: "Saqlash", firstName: "Ism", lastName: "Familiya", emailAddress: "Email", emailCannotChange: "Email o'zgartirilmaydi", phoneNumber: "Telefon Raqami", phonePlaceholder: "+998 (90) 123-45-67", saveChanges: "Saqlash", saving: "Saqlanimoqda...", changePassword: "Parolni O'zgartirish", currentPassword: "Joriy Parol", newPassword: "Yangi Parol", confirmPassword: "Tasdiqlash", privacySecurity: "Xavfsizlik", notificationPreferences: "Bildirishnomalar", preferences: "Afzalliklari", language: "Til", fontSize: "Shrift Hajmi", passwordChanged: "Parol O'zgartirildi", passwordChangedDesc: "Muvaffaqiyatli o'zgartirildi", profileUpdated: "Profil Yangilandi", profileUpdatedDesc: "Muvaffaqiyatli yangilandi", updateFailed: "Muvaffaq bo'lmadi", passwordMismatch: "Parollar mos kelmaydi", theme: "Mavzu" },
    messaging: { title: "Xabarlar", connected: "Ulangan", disconnected: "Uzilgan", sendError: "Yuborilmadi", noConversations: "Suhbatlar yo'q", participant: "Ishtirokchi", noMessages: "Xabarlar yo'q", inputPlaceholder: "Xabar yozing...", sendHint: "Enter tugmasini bosing", selectConversation: "Suhbatni tanlang", send: "Yuborish", typing: "Yozmoqda..." },
    blog: { title: "Blog", subtitle: "Immigratsiya haqida maqolalar va maslahatlar", readMore: "Batafsil", category: "Kategoriya", author: "Muallif", date: "Sana", readTime: "O'qish vaqti", minutes: "daqiqa" },
    community: { title: "Jamiyat", telegramGroup: "Telegram Guruhi", telegramChannel: "Telegram Kanali", joinCommunity: "Qo'shilish", getHelp: "Yordam Olish", needHelp: "Yordam kerakmi?" },
    validation: { required: "Talab qilinadi", email: "Email noto'g'ri", minLength: "Juda qisqa", maxLength: "Juda uzun", match: "Mos kelmaydi" },
    error: { title: "Xato", message: "Nimadir xato ketdi", tryAgain: "Qayta urinib ko'ring", goBack: "Orqaga", notFound: "Topilmadi", unauthorized: "Ruxsat yo'q", forbidden: "Taqiqlangan" },
    success: { title: "Muvaffaq", message: "Amaliyot tugallandi", saved: "Saqlandi", created: "Yaratildi", updated: "Yangilandi", deleted: "O'chirildi" },
    gov: {
      title: "UK Gov Tekshiruvlari",
      desc: "Share Code orqali Ishlash Huquqi yoki Immigratsiya Holatingizni rasman tekshiring.",
      rtw: "Ishlash Huquqi",
      immigration: "Immigratsiya Holati",
      shareCode: "Share Code",
      shareCodeHint: "Share code odatda 9 ta belgidan iborat.",
      forename: "Ism",
      surname: "Familiya",
      dob: "Tug'ilgan sana",
      reason: "Tekshiruv sababi",
      runCheck: "Rasmiy tekshiruvni boshlash",
      processing: "Tekshirilmoqda...",
      noCheck: "Tekshiruv o'tkazilmagan",
      noCheckDesc: "Tekshiruvni boshlash uchun shaklni to'ldiring.",
      contacting: "UK Gov API bilan bog'lanilmoqda...",
      typicalWait: "Bu bir necha soniya vaqt olishi mumkin.",
      result: "Tekshiruv Natijasi",
      fullName: "To'liq Ism",
      expiry: "Amal qilish muddati",
      visaType: "Viza turi",
      conditions: "Yashash shartlari"
    }
  },

  en: {
    brand: { name: "ImmigrationAI" },
    langNames: { en: "English", uz: "O'zbek", ru: "Rusian", de: "Deutsch", fr: "Français", es: "Español" },
    roles: { user: "User", lawyer: "Lawyer", applicant: "Applicant", admin: "Admin" },
    common: { success: "Success", error: "Error", connected: "Connected", disconnected: "Disconnected", date: "Date", page: "Page", of: "of", previous: "Previous", next: "Next", view: "View", actions: "Actions" },
    nav: { login: "Sign In", start: "Get Started", features: "Features", pricing: "Pricing", partner: "Partner", help: "Help" },
    hero: { title: "Reduce Visa Rejection Risk by 90%.", sub: "AI-Powered Assessment & Documents for Uzbek Professionals. Get personalized guidance in 2 minutes.", cta: "Get Free Assessment", trusted: "Trusted by 10,000+ Uzbek users" },
    dash: { welcome: "Welcome,", roadmap: "Roadmap", docs: "AI Docs", lawyer: "Ask Lawyer", chat: "AI Chat", logout: "Log Out", upload: "Documents", translate: "Translation", research: "Research", messages: "Messages", gov: "Gov Checks" },
    roadmap: { eligibility: "Eligibility Assessment", collection: "Document Collection", translation: "Official Translation", submission: "Visa Application Submission", nextStepLabel: "Next Step:", completionLabel: "Completion", applicationReference: "Application Reference:", starting: "Starting", defaults: { eligibilityDesc: "Passed with 85 points", collectionDesc: "Passport, Degree, TB Test", translationDesc: "Notarized translations required", submissionDesc: "Home Office portal" } },
    dashStatus: { label: "Immigration Status:", active: "Active" },
    tools: { gen: "Generate", dl: "Download", typing: "AI Writing...", chatP: "Ask about visas...", clear: "Clear", next: "Next", nextStep: "Next Step" },
    pricing: { title: "Choose Your Plan", subtitle: "Start free, upgrade as you grow.", starter: "Starter", professional: "Professional", enterprise: "Enterprise", free: "Free", forever: "forever", perMonth: "per month", contactUs: "contact us", getStarted: "Get Started Free", startTrial: "Start Free Trial", contactSales: "Contact Sales", mostPopular: "Most Popular", faq: "Frequently Asked Questions", changePlans: "Can I change plans later?", changePlansA: "Yes! You can upgrade or cancel anytime.", paymentMethods: "Payment Methods", paymentMethodsA: "We accept all major credit cards, PayPal and bank transfers.", freeTrial: "Is there a free trial?", freeTrialA: "Yes! Professional plan includes 14-day free trial.", refunds: "Do you offer refunds?", refundsA: "We offer 30-day money-back guarantee." },
    features: { title: "Everything You Need to Succeed", subtitle: "AI tools, document assistance, lawyer consultations.", ready: "Ready to Get Started?", join: "Join thousands of users.", startTrial: "Start Free Trial" },
    research: { title: "Research Library", subtitle: "Legal resources, case studies, official documents.", search: "Search...", allResources: "All Resources", visaRequirements: "Visa Requirements", caseLaw: "Case Law", regulations: "Regulations", guides: "Guides", noResults: "Not found", tryAdjusting: "Try adjusting your search", source: "Source", download: "Download" },
    upload: { title: "Upload Documents", dropFiles: "Drop files here or click", supports: "PDF, DOC, DOCX, JPG, PNG (Max 10MB)", chooseFiles: "Choose Files", uploading: "Uploading...", uploaded: "Uploaded", analyzed: "Analyzed", view: "View", delete: "Delete", uploadedSuccess: "Success", uploadedDesc: "file(s) uploaded successfully", deleted: "Deleted", deletedDesc: "File deleted" },
    translate: { title: "AI Translation", from: "From", to: "To", textToTranslate: "Text", enterText: "Enter text...", certified: "Certified translation (+$25)", translate: "Translate", translating: "Translating...", result: "Result", willAppear: "Will appear here...", swap: "Swap", download: "Download", complete: "Completed", certifiedReady: "Certified translation ready", aiComplete: "AI translation completed", downloaded: "Downloaded", saved: "Saved", error: "Error", enterTextError: "Enter text" },
    auth: { lawyerAccess: "Lawyer Access", applicantLogin: "Applicant Login", enterDetails: "Enter your details.", email: "Email", password: "Password", minChars: "Min 8 characters", signIn: "Sign In", noAccount: "No account?", register: "Register", back: "Back", firstName: "First Name", lastName: "Last Name", emailRequired: "Email required", passwordRequired: "Password required", passwordTooShort: "Password too short", invalidEmail: "Invalid email", accountType: "Account Type" },
    assessment: { title: "Free Visa Assessment", subtitle: "5-minute personalized evaluation", question: "Question", answer: "Answer", complete: "Completed", score: "Your Score", successRate: "Success Rate", recommendations: "Recommendations", viewReport: "View Full Report", takeLater: "Take Later" },
    consultation: { title: "Consultations", requestConsultation: "Request Consultation", selectLawyer: "Select Lawyer", preferredDateTime: "Preferred Date & Time", duration: "Duration (minutes)", notes: "Notes", notesPlaceholder: "Describe your consultation needs...", submitRequest: "Submit", cancel: "Cancel", joinVideoCall: "Join Video Call", consultationChat: "Chat", noConsultations: "No consultations", availableLawyers: "Available Lawyers", requestSubmitted: "Request sent", lawyerWillReview: "Lawyer will review", newRequest: "New Request", from: "from", requestedTime: "Requested Time", status: "Status", scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", noShow: "No Show", missingInfo: "Please fill out all required fields.", submitError: "Failed to submit request.", cancelError: "Failed to cancel request." },
    subscription: { title: "Choose Your Plan", selectPlan: "Select Plan", currentPlan: "Current Plan", upgrade: "Upgrade", downgrade: "Downgrade", upgradeYourPlan: "Upgrade Your Plan", billingHistory: "Billing History", paymentMethod: "Payment Method", cardEnding: "Card ending in", updatePayment: "Update Payment", cancelSubscription: "Cancel", renewalDate: "Renewal Date", features: "Features", included: "Included", notIncluded: "Not Included", unlimitedDocuments: "Unlimited Documents", prioritySupport: "Priority Support", advancedAnalytics: "Advanced Analytics", price: "Price", billingCycle: "Cycle", monthly: "Monthly", started: "Started", renews: "Renews", date: "Date", amount: "Amount", status: "Status", invoice: "Invoice", noBillingHistory: "No history", download: "Download" },
    lawyer: { title: "Lawyer Dashboard", applications: "Applications", consultations: "Consultations", earnings: "Earnings", clients: "Clients", messages: "Messages", approveApplication: "Approve", rejectApplication: "Reject", viewDetails: "View Details", clientInfo: "Client Info", applicationStatus: "Status", nextSteps: "Next Steps", conversationHistory: "History", activeApplications: "Active", revenue: "Revenue", pending: "Pending", approved: "Approved", searchPlaceholder: "Search..." },
    lawyerDashboard: { title: "Lawyer Dashboard", applications: "Applications", consultations: "Consultations", status: "Status", rev: "Fee" },
    terms: { title: "Terms of Service", lastUpdated: "Last updated:", section1Title: "1. Agreement", section1Body: "By using this service, you agree to these terms.", section2Title: "2. License", section2Body: "You may download materials for personal use only.", section2Item1: "Use the services only for your personal benefit", section2Item2: "Do not resell or commercially exploit materials", section2Item3: "Do not claim intellectual property rights", section2Item4: "Do not reproduce services for other platforms", section2Item5: "Respect all applicable terms and conditions", section3Title: "3. Disclaimer", section3Body: "Materials provided as-is.", section4Title: "4. Limitations", section4Body: "We not liable for damages.", section5Title: "5. Accuracy", section5Body: "We not guarantee material accuracy.", section6Title: "6. Changes", section6Body: "We may change terms anytime.", section7Title: "7. Governing Law", section7Body: "These terms governed by applicable law.", section8Title: "8. Contact", section8Body: "Contact us for questions:" },
    settings: { title: "Settings", accountSettings: "Account Settings", editProfile: "Edit Profile", cancel: "Cancel", save: "Save", firstName: "First Name", lastName: "Last Name", emailAddress: "Email", emailCannotChange: "Email cannot be changed", phoneNumber: "Phone Number", phonePlaceholder: "+1 (555) 000-0000", saveChanges: "Save", saving: "Saving...", changePassword: "Change Password", currentPassword: "Current Password", newPassword: "New Password", confirmPassword: "Confirm", privacySecurity: "Security", notificationPreferences: "Notifications", preferences: "Preferences", language: "Language", fontSize: "Font Size", passwordChanged: "Password Changed", passwordChangedDesc: "Changed successfully", profileUpdated: "Profile Updated", profileUpdatedDesc: "Updated successfully", updateFailed: "Update failed", passwordMismatch: "Passwords don't match", theme: "Theme" },
    messaging: { title: "Messages", connected: "Connected", disconnected: "Disconnected", sendError: "Send failed", noConversations: "No conversations", participant: "Participant", noMessages: "No messages", inputPlaceholder: "Type message...", sendHint: "Press Enter", selectConversation: "Select conversation", send: "Send", typing: "Typing..." },
    blog: { title: "Blog", subtitle: "Articles and tips about immigration", readMore: "Read More", category: "Category", author: "Author", date: "Date", readTime: "Read time", minutes: "min" },
    community: { title: "Community", telegramGroup: "Telegram Group", telegramChannel: "Telegram Channel", joinCommunity: "Join", getHelp: "Get Help", needHelp: "Need help?" },
    validation: { required: "Required", email: "Invalid email", minLength: "Too short", maxLength: "Too long", match: "Don't match" },
    error: { title: "Error", message: "Something went wrong", tryAgain: "Try again", goBack: "Go back", notFound: "Not found", unauthorized: "Unauthorized", forbidden: "Forbidden" },
    success: { title: "Success", message: "Operation completed", saved: "Saved", created: "Created", updated: "Updated", deleted: "Deleted" },
    gov: {
      title: "UK Gov Checks",
      desc: "Verify your Right to Work or Immigration Status directly using your Share Code.",
      rtw: "Right to Work",
      immigration: "Immigration Status",
      shareCode: "Share Code",
      shareCodeHint: "Share codes are usually 9 characters long.",
      forename: "Forename",
      surname: "Surname",
      dob: "Date of Birth",
      reason: "Check Reason",
      runCheck: "Run Official Check",
      processing: "Processing...",
      noCheck: "No Check Performed",
      noCheckDesc: "Fill in the form to start a verification.",
      contacting: "Contacting UK Gov API...",
      typicalWait: "This may take a few seconds.",
      result: "Check Result",
      fullName: "Full Name",
      expiry: "Valid Until",
      visaType: "Visa Type",
      conditions: "Conditions of Stay"
    }
  },

  ru: {
    brand: { name: "ImmigrationAI" },
    langNames: { en: "English", uz: "O'zbek", ru: "Русский", de: "Deutsch", fr: "Français", es: "Español" },
    roles: { user: "Пользователь", lawyer: "Юрист", applicant: "Заявитель", admin: "Админ" },
    common: { success: "Успешно", error: "Ошибка", connected: "Подключено", disconnected: "Отключено", date: "Дата", page: "Страница", of: "из", previous: "Назад", next: "Далее", view: "Просмотр", actions: "Действия" },
    nav: { login: "Войти", start: "Начать", features: "Возможности", pricing: "Цены", partner: "Партнер", help: "Помощь" },
    hero: { title: "Снизьте риск отказа на 90%.", sub: "AI-оценка и документы для узбеков. Персональная консультация за 2 минуты.", cta: "Получить оценку", trusted: "Доверяют 10,000+ узбеков" },
    dash: { welcome: "Привет,", roadmap: "План", docs: "Документы", lawyer: "Юрист", chat: "Чат", logout: "Выход", upload: "Документы", translate: "Перевод", research: "Исследования", messages: "Сообщения", gov: "Гос. Проверки" },
    roadmap: { eligibility: "Оценка", collection: "Сбор документов", translation: "Официальный перевод", submission: "Подача заявки", nextStepLabel: "Следующий шаг:", completionLabel: "Завершение", applicationReference: "Ссылка на заявку:", starting: "Запуск", defaults: { eligibilityDesc: "Успешно", collectionDesc: "Паспорт, диплом, тест TB", translationDesc: "Нужен нотариально заверенный перевод", submissionDesc: "Подача через портал" } },
    dashStatus: { label: "Статус иммиграции:", active: "Активен" },
    tools: { gen: "Создать", dl: "Скачать", typing: "Пишет...", chatP: "Спросить о визе...", clear: "Очистить", next: "Далее", nextStep: "Следующий шаг" },
    pricing: { title: "Выберите план", subtitle: "Начните бесплатно, обновляйтесь по мере роста.", starter: "Стартовый", professional: "Профессиональный", enterprise: "Корпоративный", free: "Бесплатно", forever: "навсегда", perMonth: "в месяц", contactUs: "связаться", getStarted: "Начать бесплатно", startTrial: "Бесплатная пробная версия", contactSales: "Свяжитесь с отделом продаж", mostPopular: "Популярный", faq: "Часто задаваемые вопросы", changePlans: "Могу ли я изменить план?", changePlansA: "Да! Можете обновить или отменить в любое время.", paymentMethods: "Способы оплаты", paymentMethodsA: "Принимаем карты, PayPal и переводы.", freeTrial: "Есть ли пробная версия?", freeTrialA: "Да! 14-дневная бесплатная пробная версия.", refunds: "Возвраты?", refundsA: "30-дневная гарантия возврата денег." },
    features: { title: "Все что нужно", subtitle: "Инструменты ИИ, помощь с документами, консультации.", ready: "Готовы начать?", join: "Присоединитесь к тысячам.", startTrial: "Начать пробу" },
    research: { title: "Библиотека", subtitle: "Законные ресурсы, дела, документы.", search: "Поиск...", allResources: "Все", visaRequirements: "Требования", caseLaw: "Прецеденты", regulations: "Правила", guides: "Гайды", noResults: "Не найдено", tryAdjusting: "Попробуйте другой поиск", source: "Источник", download: "Скачать" },
    upload: { title: "Загрузка", dropFiles: "Перетащите или нажмите", supports: "PDF, DOC, DOCX, JPG, PNG (Макс 10MB)", chooseFiles: "Выбрать", uploading: "Загрузка...", uploaded: "Загружено", analyzed: "Проанализировано", view: "Просмотр", delete: "Удалить", uploadedSuccess: "Успешно", uploadedDesc: "файл(ы) загружены", deleted: "Удалено", deletedDesc: "Файл удален" },
    translate: { title: "Перевод", from: "С", to: "На", textToTranslate: "Текст", enterText: "Введите текст...", certified: "Сертифицированный (+$25)", translate: "Перевести", translating: "Переводится...", result: "Результат", willAppear: "Появится здесь...", swap: "Поменять", download: "Скачать", complete: "Завершено", certifiedReady: "Готово к скачиванию", aiComplete: "Перевод завершен", downloaded: "Скачано", saved: "Сохранено", error: "Ошибка", enterTextError: "Введите текст" },
    auth: { lawyerAccess: "Вход юриста", applicantLogin: "Вход заявителя", enterDetails: "Введите данные.", email: "Email", password: "Пароль", minChars: "Мин 8 символов", signIn: "Войти", noAccount: "Нет аккаунта?", register: "Регистрация", back: "Назад", firstName: "Имя", lastName: "Фамилия", emailRequired: "Email требуется", passwordRequired: "Пароль требуется", passwordTooShort: "Пароль короткий", invalidEmail: "Неверный email", accountType: "Тип аккаунта" },
    assessment: { title: "Бесплатная оценка", subtitle: "5-минутная оценка", question: "Вопрос", answer: "Ответ", complete: "Завершено", score: "Ваш результат", successRate: "Вероятность успеха", recommendations: "Рекомендации", viewReport: "Полный отчет", takeLater: "Позже" },
    consultation: { title: "Консультации", requestConsultation: "Запросить", selectLawyer: "Выбрать юриста", preferredDateTime: "Дата и время", duration: "Продолжительность (минуты)", notes: "Заметки", notesPlaceholder: "Опишите ваши потребности для консультации...", submitRequest: "Отправить", cancel: "Отмена", joinVideoCall: "Присоединиться", consultationChat: "Чат", noConsultations: "Нет консультаций", availableLawyers: "Доступные", requestSubmitted: "Отправлено", lawyerWillReview: "Юрист рассмотрит", newRequest: "Новый запрос", from: "от", requestedTime: "Время", status: "Статус", scheduled: "Запланировано", completed: "Завершено", cancelled: "Отменено", noShow: "Не пришел", missingInfo: "Пожалуйста, заполните все обязательные поля.", submitError: "Не удалось отправить запрос.", cancelError: "Не удалось отменить запрос." },
    subscription: { title: "Выберите план", selectPlan: "Выберите", currentPlan: "Текущий план", upgrade: "Обновить", downgrade: "Понизить", upgradeYourPlan: "Обновите план", billingHistory: "История", paymentMethod: "Способ оплаты", cardEnding: "Карта заканчивается на", updatePayment: "Обновить", cancelSubscription: "Отменить", renewalDate: "Дата продления", features: "Функции", included: "Включено", notIncluded: "Не включено", unlimitedDocuments: "Бесплатные документы", prioritySupport: "Приоритет", advancedAnalytics: "Аналитика", price: "Цена", billingCycle: "Цикл", monthly: "Месячно", started: "Начало", renews: "Продление", date: "Дата", amount: "Сумма", status: "Статус", invoice: "Счет", noBillingHistory: "Нет истории", download: "Скачать" },
    lawyer: { title: "Панель юриста", applications: "Заявки", consultations: "Консультации", earnings: "Доход", clients: "Клиенты", messages: "Сообщения", approveApplication: "Одобрить", rejectApplication: "Отклонить", viewDetails: "Детали", clientInfo: "Информация", applicationStatus: "Статус", nextSteps: "Следующие шаги", conversationHistory: "История", activeApplications: "Активные", revenue: "Доход", pending: "Ожидание", approved: "Одобрено", searchPlaceholder: "Поиск..." },
    lawyerDashboard: { title: "Панель юриста", applications: "Заявки", consultations: "Консультации", status: "Статус", rev: "Гонорар" },
    terms: { title: "Условия", lastUpdated: "Последнее обновление:", section1Title: "1. Согласие", section1Body: "Используя сервис, вы согласны с условиями.", section2Title: "2. Лицензия", section2Body: "Материалы только для личного использования.", section2Item1: "Используйте сервис только для собственного пользования", section2Item2: "Не перепродавайте и не используйте в коммерческих целях", section2Item3: "Не претендуйте на права интеллектуальной собственности", section2Item4: "Не воспроизводите сервис на других платформах", section2Item5: "Соблюдайте все применимые условия и ограничения", section3Title: "3. Отказ", section3Body: "Материалы как есть.", section4Title: "4. Ограничения", section4Body: "Мы не отвечаем за убытки.", section5Title: "5. Точность", section5Body: "Мы не гарантируем точность.", section6Title: "6. Изменения", section6Body: "Мы можем изменять условия.", section7Title: "7. Закон", section7Body: "Условия по применимому закону.", section8Title: "8. Контакты", section8Body: "Свяжитесь с нами:" },
    settings: { title: "Настройки", accountSettings: "Аккаунт", editProfile: "Профиль", cancel: "Отмена", save: "Сохранить", firstName: "Имя", lastName: "Фамилия", emailAddress: "Email", emailCannotChange: "Email нельзя менять", phoneNumber: "Телефон", phonePlaceholder: "+7 (900) 123-45-67", saveChanges: "Сохранить", saving: "Сохранение...", changePassword: "Пароль", currentPassword: "Текущий", newPassword: "Новый", confirmPassword: "Подтвердить", privacySecurity: "Безопасность", notificationPreferences: "Уведомления", preferences: "Предпочтения", language: "Язык", fontSize: "Размер шрифта", passwordChanged: "Пароль изменен", passwordChangedDesc: "Успешно изменен", profileUpdated: "Профиль обновлен", profileUpdatedDesc: "Успешно обновлен", updateFailed: "Ошибка обновления", passwordMismatch: "Пароли не совпадают", theme: "Тема" },
    messaging: { title: "Сообщения", connected: "Подключено", disconnected: "Отключено", sendError: "Ошибка отправки", noConversations: "Нет диалогов", participant: "Участник", noMessages: "Нет сообщений", inputPlaceholder: "Напишите...", sendHint: "Enter для отправки", selectConversation: "Выберите диалог", send: "Отправить", typing: "Пишет..." },
    blog: { title: "Блог", subtitle: "Статьи и советы по иммиграции", readMore: "Подробнее", category: "Категория", author: "Автор", date: "Дата", readTime: "Время чтения", minutes: "мин" },
    community: { title: "Сообщество", telegramGroup: "Группа Telegram", telegramChannel: "Канал Telegram", joinCommunity: "Присоединиться", getHelp: "Помощь", needHelp: "Нужна помощь?" },
    validation: { required: "Обязательно", email: "Неверный email", minLength: "Слишком коротко", maxLength: "Слишком длинно", match: "Не совпадают" },
    error: { title: "Ошибка", message: "Что-то пошло не так", tryAgain: "Попробуйте снова", goBack: "Назад", notFound: "Не найдено", unauthorized: "Не авторизовано", forbidden: "Доступ запрещен" },
    success: { title: "Успешно", message: "Операция завершена", saved: "Сохранено", created: "Создано", updated: "Обновлено", deleted: "Удалено" },
    gov: {
      title: "Гос. Проверки Великобритании",
      desc: "Проверьте свое право на работу или иммиграционный статус официально через Share Code.",
      rtw: "Право на работу",
      immigration: "Иммиграционный Статус",
      shareCode: "Share Code",
      shareCodeHint: "Share code обычно состоит из 9 символов.",
      forename: "Имя",
      surname: "Фамилия",
      dob: "Дата рождения",
      reason: "Причина проверки",
      runCheck: "Запустить официальную проверку",
      processing: "Обработка...",
      noCheck: "Проверка не проводилась",
      noCheckDesc: "Заполните форму, чтобы начать проверку.",
      contacting: "Связь с UK Gov API...",
      typicalWait: "Это может занять несколько секунд.",
      result: "Результат Проверки",
      fullName: "Полное Имя",
      expiry: "Действителен до",
      visaType: "Тип визы",
      conditions: "Условия пребывания"
    }
  },
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<Language>("uz");

  useEffect(() => {
    const saved = localStorage.getItem("iai_lang") as Language;
    if (saved && ["uz", "en", "ru"].includes(saved)) {
      setLangState(saved);
    } else {
      setLangState("uz");
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("iai_lang", l);
  };

  const t = TRANSLATIONS[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
