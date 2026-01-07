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




    // upload
    "upload.title": "Upload Documents",
    "upload.dropFiles": "Drop files here or click to upload",
    "upload.supports": "Supports PDF, DOCX, JPG, PNG (Max 10MB)",
    "upload.chooseFiles": "Choose Files",
    "upload.uploading": "Uploading...",
    "upload.uploadedSuccess": "Upload Successful",
    "upload.uploadedDesc": "files uploaded successfully",
    "upload.sizeLimit": "exceeds size limit (10MB)",
    "upload.tooLarge": "File too large",
    "upload.error": "Upload Error",
    "upload.uploaded": "Uploaded Documents",
    "upload.analyzed": "Analyzed",
    "upload.scanning": "Scanning...",
    "upload.ocr": "OCR Scan",
    "upload.ocrDesc": "Extract text from images/scans",
    "upload.unsupported": "Unsupported File Type",
    "upload.ocrComplete": "OCR Completed",
    "upload.ocrSuccess": "Text extracted successfully",
    "upload.ocrFail": "OCR Failed",
    "upload.ocrError": "Could not extract text",
    "upload.summarize": "Summarize",
    "upload.summaryFail": "Summary Failed",
    "upload.summaryError": "Could not generate summary",
    "upload.view": "View",
    "upload.delete": "Delete",
    "upload.deleted": "Deleted",
    "upload.deletedDesc": "File deleted successfully",
    "upload.deleteError": "Delete Failed",
    "upload.extracted": "Extracted Text",
    "upload.copyText": "Copy Text",
    "upload.copied": "Copied",
    "upload.copiedDesc": "Text copied to clipboard",

    // translate
    "translate.title": "Document Translator",
    "translate.aiComplete": "AI-Powered Translation",
    "translate.error": "Translation Error",
    "translate.enterTextError": "Please enter text to translate",
    "translate.complete": "Translation Complete",
    "translate.certifiedReady": "Certified Translation Ready",
    "translate.downloaded": "Downloaded",
    "translate.saved": "Translation saved to file",
    "translate.from": "From",
    "translate.to": "To",
    "translate.textToTranslate": "Text to translate",
    "translate.enterText": "Enter or paste text here...",
    "translate.certified": "Certified Mode",
    "translate.translating": "Translating...",
    "translate.translate": "Translate",
    "translate.result": "Translation Result",
    "translate.certifiedLabel": "Certified",
    "translate.willAppear": "Translation will appear here",
    "translate.swap": "Swap Languages",
    "translate.download": "Download",

    // docs
    "docs.title": "AI Document Generator",
    "docs.gen": "Generate",
    "docs.genSuccess": "Generation Successful",
    "docs.genError": "Generation Failed",
    "docs.tooShort": "Content too short",
    "docs.tooShortDesc": "Please provide more content to review",
    "docs.reviewFail": "Review Failed",
    "docs.score": "Quality Score",
    "docs.observations": "Key Observations",
    "docs.findings": "Issues & Improvements",
    "docs.proposals": "Proposed Edits",
    "docs.analyzedContent": "Analyzed Content",
    "docs.analyzing": "Analyzing Document...",
    "docs.analyzingDesc": "Our AI is reviewing your document for legal compliance and clarity.",
    "docs.readyReview": "Ready to Review",
    "docs.readyReviewDesc": "Paste your document content or generate a new one to get instant AI feedback.",
    "docs.fillRequired": "Please fill in all required fields",
    "docs.fillForm": "Fill out the form to generate your document",
    "docs.fullName": "Full Name",
    "docs.role": "Target Role",
    "docs.company": "Target Company",
    "docs.experience": "Years of Experience",
    "docs.education": "Education",
    "docs.skills": "Key Skills",
    "docs.achievements": "Key Achievements",
    "docs.docType": "Document Type",
    "docs.motivation": "Motivation Letter",
    "docs.cv": "CV Enhancement",
    "docs.reference": "Reference Letter",
    "docs.student_visa": "Student Visa App",
    "docs.tourist_visa": "Tourist Visa App",
    "docs.generic": "General Letter",
    "docs.print": "Print / Save PDF",

    // tools
    "tools.gen": "Generate",
    "tools.typing": "Generating...",
    "tools.clear": "Clear",

    // review
    "review.title": "AI Review",
    "review.desc": "Paste content to review...",
    "review.reviewing": "Reviewing...",
    "review.check": "Check Document",

    // analytics
    "analytics.summary": "Document Summary",

    // tools
    "tools.chatP": "Type your message...",

    // chat
    "chat.greeting": "Hello! How can I help you with your immigration questions?",
    "chat.error": "I encountered an error. Please try again.",
    "chat.clearConfirm": "Are you sure you want to clear the chat history?",
    "chat.historyCleared": "Chat history cleared.",
    "chat.cleared": "Cleared",
    "chat.clearedDesc": "Chat history has been reset.",
    "chat.assistant": "AI Assistant",
    "chat.export": "Export PDF",
    "chat.clear": "Clear Chat",
    "chat.inputHint": "Press Enter to send",

    // roadmap
    "roadmap.assessment": "Assessment",
    "roadmap.simulator": "Visa Simulator",
    "roadmap.documents": "Documents",
    "roadmap.aiReview": "AI Review",
    "roadmap.govChecks": "Gov Checks",
    "roadmap.interviewCoach": "Interview Coach",
    "roadmap.lawyerReview": "Lawyer Review",
    "roadmap.submission": "Submission",

    // roadmap descriptions
    "roadmap.desc.assessment": "Initial profile assessment and eligibility scoring.",
    "roadmap.desc.simulator": "AI-powered probability check for visa success.",
    "roadmap.desc.documents": "Collection and preliminary upload of required documentation.",
    "roadmap.desc.aiReview": "Automated analysis of uploaded documents for compliance.",
    "roadmap.desc.govChecks": "Identity and background verification against government databases.",
    "roadmap.desc.interviewCoach": "AI-guided training sessions for embassy or consulate interviews.",
    "roadmap.desc.lawyerReview": "Final case verification and authorization by immigration counsel.",
    "roadmap.desc.submission": "Official submission to immigration authorities.",
    "lawyer.financials.title": "Financial Control",
    "lawyer.financials.description": "Manage client billing, payments and fiscal reports.",
    "lawyer.financials.stats.totalPaid": "Total Paid",
    "lawyer.financials.stats.pending": "Pending",
    "lawyer.financials.stats.overdue": "Overdue",
    "lawyer.financials.stats.active": "Active Invoices",
    "lawyer.financials.form.title": "Issue New Invoice",
    "lawyer.financials.form.client": "Selection Portfolio",
    "lawyer.financials.form.number": "Invoice Reference",
    "lawyer.financials.form.notes": "Fiscal Notes",
    "lawyer.financials.form.summary": "Financial Summary",
    "lawyer.financials.form.create": "Generate & Dispatch",
    "lawyer.financials.table.invoice": "Reference",
    "lawyer.financials.table.client": "Entity",
    "lawyer.financials.table.date": "Issue Date",
    "lawyer.financials.table.amount": "Balance",
    "lawyer.financials.table.status": "Fiscal Status",
    "lawyer.financials.table.actions": "Control",
    "dashStatus.submitted_to_gov": "Official Government Submission",
    "dash.submission": "Submission",
    "lawyer.templates.title": "Strategy Bank",
    "lawyer.templates.subtitle": "Standardized templates and legal protocols",
    "lawyer.templates.search": "Search institutional archives...",
    "lawyer.templates.publish": "Publish Template",
    "lawyer.templates.empty": "Archive Empty",
    "lawyer.leads.title": "Client Inquiries",
    "lawyer.leads.subtitle": "Track and manage potential clients",
    "lawyer.leads.add": "Register Lead",
    "lawyer.leads.sync": "Syncing infrastructure...",
    "lawyer.leads.search": "Search inquiries...",
    "lawyer.leads.filter": "Refine",
    "lawyer.leads.empty": "No active inquiries",
    "lawyer.leads.promote": "Advance Case",
    "lawyer.leads.register": "Intake Protocol",
    "lawyer.leads.capture": "Initial Client Ingestion",
    "lawyer.leads.stages.all": "Global View",
    "lawyer.leads.stages.inquiry": "New Inquiry",
    "lawyer.leads.stages.new": "New Inquiry",
    "lawyer.leads.stages.contacted": "Contacted",
    "lawyer.leads.stages.consultation_scheduled": "Consultation",
    "lawyer.leads.stages.proposal_sent": "Proposal",
    "lawyer.leads.stages.converted": "Converted",
    "lawyer.leads.stages.lost": "Archived",
    "lawyer.leads.stats.potential": "Portfolio Value",
    "lawyer.leads.table.client": "Identity",
    "lawyer.leads.table.contact": "Communications",
    "lawyer.leads.table.objective": "Strategy",
    "lawyer.leads.table.stage": "Status",
    "lawyer.leads.table.value": "Valuation",
    "lawyer.leads.table.action": "Command",
    "lawyer.leads.form.firstName": "Given Name",
    "lawyer.leads.form.lastName": "Surname",
    "lawyer.leads.form.email": "Electronic Mail",
    "lawyer.leads.form.visa": "Strategic Objective",
    "lawyer.leads.form.val": "Expected Valuation",
    "lawyer.leads.form.source": "Origin Channel",
    "lawyer.leads.form.discard": "Abort",
    "lawyer.leads.form.deploy": "Deploy to Pipeline",
    "lawyer.clientsHub.title": "Practice Portfolio",
    "lawyer.clientsHub.subtitle": "Institutional client management bank",
    "lawyer.clientsHub.register": "Onboard Principal",
    "lawyer.clientsHub.totalNetwork": "Universal Network",
    "lawyer.clientsHub.activeMandates": "Active Mandates",
    "lawyer.clientsHub.potentialValue": "Pipeline Velocity",
    "lawyer.clientsHub.practiceRevenue": "AUM Revenue",
    "lawyer.clientsHub.search": "Search portfolio archives...",
    "lawyer.clientsHub.table.identity": "Principal Identity",
    "lawyer.clientsHub.table.contact": "Channel Status",
    "lawyer.clientsHub.table.engagement": "Engagement Level",
    "lawyer.clientsHub.table.acquisition": "Origin Protocol",
    "lawyer.clientsHub.table.lastSync": "Temporal Sync",
    "lawyer.clientsHub.actions.copy": "Copy Identity Reference",
    "lawyer.clientsHub.actions.profile": "Executive Profile",
    "lawyer.clientsHub.actions.file": "Dossier Access",
    "lawyer.clientsHub.actions.msg": "Encrypted Uplink",
    "lawyer.clientsHub.newClient": "Register Principal",
    "lawyer.clientsHub.addDesc": "Initialize new client record in institutional bank",
    "lawyer.clientsHub.loading": "Accessing archives...",
    "lawyer.clientsHub.empty": "Portfolio empty",
    "subscription.price": "Rate",
    "subscription.billingCycle": "Billing Frequency",
    "subscription.started": "Activation Date",
    "subscription.renewal": "Next Ledger Cycle",
    "subscription.upgradeYourPlan": "Enhance Institutional Capacity",
    "subscription.mostPopular": "Primary Choice",
    "subscription.currentPlan": "Active Protocol",
    "subscription.upgrade": "Execute Upgrade",
    "subscription.billingHistory": "Temporal Ledger",
    "subscription.noBillingHistory": "No historical transactions discovered",
    "subscription.date": "Temporal Stamp",
    "subscription.amount": "Quantum",
    "subscription.status": "Execution Status",
    "subscription.invoice": "Reference",
    "subscription.download": "Archive Export",
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

    // upload
    "upload.title": "Hujjatlarni yuklash",
    "upload.dropFiles": "Fayllarni bu yerga tashlang yoki yuklash uchun bosing",
    "upload.supports": "PDF, DOCX, JPG, PNG formatlarini qo'llab-quvvatlaydi (Maks 10MB)",
    "upload.chooseFiles": "Fayllarni tanlash",
    "upload.uploading": "Yuklanmoqda...",
    "upload.uploadedSuccess": "Yuklash muvaffaqiyatli",
    "upload.uploadedDesc": "fayllar muvaffaqiyatli yuklandi",
    "upload.sizeLimit": "hajm chegarasidan oshdi (10MB)",
    "upload.tooLarge": "Fayl juda katta",
    "upload.error": "Yuklash xatosi",
    "upload.uploaded": "Yuklangan hujjatlar",
    "upload.analyzed": "Tahlil qilingan",
    "upload.scanning": "Skanerlanmoqda...",
    "upload.ocr": "OCR Skan",
    "upload.ocrDesc": "Rasm/skanerdan matnni ajratib olish",
    "upload.unsupported": "Qo'llab-quvvatlanmaydigan fayl turi",
    "upload.ocrComplete": "OCR yakunlandi",
    "upload.ocrSuccess": "Matn muvaffaqiyatli ajratib olindi",
    "upload.ocrFail": "OCR xatosi",
    "upload.ocrError": "Matnni ajratib olib bo'lmadi",
    "upload.summarize": "Xulosa qilish",
    "upload.summaryFail": "Xulosa xatosi",
    "upload.summaryError": "Xulosa yaratib bo'lmadi",
    "upload.view": "Ko'rish",
    "upload.delete": "O'chirish",
    "upload.deleted": "O'chirildi",
    "upload.deletedDesc": "Fayl muvaffaqiyatli o'chirildi",
    "upload.deleteError": "O'chirish xatosi",
    "upload.extracted": "Ajratib olingan matn",
    "upload.copyText": "Matnni nusxalash",
    "upload.copied": "Nusxalandi",
    "upload.copiedDesc": "Matn buferga nusxalandi",

    // translate
    "translate.title": "Hujjat Tarjimoni",
    "translate.aiComplete": "AI orqali tarjima",
    "translate.error": "Tarjima xatosi",
    "translate.enterTextError": "Tarjima qilish uchun matn kiriting",
    "translate.complete": "Tarjima yakunlandi",
    "translate.certifiedReady": "Tasdiqlangan tarjima tayyor",
    "translate.downloaded": "Yuklab olindi",
    "translate.saved": "Tarjima faylga saqlandi",
    "translate.from": "Qayerdan",
    "translate.to": "Qayerga",
    "translate.textToTranslate": "Tarjima matni",
    "translate.enterText": "Matnni kiriting yoki joylashtiring...",
    "translate.certified": "Tasdiqlangan rejim",
    "translate.translating": "Tarjima qilinmoqda...",
    "translate.translate": "Tarjima qilish",
    "translate.result": "Tarjima natijasi",
    "translate.certifiedLabel": "Tasdiqlangan",
    "translate.willAppear": "Tarjima shu yerda paydo bo'ladi",
    "translate.swap": "Tillarni almashtirish",
    "translate.download": "Yuklab olish",

    // docs
    "docs.title": "AI Hujjat Yaratuvchi",
    "docs.gen": "Yaratish",
    "docs.genSuccess": "Yaratish muvaffaqiyatli",
    "docs.genError": "Yaratish xatosi",
    "docs.tooShort": "Matn juda qisqa",
    "docs.tooShortDesc": "Iltimos, ko'rib chiqish uchun ko'proq ma'lumot bering",
    "docs.reviewFail": "Ko'rib chiqish xatosi",
    "docs.score": "Sifat darajasi",
    "docs.observations": "Asosiy kuzatishlar",
    "docs.findings": "Muammolar va yaxshilanishlar",
    "docs.proposals": "Taklif qilingan o'zgartirishlar",
    "docs.analyzedContent": "Tahlil qilingan tarkib",
    "docs.analyzing": "Hujjat tahlil qilinmoqda...",
    "docs.analyzingDesc": "Bizning AI hujjatingizni qonuniy muvofiqlik va aniqlik bo'yicha tekshirmoqda.",
    "docs.readyReview": "Ko'rib chiqishga tayyor",
    "docs.readyReviewDesc": "Hujjat matnini joylashtiring yoki AI fikrini olish uchun yangi yarating.",
    "docs.fillRequired": "Barcha majburiy maydonlarni to'ldiring",
    "docs.fillForm": "Hujjat yaratish uchun shaklni to'ldiring",
    "docs.fullName": "To'liq ism",
    "docs.role": "Maqsadli lavozim",
    "docs.company": "Kompaniya",
    "docs.experience": "Tajriba (yil)",
    "docs.education": "Ta'lim",
    "docs.skills": "Ko'nikmalar",
    "docs.achievements": "Yutuqlar",
    "docs.docType": "Hujjat turi",
    "docs.motivation": "Motivatsion xat",
    "docs.cv": "CV (Rezyume)",
    "docs.reference": "Tavsiyanoma",
    "docs.student_visa": "Talaba Vizasi",
    "docs.tourist_visa": "Turist Vizasi",
    "docs.generic": "Umumiy xat",
    "docs.print": "Chop etish / PDF saqlash",

    // tools
    "tools.gen": "Yaratish",
    "tools.typing": "Yaratilmoqda...",
    "tools.clear": "Tozalash",

    // review
    "review.title": "AI Tekshiruv",
    "review.desc": "Tekshirish uchun matnni joylashtiring...",
    "review.reviewing": "Tekshirilmoqda...",
    "review.check": "Hujjatni tekshirish",

    // analytics
    "analytics.summary": "Hujjat xulosasi",

    // tools
    "tools.chatP": "Xabaringizni yozing...",

    // chat
    "chat.greeting": "Salom! Immigratsiya bo'yicha savollaringizga qanday yordam bera olaman?",
    "chat.error": "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    "chat.clearConfirm": "Chat tarixini tozalashni xohlaysizmi?",
    "chat.historyCleared": "Chat tarixi tozalandi.",
    "chat.cleared": "Tozalandi",
    "chat.clearedDesc": "Chat tarixi qayta tiklandi.",
    "chat.assistant": "AI Yordamchi",
    "chat.export": "PDF Eksport",
    "chat.clear": "Chatni tozalash",
    "chat.inputHint": "Yuborish uchun Enterni bosing",

    // roadmap
    "roadmap.assessment": "Baholash",
    "roadmap.simulator": "Viza Simulyatori",
    "roadmap.documents": "Hujjatlar",
    "roadmap.aiReview": "AI Tekshiruvi",
    "roadmap.govChecks": "Davlat Tekshiruvi",
    "roadmap.interviewCoach": "Intervyu Murabbiyi",
    "roadmap.lawyerReview": "Yurist Tekshiruvi",
    "roadmap.submission": "Yuborish",

    // roadmap descriptions
    "roadmap.desc.assessment": "Dastlabki profil baholash va muvofiqlik balini hisoblash.",
    "roadmap.desc.simulator": "Viza muvaffaqiyati uchun sun'iy intellektga asoslangan ehtimollik tekshiruvi.",
    "roadmap.desc.documents": "Kerakli hujjatlarni yig'ish va dastlabki yuklash.",
    "roadmap.desc.aiReview": "Yuklangan hujjatlarning muvofiqligi bo'yicha avtomatlashtirilgan tahlil.",
    "roadmap.desc.govChecks": "Davlat ma'lumotlar bazalariga qarshi shaxsni va o'tmishni tasdiqlash.",
    "roadmap.desc.interviewCoach": "Elchixona yoki konsullik intervyulari uchun sun'iy intellekt yordamida o'quv mashg'ulotlari.",
    "roadmap.desc.lawyerReview": "Immigratsiya bo'yicha maslahatchi tomonidan ishni yakuniy tekshirish va tasdiqlash.",
    "roadmap.desc.submission": "Immigratsiya organlariga rasmiy yuborish.",
    "lawyer.financials.title": "Moliyaviy nazorat",
    "lawyer.financials.description": "Mijozlar hisob-fakturalari, to'lovlar va fiskal hisobotlarni boshqarish.",
    "lawyer.financials.stats.totalPaid": "Jami to'langan",
    "lawyer.financials.stats.pending": "Kutilayotgan",
    "lawyer.financials.stats.overdue": "Muddati o'tgan",
    "lawyer.financials.stats.active": "Faol hisob-fakturalar",
    "lawyer.financials.form.title": "Yangi hisob-faktura chiqarish",
    "lawyer.financials.form.client": "Mijoz portfeli",
    "lawyer.financials.form.number": "Hisob-faktura raqami",
    "lawyer.financials.form.notes": "Fiskal eslatmalar",
    "lawyer.financials.form.summary": "Moliyaviy qisqacha ma'lumot",
    "lawyer.financials.form.create": "Yaratish va jo'natish",
    "lawyer.financials.table.invoice": "Ma'lumotnoma",
    "lawyer.financials.table.client": "Tuzilma",
    "lawyer.financials.table.date": "Sana",
    "lawyer.financials.table.amount": "Balans",
    "lawyer.financials.table.status": "Fiskal holat",
    "lawyer.financials.table.actions": "Boshqarish",
    "dashStatus.submitted_to_gov": "Rasmiy Davlat Topshiruvi",
    "dash.submission": "Yuborish",
    "lawyer.templates.title": "Strategiya banki",
    "lawyer.templates.subtitle": "Standartlashtirilgan shablonlar va huquqiy protokollar",
    "lawyer.templates.search": "Arxivdan qidirish...",
    "lawyer.templates.publish": "Shablonni nashr etish",
    "lawyer.templates.empty": "Arxiv bo'sh",
    "lawyer.leads.title": "Mijoz so'rovlari",
    "lawyer.leads.subtitle": "Potentsial mijozlarni kuzatish",
    "lawyer.leads.add": "Lidni ro'yxatdan o'tkazish",
    "lawyer.leads.sync": "Infrastrukturani sinxronlash...",
    "lawyer.leads.search": "So'rovlarni qidirish...",
    "lawyer.leads.filter": "Filtrlash",
    "lawyer.leads.empty": "Faol so'rovlar yo'q",
    "lawyer.leads.promote": "Ishni ilgari surish",
    "lawyer.leads.register": "Qabul protokoli",
    "lawyer.leads.capture": "Mijozni qabul qilish",
    "lawyer.leads.stages.all": "Umumiy ko'rinish",
    "lawyer.leads.stages.inquiry": "Yangi so'rov",
    "lawyer.leads.stages.new": "Yangi so'rov",
    "lawyer.leads.stages.contacted": "Bog'lanildi",
    "lawyer.leads.stages.consultation_scheduled": "Konsultatsiya",
    "lawyer.leads.stages.proposal_sent": "Taklif",
    "lawyer.leads.stages.converted": "Aylantirildi",
    "lawyer.leads.stages.lost": "Arxivlandi",
    "lawyer.leads.stats.potential": "Portfel qiymati",
    "lawyer.leads.table.client": "Shaxsiyat",
    "lawyer.leads.table.contact": "Aloqa",
    "lawyer.leads.table.objective": "Strategiya",
    "lawyer.leads.table.stage": "Holat",
    "lawyer.leads.table.value": "Baholash",
    "lawyer.leads.table.action": "Buyruq",
    "lawyer.leads.form.firstName": "Ism",
    "lawyer.leads.form.lastName": "Familiya",
    "lawyer.leads.form.email": "Email",
    "lawyer.leads.form.visa": "Strategik maqsad",
    "lawyer.leads.form.val": "Kutilayotgan qiymat",
    "lawyer.leads.form.source": "Kelib chiqish kanali",
    "lawyer.leads.form.discard": "Bekor qilish",
    "lawyer.leads.form.deploy": "Pipelinega yuborish",
    "lawyer.clientsHub.title": "Amaliyot portfeli",
    "lawyer.clientsHub.subtitle": "Mijozlarni boshqarish banki",
    "lawyer.clientsHub.register": "Asosiy mijozni qo'shish",
    "lawyer.clientsHub.totalNetwork": "Universal tarmoq",
    "lawyer.clientsHub.activeMandates": "Faol mandatlar",
    "lawyer.clientsHub.potentialValue": "Pipeline tezligi",
    "lawyer.clientsHub.practiceRevenue": "AUM daromadi",
    "lawyer.clientsHub.search": "Portfel arxivlarini qidirish...",
    "lawyer.clientsHub.table.identity": "Mijoz shaxsiyati",
    "lawyer.clientsHub.table.contact": "Kanal holati",
    "lawyer.clientsHub.table.engagement": "Ishtirok darajasi",
    "lawyer.clientsHub.table.acquisition": "Kelib chiqish protokoli",
    "lawyer.clientsHub.table.lastSync": "Sinxronlash",
    "lawyer.clientsHub.actions.copy": "Shaxsiyat ma'lumotnomasini nusxalash",
    "lawyer.clientsHub.actions.profile": "Ijrochi profili",
    "lawyer.clientsHub.actions.file": "Dossierga kirish",
    "lawyer.clientsHub.actions.msg": "Shifrlangan aloqa",
    "lawyer.clientsHub.newClient": "Mijozni ro'yxatdan o'tkazish",
    "lawyer.clientsHub.addDesc": "Mijoz rekordini bankda yaratish",
    "lawyer.clientsHub.loading": "Arxivlarga kirish...",
    "lawyer.clientsHub.empty": "Portfel bo'sh",
    "subscription.price": "Narx",
    "subscription.billingCycle": "Hisob-kitob davri",
    "subscription.started": "Faollashtirish sanasi",
    "subscription.renewal": "Keyingi davr",
    "subscription.upgradeYourPlan": "Imkoniyatlarni kengaytirish",
    "subscription.mostPopular": "Asosiy tanlov",
    "subscription.currentPlan": "Faol protokol",
    "subscription.upgrade": "Yangilash",
    "subscription.billingHistory": "Tranzaksiyalar tarixi",
    "subscription.noBillingHistory": "Tarixiy tranzaksiyalar topilmadi",
    "subscription.date": "Sana",
    "subscription.amount": "Miqdor",
    "subscription.status": "Holat",
    "subscription.invoice": "Ma'lumotnoma",
    "subscription.download": "Arxiv eksporti",
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

    // upload
    "upload.title": "Загрузка документов",
    "upload.dropFiles": "Перетащите файлы сюда или нажмите для загрузки",
    "upload.supports": "Поддержка PDF, DOCX, JPG, PNG (Макс. 10MB)",
    "upload.chooseFiles": "Выбрать файлы",
    "upload.uploading": "Загрузка...",
    "upload.uploadedSuccess": "Загрузка успешна",
    "upload.uploadedDesc": "файлов успешно загружено",
    "upload.sizeLimit": "превышает лимит размера (10MB)",
    "upload.tooLarge": "Файл слишком большой",
    "upload.error": "Ошибка загрузки",
    "upload.uploaded": "Загруженные документы",
    "upload.analyzed": "Проанализировано",
    "upload.scanning": "Сканирование...",
    "upload.ocr": "OCR Сканирование",
    "upload.ocrDesc": "Извлечение текста из изображений/сканов",
    "upload.unsupported": "Неподдерживаемый тип файла",
    "upload.ocrComplete": "OCR завершен",
    "upload.ocrSuccess": "Текст успешно извлечен",
    "upload.ocrFail": "Ошибка OCR",
    "upload.ocrError": "Не удалось извлечь текст",
    "upload.summarize": "Суммировать",
    "upload.summaryFail": "Ошибка суммирования",
    "upload.summaryError": "Не удалось создать резюме",
    "upload.view": "Просмотр",
    "upload.delete": "Удалить",
    "upload.deleted": "Удалено",
    "upload.deletedDesc": "Файл успешно удален",
    "upload.deleteError": "Ошибка удаления",
    "upload.extracted": "Извлеченный текст",
    "upload.copyText": "Копировать текст",
    "upload.copied": "Скопировано",
    "upload.copiedDesc": "Текст скопирован в буфер обмена",

    // translate
    "translate.title": "Переводчик документов",
    "translate.aiComplete": "AI Перевод",
    "translate.error": "Ошибка перевода",
    "translate.enterTextError": "Введите текст для перевода",
    "translate.complete": "Перевод завершен",
    "translate.certifiedReady": "Сертифицированный перевод готов",
    "translate.downloaded": "Загружено",
    "translate.saved": "Перевод сохранен в файл",
    "translate.from": "С",
    "translate.to": "На",
    "translate.textToTranslate": "Текст для перевода",
    "translate.enterText": "Введите или вставьте текст...",
    "translate.certified": "Сертифицированный режим",
    "translate.translating": "Перевод...",
    "translate.translate": "Перевести",
    "translate.result": "Результат перевода",
    "translate.certifiedLabel": "Сертифицировано",
    "translate.willAppear": "Перевод появится здесь",
    "translate.swap": "Поменять языки",
    "translate.download": "Скачать",

    // docs
    "docs.title": "AI Генератор документов",
    "docs.gen": "Создать",
    "docs.genSuccess": "Успешно создано",
    "docs.genError": "Ошибка создания",
    "docs.tooShort": "Контент слишком короткий",
    "docs.tooShortDesc": "Пожалуйста, предоставьте больше информации для проверки",
    "docs.reviewFail": "Ошибка проверки",
    "docs.score": "Оценка качества",
    "docs.observations": "Основные наблюдения",
    "docs.findings": "Проблемы и улучшения",
    "docs.proposals": "Предлагаемые правки",
    "docs.analyzedContent": "Проанализированный контент",
    "docs.analyzing": "Анализ документа...",
    "docs.analyzingDesc": "Наш AI проверяет ваш документ на юридическое соответствие и ясность.",
    "docs.readyReview": "Готов к проверке",
    "docs.readyReviewDesc": "Вставьте текст документа или создайте новый для мгновенной оценки AI.",
    "docs.fillRequired": "Пожалуйста, заполните все обязательные поля",
    "docs.fillForm": "Заполните форму для создания документа",
    "docs.fullName": "Полное имя",
    "docs.role": "Целевая должность",
    "docs.company": "Компания",
    "docs.experience": "Опыт (лет)",
    "docs.education": "Образование",
    "docs.skills": "Ключевые навыки",
    "docs.achievements": "Достижения",
    "docs.docType": "Тип документа",
    "docs.motivation": "Мотивационное письмо",
    "docs.cv": "Улучшение CV",
    "docs.reference": "Рекомендательное письмо",
    "docs.student_visa": "Студенческая виза",
    "docs.tourist_visa": "Туристическая виза",
    "docs.generic": "Общее письмо",
    "docs.print": "Печать / Сохранить PDF",

    // tools
    "tools.gen": "Создать",
    "tools.typing": "Генерация...",
    "tools.clear": "Очистить",

    // review
    "review.title": "AI Проверка",
    "review.desc": "Вставьте текст для проверки...",
    "review.reviewing": "Проверка...",
    "review.check": "Проверить документ",

    // analytics
    "analytics.summary": "Резюме документа",

    // tools
    "tools.chatP": "Введите ваше сообщение...",

    // chat
    "chat.greeting": "Здравствуйте! Чем могу помочь с вашими иммиграционными вопросами?",
    "chat.error": "Произошла ошибка. Пожалуйста, попробуйте снова.",
    "chat.clearConfirm": "Вы уверены, что хотите очистить историю чата?",
    "chat.historyCleared": "История чата очищена.",
    "chat.cleared": "Очищено",
    "chat.clearedDesc": "История чата сброшена.",
    "chat.assistant": "AI Ассистент",
    "chat.export": "Экспорт PDF",
    "chat.clear": "Очистить чат",
    "chat.inputHint": "Нажмите Enter для отправки",

    // roadmap
    "roadmap.assessment": "Оценка",
    "roadmap.simulator": "Симулятор Визы",
    "roadmap.documents": "Документы",
    "roadmap.aiReview": "AI Проверка",
    "roadmap.govChecks": "Гос. Проверки",
    "roadmap.interviewCoach": "Тренер Интервью",
    "roadmap.lawyerReview": "Проверка Юристом",
    "roadmap.submission": "Подача",

    // roadmap descriptions
    "roadmap.desc.assessment": "Начальная оценка профиля и баллы соответствия.",
    "roadmap.desc.simulator": "ИИ-проверка вероятности успеха визы.",
    "roadmap.desc.documents": "Сбор и предварительная загрузка необходимой документации.",
    "roadmap.desc.aiReview": "Автоматизированный анализ загруженных документов на соответствие.",
    "roadmap.desc.govChecks": "Проверка личности и биографических данных по государственным базам.",
    "roadmap.desc.interviewCoach": "Тренировки с ИИ для интервью в посольстве или консульстве.",
    "roadmap.desc.lawyerReview": "Окончательная проверка и авторизация дела иммиграционным консультантом.",
    "roadmap.desc.submission": "Официальная подача в иммиграционные органы.",
    "lawyer.financials.title": "Финансовый контроль",
    "lawyer.financials.description": "Управление счетами клиентов, платежами и фискальными отчетами.",
    "lawyer.financials.stats.totalPaid": "Всего оплачено",
    "lawyer.financials.stats.pending": "Ожидается",
    "lawyer.financials.stats.overdue": "Просрочено",
    "lawyer.financials.stats.active": "Активные счета",
    "lawyer.financials.form.title": "Выставить новый счет",
    "lawyer.financials.form.client": "Портфель клиентов",
    "lawyer.financials.form.number": "Номер счета",
    "lawyer.financials.form.notes": "Фискальные заметки",
    "lawyer.financials.form.summary": "Финансовое резюме",
    "lawyer.financials.form.create": "Создать и отправить",
    "lawyer.financials.table.invoice": "Справка",
    "lawyer.financials.table.client": "Субъект",
    "lawyer.financials.table.date": "Дата",
    "lawyer.financials.table.amount": "Баланс",
    "lawyer.financials.table.status": "Фискальный статус",
    "lawyer.financials.table.actions": "Управление",
    "dashStatus.submitted_to_gov": "Официальная Подача в Госорганы",
    "dash.submission": "Подача",
    "lawyer.templates.title": "Банк стратегий",
    "lawyer.templates.subtitle": "Стандартизированные шаблоны и правовые протоколы",
    "lawyer.templates.search": "Поиск в архивах...",
    "lawyer.templates.publish": "Опубликовать шаблон",
    "lawyer.templates.empty": "Архив пуст",
    "lawyer.leads.title": "Запросы клиентов",
    "lawyer.leads.subtitle": "Отслеживание и управление потенциальными клиентами",
    "lawyer.leads.add": "Регистрация лида",
    "lawyer.leads.sync": "Синхронизация инфраструктуры...",
    "lawyer.leads.search": "Поиск запросов...",
    "lawyer.leads.filter": "Фильтр",
    "lawyer.leads.empty": "Нет активных запросов",
    "lawyer.leads.promote": "Продвинуть дело",
    "lawyer.leads.register": "Протокол приема",
    "lawyer.leads.capture": "Первичный прием клиента",
    "lawyer.leads.stages.all": "Глобальный вид",
    "lawyer.leads.stages.inquiry": "Новый запрос",
    "lawyer.leads.stages.new": "Новый запрос",
    "lawyer.leads.stages.contacted": "Связались",
    "lawyer.leads.stages.consultation_scheduled": "Консультация",
    "lawyer.leads.stages.proposal_sent": "Предложение",
    "lawyer.leads.stages.converted": "Конвертировано",
    "lawyer.leads.stages.lost": "Архивировано",
    "lawyer.leads.stats.potential": "Стоимость портфеля",
    "lawyer.leads.table.client": "Личность",
    "lawyer.leads.table.contact": "Коммуникации",
    "lawyer.leads.table.objective": "Стратегия",
    "lawyer.leads.table.stage": "Статус",
    "lawyer.leads.table.value": "Оценка",
    "lawyer.leads.table.action": "Команда",
    "lawyer.leads.form.firstName": "Имя",
    "lawyer.leads.form.lastName": "Фамилия",
    "lawyer.leads.form.email": "Электронная почта",
    "lawyer.leads.form.visa": "Стратегическая цель",
    "lawyer.leads.form.val": "Ожидаемая стоимость",
    "lawyer.leads.form.source": "Канал происхождения",
    "lawyer.leads.form.discard": "Отмена",
    "lawyer.leads.form.deploy": "Отправить в пайплайн",
    "lawyer.clientsHub.title": "Портфель практики",
    "lawyer.clientsHub.subtitle": "Банк управления институциональными клиентами",
    "lawyer.clientsHub.register": "Оформить принципала",
    "lawyer.clientsHub.totalNetwork": "Универсальная сеть",
    "lawyer.clientsHub.activeMandates": "Активные мандаты",
    "lawyer.clientsHub.potentialValue": "Скорость пайплайна",
    "lawyer.clientsHub.practiceRevenue": "Доход AUM",
    "lawyer.clientsHub.search": "Поиск в архивах портфеля...",
    "lawyer.clientsHub.table.identity": "Личность принципала",
    "lawyer.clientsHub.table.contact": "Статус канала",
    "lawyer.clientsHub.table.engagement": "Уровень вовлеченности",
    "lawyer.clientsHub.table.acquisition": "Протокол происхождения",
    "lawyer.clientsHub.table.lastSync": "Синхронизация",
    "lawyer.clientsHub.actions.copy": "Копировать ссылку на личность",
    "lawyer.clientsHub.actions.profile": "Профиль руководителя",
    "lawyer.clientsHub.actions.file": "Доступ к досье",
    "lawyer.clientsHub.actions.msg": "Зашифрованная связь",
    "lawyer.clientsHub.newClient": "Регистрация принципала",
    "lawyer.clientsHub.addDesc": "Инициализировать запись клиента в банке",
    "lawyer.clientsHub.loading": "Доступ к архивам...",
    "lawyer.clientsHub.empty": "Портфель пуст",
    "subscription.price": "Тариф",
    "subscription.billingCycle": "Цикл оплаты",
    "subscription.started": "Дата активации",
    "subscription.renewal": "Следующий цикл",
    "subscription.upgradeYourPlan": "Расширить возможности",
    "subscription.mostPopular": "Основной выбор",
    "subscription.currentPlan": "Активный протокол",
    "subscription.upgrade": "Выполнить апгрейд",
    "subscription.billingHistory": "Журнал транзакций",
    "subscription.noBillingHistory": "Исторических транзакций не обнаружено",
    "subscription.date": "Дата",
    "subscription.amount": "Сумма",
    "subscription.status": "Статус выполнения",
    "subscription.invoice": "Справка",
    "subscription.download": "Экспорт архива",
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
      cancel: "Cancel",
      gen: dict["tools.gen"] || "Generate",
      typing: dict["tools.typing"] || "Generating...",
      clear: dict["tools.clear"] || "Clear",
      chatP: dict["tools.chatP"] || "Type your message..."
    };

    (fn as any).chat = {
      greeting: dict["chat.greeting"] || "Hello! How can I help you?",
      error: dict["chat.error"] || "Error occurred.",
      clearConfirm: dict["chat.clearConfirm"] || "Clear history?",
      historyCleared: dict["chat.historyCleared"] || "History cleared.",
      cleared: dict["chat.cleared"] || "Cleared",
      clearedDesc: dict["chat.clearedDesc"] || "Chat history reset.",
      assistant: dict["chat.assistant"] || "AI Assistant",
      export: dict["chat.export"] || "Export PDF",
      clear: dict["chat.clear"] || "Clear Chat",
      inputHint: dict["chat.inputHint"] || "Press Enter to send",
      tags: ["Visa Types", "Requirements", "Process", "Fees"]
    };

    (fn as any).upload = {
      title: dict["upload.title"],
      dropFiles: dict["upload.dropFiles"],
      supports: dict["upload.supports"],
      chooseFiles: dict["upload.chooseFiles"],
      uploading: dict["upload.uploading"],
      uploadedSuccess: dict["upload.uploadedSuccess"],
      uploadedDesc: dict["upload.uploadedDesc"],
      sizeLimit: dict["upload.sizeLimit"],
      tooLarge: dict["upload.tooLarge"],
      error: dict["upload.error"],
      uploaded: dict["upload.uploaded"],
      analyzed: dict["upload.analyzed"],
      scanning: dict["upload.scanning"],
      ocr: dict["upload.ocr"],
      ocrDesc: dict["upload.ocrDesc"],
      unsupported: dict["upload.unsupported"],
      ocrComplete: dict["upload.ocrComplete"],
      ocrSuccess: dict["upload.ocrSuccess"],
      ocrFail: dict["upload.ocrFail"],
      ocrError: dict["upload.ocrError"],
      summarize: dict["upload.summarize"],
      summaryFail: dict["upload.summaryFail"],
      summaryError: dict["upload.summaryError"],
      view: dict["upload.view"],
      delete: dict["upload.delete"],
      deleted: dict["upload.deleted"],
      deletedDesc: dict["upload.deletedDesc"],
      deleteError: dict["upload.deleteError"],
      extracted: dict["upload.extracted"],
      copyText: dict["upload.copyText"],
      copied: dict["upload.copied"],
      copiedDesc: dict["upload.copiedDesc"]
    };

    (fn as any).translate = {
      title: dict["translate.title"],
      aiComplete: dict["translate.aiComplete"],
      error: dict["translate.error"],
      enterTextError: dict["translate.enterTextError"],
      complete: dict["translate.complete"],
      certifiedReady: dict["translate.certifiedReady"],
      downloaded: dict["translate.downloaded"],
      saved: dict["translate.saved"],
      from: dict["translate.from"],
      to: dict["translate.to"],
      textToTranslate: dict["translate.textToTranslate"],
      enterText: dict["translate.enterText"],
      certified: dict["translate.certified"],
      translating: dict["translate.translating"],
      translate: dict["translate.translate"],
      result: dict["translate.result"],
      certifiedLabel: dict["translate.certifiedLabel"],
      willAppear: dict["translate.willAppear"],
      swap: dict["translate.swap"],
      download: dict["translate.download"]
    };

    (fn as any).docs = {
      title: dict["docs.title"],
      gen: dict["docs.gen"],
      genSuccess: dict["docs.genSuccess"],
      genError: dict["docs.genError"],
      tooShort: dict["docs.tooShort"],
      tooShortDesc: dict["docs.tooShortDesc"],
      reviewFail: dict["docs.reviewFail"],
      score: dict["docs.score"],
      observations: dict["docs.observations"],
      findings: dict["docs.findings"],
      proposals: dict["docs.proposals"],
      analyzedContent: dict["docs.analyzedContent"],
      analyzing: dict["docs.analyzing"],
      analyzingDesc: dict["docs.analyzingDesc"],
      readyReview: dict["docs.readyReview"],
      readyReviewDesc: dict["docs.readyReviewDesc"],
      fillRequired: dict["docs.fillRequired"],
      fillForm: dict["docs.fillForm"],
      fullName: dict["docs.fullName"],
      role: dict["docs.role"],
      company: dict["docs.company"],
      experience: dict["docs.experience"],
      education: dict["docs.education"],
      skills: dict["docs.skills"],
      achievements: dict["docs.achievements"],
      docType: dict["docs.docType"],
      motivation: dict["docs.motivation"],
      cv: dict["docs.cv"],
      reference: dict["docs.reference"],
      student_visa: dict["docs.student_visa"],
      tourist_visa: dict["docs.tourist_visa"],
      generic: dict["docs.generic"],
      print: dict["docs.print"]
    };

    (fn as any).analytics = {
      summary: dict["analytics.summary"]
    };

    (fn as any).roadmap = {
      title: "Roadmap",
      assessment: dict["roadmap.assessment"],
      simulator: dict["roadmap.simulator"],
      documents: dict["roadmap.documents"],
      aiReview: dict["roadmap.aiReview"],
      govChecks: dict["roadmap.govChecks"],
      interviewCoach: dict["roadmap.interviewCoach"],
      lawyerReview: dict["roadmap.lawyerReview"],
      submission: dict["roadmap.submission"],
      completionLabel: "Completion",
      nextStepLabel: "Next Step",
      applicationReference: "Ref",
      defaults: {
        assessmentDesc: dict["roadmap.desc.assessment"],
        simulatorDesc: dict["roadmap.desc.simulator"],
        documentsDesc: dict["roadmap.desc.documents"],
        aiReviewDesc: dict["roadmap.desc.aiReview"],
        govChecksDesc: dict["roadmap.desc.govChecks"],
        interviewCoachDesc: dict["roadmap.desc.interviewCoach"],
        lawyerReviewDesc: dict["roadmap.desc.lawyerReview"],
        submissionDesc: dict["roadmap.desc.submission"]
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
      desc: "Instant AI document analysis",
      reviewing: dict["review.reviewing"] || "Reviewing...",
      check: dict["review.check"] || "Check Document"
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
    (fn as any).lawyer = {
      leads: {
        title: dict["lawyer.leads.title"] || "Client Inquiries",
        subtitle: dict["lawyer.leads.subtitle"] || "Track and manage potential clients",
        add: dict["lawyer.leads.add"] || "Register Lead",
        sync: dict["lawyer.leads.sync"] || "Syncing infrastructure...",
        search: dict["lawyer.leads.search"] || "Search inquiries...",
        filter: dict["lawyer.leads.filter"] || "Refine",
        empty: dict["lawyer.leads.empty"] || "No active inquiries",
        promote: dict["lawyer.leads.promote"] || "Advance Case",
        register: dict["lawyer.leads.register"] || "Intake Protocol",
        capture: dict["lawyer.leads.capture"] || "Initial Client Ingestion",
        stages: {
          all: dict["lawyer.leads.stages.all"] || "Global View",
          inquiry: dict["lawyer.leads.stages.inquiry"] || "New Inquiry",
          new: dict["lawyer.leads.stages.new"] || "New Inquiry",
          contacted: dict["lawyer.leads.stages.contacted"] || "Contacted",
          consultation_scheduled: dict["lawyer.leads.stages.consultation_scheduled"] || "Consultation",
          proposal_sent: dict["lawyer.leads.stages.proposal_sent"] || "Proposal",
          converted: dict["lawyer.leads.stages.converted"] || "Converted",
          lost: dict["lawyer.leads.stages.lost"] || "Archived"
        },
        stats: {
          potential: dict["lawyer.leads.stats.potential"] || "Portfolio Value"
        },
        table: {
          client: dict["lawyer.leads.table.client"] || "Identity",
          contact: dict["lawyer.leads.table.contact"] || "Communications",
          objective: dict["lawyer.leads.table.objective"] || "Strategy",
          stage: dict["lawyer.leads.table.stage"] || "Status",
          value: dict["lawyer.leads.table.value"] || "Valuation",
          action: dict["lawyer.leads.table.action"] || "Command"
        },
        form: {
          firstName: dict["lawyer.leads.form.firstName"] || "Given Name",
          lastName: dict["lawyer.leads.form.lastName"] || "Surname",
          email: dict["lawyer.leads.form.email"] || "Electronic Mail",
          visa: dict["lawyer.leads.form.visa"] || "Strategic Objective",
          val: dict["lawyer.leads.form.val"] || "Expected Valuation",
          source: dict["lawyer.leads.form.source"] || "Origin Channel",
          discard: dict["lawyer.leads.form.discard"] || "Abort",
          deploy: dict["lawyer.leads.form.deploy"] || "Deploy to Pipeline"
        }
      },
      clientsHub: {
        title: dict["lawyer.clientsHub.title"] || "Practice Portfolio",
        subtitle: dict["lawyer.clientsHub.subtitle"] || "Institutional client management bank",
        register: dict["lawyer.clientsHub.register"] || "Onboard Principal",
        totalNetwork: dict["lawyer.clientsHub.totalNetwork"] || "Universal Network",
        activeMandates: dict["lawyer.clientsHub.activeMandates"] || "Active Mandates",
        potentialValue: dict["lawyer.clientsHub.potentialValue"] || "Pipeline Velocity",
        practiceRevenue: dict["lawyer.clientsHub.practiceRevenue"] || "AUM Revenue",
        search: dict["lawyer.clientsHub.search"] || "Search portfolio archives...",
        table: {
          identity: dict["lawyer.clientsHub.table.identity"] || "Principal Identity",
          contact: dict["lawyer.clientsHub.table.contact"] || "Channel Status",
          engagement: dict["lawyer.clientsHub.table.engagement"] || "Engagement Level",
          acquisition: dict["lawyer.clientsHub.table.acquisition"] || "Origin Protocol",
          lastSync: dict["lawyer.clientsHub.table.lastSync"] || "Temporal Sync"
        },
        actions: {
          copy: dict["lawyer.clientsHub.actions.copy"] || "Copy Identity Reference",
          profile: dict["lawyer.clientsHub.actions.profile"] || "Executive Profile",
          file: dict["lawyer.clientsHub.actions.file"] || "Dossier Access",
          msg: dict["lawyer.clientsHub.actions.msg"] || "Encrypted Uplink"
        },
        newClient: dict["lawyer.clientsHub.newClient"] || "Register Principal",
        addDesc: dict["lawyer.clientsHub.addDesc"] || "Initialize new client record in institutional bank",
        loading: dict["lawyer.clientsHub.loading"] || "Accessing archives...",
        empty: dict["lawyer.clientsHub.empty"] || "Portfolio empty"
      },
      financials: {
        title: dict["lawyer.financials.title"] || "Financial Control",
        description: dict["lawyer.financials.description"] || "Manage client billing",
        stats: {
          totalPaid: dict["lawyer.financials.stats.totalPaid"] || "Total Paid",
          pending: dict["lawyer.financials.stats.pending"] || "Pending",
          overdue: dict["lawyer.financials.stats.overdue"] || "Overdue",
          active: dict["lawyer.financials.stats.active"] || "Active"
        },
        form: {
          client: dict["lawyer.financials.form.client"] || "Client",
          number: dict["lawyer.financials.form.number"] || "Invoice #"
        },
        table: {
          invoice: dict["lawyer.financials.table.invoice"] || "Invoice",
          client: dict["lawyer.financials.table.client"] || "Client",
          date: dict["lawyer.financials.table.date"] || "Date",
          amount: dict["lawyer.financials.table.amount"] || "Amount",
          status: dict["lawyer.financials.table.status"] || "Status",
          actions: dict["lawyer.financials.table.actions"] || "Actions"
        }
      },
      templates: {
        title: dict["lawyer.templates.title"] || "Strategy Bank",
        subtitle: dict["lawyer.templates.subtitle"] || "Standardized templates",
        search: dict["lawyer.templates.search"] || "Search...",
        publish: dict["lawyer.templates.publish"] || "Publish Template",
        empty: dict["lawyer.templates.empty"] || "Archive Empty"
      }
    };

    (fn as any).subscription = {
      price: dict["subscription.price"] || "Rate",
      billingCycle: dict["subscription.billingCycle"] || "Billing Frequency",
      started: dict["subscription.started"] || "Activation Date",
      renewal: dict["subscription.renewal"] || "Next Ledger Cycle",
      upgradeYourPlan: dict["subscription.upgradeYourPlan"] || "Enhance Institutional Capacity",
      mostPopular: dict["subscription.mostPopular"] || "Primary Choice",
      currentPlan: dict["subscription.currentPlan"] || "Active Protocol",
      upgrade: dict["subscription.upgrade"] || "Execute Upgrade",
      billingHistory: dict["subscription.billingHistory"] || "Temporal Ledger",
      noBillingHistory: dict["subscription.noBillingHistory"] || "No historical transactions discovered",
      date: dict["subscription.date"] || "Temporal Stamp",
      amount: dict["subscription.amount"] || "Quantum",
      status: dict["subscription.status"] || "Execution Status",
      invoice: dict["subscription.invoice"] || "Reference",
      download: dict["subscription.download"] || "Archive Export"
    };
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
      active: dict["dashStatus.active"] || "Active",
      submitted_to_gov: dict["dashStatus.submitted_to_gov"] || "Government Submission",
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
