// ─────────────────────────────────────────────────
// Translation / i18n Infrastructure
// ─────────────────────────────────────────────────

export type Locale = "en" | "ur" | "ar";

export interface TranslationKeys {
	// Navigation
	"nav.dashboard": string;
	"nav.invoices": string;
	"nav.estimates": string;
	"nav.reports": string;
	"nav.analytics": string;
	"nav.pos": string;
	"nav.ai": string;
	"nav.settings": string;
	"nav.branches": string;

	// Common
	"common.save": string;
	"common.cancel": string;
	"common.delete": string;
	"common.edit": string;
	"common.create": string;
	"common.back": string;
	"common.search": string;
	"common.filter": string;
	"common.all": string;
	"common.loading": string;
	"common.logout": string;
	"common.print": string;
	"common.download": string;
	"common.yes": string;
	"common.no": string;

	// Dashboard
	"dashboard.welcome": string;
	"dashboard.totalRevenue": string;
	"dashboard.totalClients": string;
	"dashboard.totalInvoices": string;
	"dashboard.outstanding": string;
	"dashboard.newInvoice": string;
	"dashboard.overview": string;

	// Invoices
	"invoices.title": string;
	"invoices.create": string;
	"invoices.paid": string;
	"invoices.unpaid": string;
	"invoices.overdue": string;
	"invoices.markPaid": string;
	"invoices.dueDate": string;
	"invoices.client": string;
	"invoices.amount": string;
	"invoices.status": string;
	"invoices.subtotal": string;
	"invoices.tax": string;
	"invoices.grandTotal": string;
	"invoices.lineItems": string;
	"invoices.addItem": string;

	// Settings
	"settings.title": string;
	"settings.language": string;
	"settings.currency": string;
	"settings.tax": string;
	"settings.branches": string;

	// Branch
	"branch.title": string;
	"branch.name": string;
	"branch.location": string;
	"branch.manager": string;
	"branch.allBranches": string;
	"branch.add": string;

	// Analytics
	"analytics.title": string;
	"analytics.revenueTrend": string;
	"analytics.invoiceStatus": string;
	"analytics.clientRevenue": string;
	"analytics.taxSummary": string;
}

// ── Translation Data ──

const translations: Record<Locale, TranslationKeys> = {
	en: {
		"nav.dashboard": "Dashboard",
		"nav.invoices": "Invoices",
		"nav.estimates": "Estimates",
		"nav.reports": "Reports",
		"nav.analytics": "Analytics",
		"nav.pos": "POS",
		"nav.ai": "AI Assistant",
		"nav.settings": "Settings",
		"nav.branches": "Branches",
		"common.save": "Save",
		"common.cancel": "Cancel",
		"common.delete": "Delete",
		"common.edit": "Edit",
		"common.create": "Create",
		"common.back": "Back",
		"common.search": "Search",
		"common.filter": "Filter",
		"common.all": "All",
		"common.loading": "Loading...",
		"common.logout": "Logout",
		"common.print": "Print",
		"common.download": "Download",
		"common.yes": "Yes",
		"common.no": "No",
		"dashboard.welcome": "Welcome Back",
		"dashboard.totalRevenue": "Total Revenue",
		"dashboard.totalClients": "Total Clients",
		"dashboard.totalInvoices": "Total Invoices",
		"dashboard.outstanding": "Outstanding",
		"dashboard.newInvoice": "New Invoice",
		"dashboard.overview": "Here's your AI-personalized dashboard overview.",
		"invoices.title": "Invoices",
		"invoices.create": "Create Invoice",
		"invoices.paid": "Paid",
		"invoices.unpaid": "Unpaid",
		"invoices.overdue": "Overdue",
		"invoices.markPaid": "Mark Paid",
		"invoices.dueDate": "Due Date",
		"invoices.client": "Client",
		"invoices.amount": "Amount",
		"invoices.status": "Status",
		"invoices.subtotal": "Subtotal",
		"invoices.tax": "Tax",
		"invoices.grandTotal": "Grand Total",
		"invoices.lineItems": "Line Items",
		"invoices.addItem": "Add Item",
		"settings.title": "Settings",
		"settings.language": "Language",
		"settings.currency": "Currency",
		"settings.tax": "Tax Configuration",
		"settings.branches": "Branch Management",
		"branch.title": "Branches",
		"branch.name": "Branch Name",
		"branch.location": "Location",
		"branch.manager": "Manager",
		"branch.allBranches": "All Branches",
		"branch.add": "Add Branch",
		"analytics.title": "Analytics",
		"analytics.revenueTrend": "Revenue Trend",
		"analytics.invoiceStatus": "Invoice Status",
		"analytics.clientRevenue": "Client Revenue",
		"analytics.taxSummary": "Tax Summary",
	},
	ur: {
		"nav.dashboard": "ڈیش بورڈ",
		"nav.invoices": "انوائسز",
		"nav.estimates": "تخمینے",
		"nav.reports": "رپورٹس",
		"nav.analytics": "تجزیات",
		"nav.pos": "پوائنٹ آف سیل",
		"nav.ai": "اے آئی اسسٹنٹ",
		"nav.settings": "ترتیبات",
		"nav.branches": "شاخیں",
		"common.save": "محفوظ کریں",
		"common.cancel": "منسوخ",
		"common.delete": "حذف کریں",
		"common.edit": "ترمیم",
		"common.create": "بنائیں",
		"common.back": "واپس",
		"common.search": "تلاش",
		"common.filter": "فلٹر",
		"common.all": "سب",
		"common.loading": "...لوڈ ہو رہا ہے",
		"common.logout": "لاگ آؤٹ",
		"common.print": "پرنٹ",
		"common.download": "ڈاؤن لوڈ",
		"common.yes": "ہاں",
		"common.no": "نہیں",
		"dashboard.welcome": "خوش آمدید",
		"dashboard.totalRevenue": "کل آمدنی",
		"dashboard.totalClients": "کل کلائنٹس",
		"dashboard.totalInvoices": "کل انوائسز",
		"dashboard.outstanding": "واجب الادا",
		"dashboard.newInvoice": "نئی انوائس",
		"dashboard.overview": "آپ کا ذاتی ڈیش بورڈ",
		"invoices.title": "انوائسز",
		"invoices.create": "انوائس بنائیں",
		"invoices.paid": "ادا شدہ",
		"invoices.unpaid": "غیر ادا شدہ",
		"invoices.overdue": "واجب التاریخ",
		"invoices.markPaid": "ادا شدہ",
		"invoices.dueDate": "آخری تاریخ",
		"invoices.client": "کلائنٹ",
		"invoices.amount": "رقم",
		"invoices.status": "حالت",
		"invoices.subtotal": "ذیلی کل",
		"invoices.tax": "ٹیکس",
		"invoices.grandTotal": "کل رقم",
		"invoices.lineItems": "اشیاء",
		"invoices.addItem": "شے شامل کریں",
		"settings.title": "ترتیبات",
		"settings.language": "زبان",
		"settings.currency": "کرنسی",
		"settings.tax": "ٹیکس ترتیبات",
		"settings.branches": "شاخوں کا انتظام",
		"branch.title": "شاخیں",
		"branch.name": "شاخ کا نام",
		"branch.location": "مقام",
		"branch.manager": "مینیجر",
		"branch.allBranches": "تمام شاخیں",
		"branch.add": "شاخ شامل کریں",
		"analytics.title": "تجزیات",
		"analytics.revenueTrend": "آمدنی کا رجحان",
		"analytics.invoiceStatus": "انوائس کی حالت",
		"analytics.clientRevenue": "کلائنٹ آمدنی",
		"analytics.taxSummary": "ٹیکس خلاصہ",
	},
	ar: {
		"nav.dashboard": "لوحة القيادة",
		"nav.invoices": "الفواتير",
		"nav.estimates": "التقديرات",
		"nav.reports": "التقارير",
		"nav.analytics": "التحليلات",
		"nav.pos": "نقطة البيع",
		"nav.ai": "مساعد الذكاء",
		"nav.settings": "الإعدادات",
		"nav.branches": "الفروع",
		"common.save": "حفظ",
		"common.cancel": "إلغاء",
		"common.delete": "حذف",
		"common.edit": "تعديل",
		"common.create": "إنشاء",
		"common.back": "رجوع",
		"common.search": "بحث",
		"common.filter": "تصفية",
		"common.all": "الكل",
		"common.loading": "...جاري التحميل",
		"common.logout": "تسجيل الخروج",
		"common.print": "طباعة",
		"common.download": "تحميل",
		"common.yes": "نعم",
		"common.no": "لا",
		"dashboard.welcome": "مرحبا بعودتك",
		"dashboard.totalRevenue": "إجمالي الإيرادات",
		"dashboard.totalClients": "إجمالي العملاء",
		"dashboard.totalInvoices": "إجمالي الفواتير",
		"dashboard.outstanding": "المبالغ المستحقة",
		"dashboard.newInvoice": "فاتورة جديدة",
		"dashboard.overview": "نظرة عامة على لوحة القيادة",
		"invoices.title": "الفواتير",
		"invoices.create": "إنشاء فاتورة",
		"invoices.paid": "مدفوعة",
		"invoices.unpaid": "غير مدفوعة",
		"invoices.overdue": "متأخرة",
		"invoices.markPaid": "تحديد كمدفوعة",
		"invoices.dueDate": "تاريخ الاستحقاق",
		"invoices.client": "العميل",
		"invoices.amount": "المبلغ",
		"invoices.status": "الحالة",
		"invoices.subtotal": "المجموع الفرعي",
		"invoices.tax": "الضريبة",
		"invoices.grandTotal": "المجموع الكلي",
		"invoices.lineItems": "البنود",
		"invoices.addItem": "إضافة بند",
		"settings.title": "الإعدادات",
		"settings.language": "اللغة",
		"settings.currency": "العملة",
		"settings.tax": "إعدادات الضرائب",
		"settings.branches": "إدارة الفروع",
		"branch.title": "الفروع",
		"branch.name": "اسم الفرع",
		"branch.location": "الموقع",
		"branch.manager": "المدير",
		"branch.allBranches": "جميع الفروع",
		"branch.add": "إضافة فرع",
		"analytics.title": "التحليلات",
		"analytics.revenueTrend": "اتجاه الإيرادات",
		"analytics.invoiceStatus": "حالة الفواتير",
		"analytics.clientRevenue": "إيرادات العملاء",
		"analytics.taxSummary": "ملخص الضرائب",
	},
};

// ── Locale Management ──

const LOCALE_KEY = "billingo_locale";

export function getLocale(): Locale {
	try {
		const raw = localStorage.getItem(LOCALE_KEY);
		if (raw && (raw === "en" || raw === "ur" || raw === "ar")) return raw;
	} catch {
		// ignore
	}
	return "en";
}

export function setLocale(locale: Locale): void {
	localStorage.setItem(LOCALE_KEY, locale);
}

export function t(key: keyof TranslationKeys): string {
	const locale = getLocale();
	return translations[locale]?.[key] || translations.en[key] || key;
}

export function isRTL(): boolean {
	const locale = getLocale();
	return locale === "ur" || locale === "ar";
}

export const LOCALE_OPTIONS: { value: Locale; label: string; nativeLabel: string }[] = [
	{ value: "en", label: "English", nativeLabel: "English" },
	{ value: "ur", label: "Urdu", nativeLabel: "اردو" },
	{ value: "ar", label: "Arabic", nativeLabel: "العربية" },
];
