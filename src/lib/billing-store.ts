// ─────────────────────────────────────────────────
// Billingo Data Models & localStorage Persistence
// ─────────────────────────────────────────────────

import { logActivity } from "@/lib/activity-log";
import { reduceStock } from "@/lib/product-store";

// ── Data Models ──

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	businessType: string;
	country: string;
	currency: string;
	taxEnabled: boolean;
	taxRate: number;
	servicesEnabled: string[];
}

export interface Client {
	id: string;
	name: string;
	email: string;
	phone: string;
	address: string;
	totalBilled: number;
	totalPaid: number;
	outstandingAmount: number;
}

export interface InvoiceItem {
	id: string;
	description: string;
	quantity: number;
	price: number;
	total: number;
	productId?: string;
}

export type InvoiceStatus = "Paid" | "Unpaid" | "Overdue";

export interface Invoice {
	id: string;
	invoiceNumber: string;
	clientId: string;
	items: InvoiceItem[];
	subtotal: number;
	taxAmount: number;
	grandTotal: number;
	currency: string;
	currencyCode?: string;
	status: InvoiceStatus;
	issueDate: string;
	dueDate: string;
	branchId?: string;
	taxName?: string;
}

// ── Currency Helpers ──

export const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
	"USD - US Dollar": { symbol: "$", code: "USD" },
	"EUR - Euro": { symbol: "\u20AC", code: "EUR" },
	"GBP - British Pound": { symbol: "\u00A3", code: "GBP" },
	"INR - Indian Rupee": { symbol: "\u20B9", code: "INR" },
	"PKR - Pakistani Rupee": { symbol: "Rs", code: "PKR" },
	"AED - UAE Dirham": { symbol: "AED ", code: "AED" },
	"JPY - Japanese Yen": { symbol: "\u00A5", code: "JPY" },
	"CAD - Canadian Dollar": { symbol: "C$", code: "CAD" },
	"AUD - Australian Dollar": { symbol: "A$", code: "AUD" },
	"CHF - Swiss Franc": { symbol: "CHF ", code: "CHF" },
	"CNY - Chinese Yuan": { symbol: "\u00A5", code: "CNY" },
	"SAR - Saudi Riyal": { symbol: "SAR ", code: "SAR" },
	"BRL - Brazilian Real": { symbol: "R$", code: "BRL" },
	"MXN - Mexican Peso": { symbol: "MX$", code: "MXN" },
	"SGD - Singapore Dollar": { symbol: "S$", code: "SGD" },
	"HKD - Hong Kong Dollar": { symbol: "HK$", code: "HKD" },
	"KRW - South Korean Won": { symbol: "\u20A9", code: "KRW" },
	"THB - Thai Baht": { symbol: "\u0E3F", code: "THB" },
	"MYR - Malaysian Ringgit": { symbol: "RM", code: "MYR" },
	"IDR - Indonesian Rupiah": { symbol: "Rp", code: "IDR" },
	"PHP - Philippine Peso": { symbol: "\u20B1", code: "PHP" },
	"VND - Vietnamese Dong": { symbol: "\u20AB", code: "VND" },
	"NGN - Nigerian Naira": { symbol: "\u20A6", code: "NGN" },
	"ZAR - South African Rand": { symbol: "R", code: "ZAR" },
	"EGP - Egyptian Pound": { symbol: "E\u00A3", code: "EGP" },
	"KES - Kenyan Shilling": { symbol: "KSh", code: "KES" },
	"GHS - Ghanaian Cedi": { symbol: "GH\u20B5", code: "GHS" },
	"TRY - Turkish Lira": { symbol: "\u20BA", code: "TRY" },
	"SEK - Swedish Krona": { symbol: "kr", code: "SEK" },
	"NOK - Norwegian Krone": { symbol: "kr", code: "NOK" },
	"DKK - Danish Krone": { symbol: "kr", code: "DKK" },
	"PLN - Polish Zloty": { symbol: "z\u0142", code: "PLN" },
	"CZK - Czech Koruna": { symbol: "K\u010D", code: "CZK" },
	"HUF - Hungarian Forint": { symbol: "Ft", code: "HUF" },
	"RON - Romanian Leu": { symbol: "lei", code: "RON" },
	"NZD - New Zealand Dollar": { symbol: "NZ$", code: "NZD" },
	"CLP - Chilean Peso": { symbol: "CL$", code: "CLP" },
	"COP - Colombian Peso": { symbol: "COL$", code: "COP" },
	"PEN - Peruvian Sol": { symbol: "S/", code: "PEN" },
	"ARS - Argentine Peso": { symbol: "AR$", code: "ARS" },
	"QAR - Qatari Riyal": { symbol: "QR", code: "QAR" },
	"BHD - Bahraini Dinar": { symbol: "BD", code: "BHD" },
	"KWD - Kuwaiti Dinar": { symbol: "KD", code: "KWD" },
	"OMR - Omani Rial": { symbol: "OMR ", code: "OMR" },
	"JOD - Jordanian Dinar": { symbol: "JD", code: "JOD" },
	"LBP - Lebanese Pound": { symbol: "L\u00A3", code: "LBP" },
	"BDT - Bangladeshi Taka": { symbol: "\u09F3", code: "BDT" },
	"LKR - Sri Lankan Rupee": { symbol: "LKR ", code: "LKR" },
	"NPR - Nepalese Rupee": { symbol: "NPR ", code: "NPR" },
	"RUB - Russian Ruble": { symbol: "\u20BD", code: "RUB" },
	"UAH - Ukrainian Hryvnia": { symbol: "\u20B4", code: "UAH" },
	"ILS - Israeli Shekel": { symbol: "\u20AA", code: "ILS" },
};

export function getCurrencySymbol(currency: string): string {
	const entry = CURRENCY_MAP[currency];
	if (entry) return entry.symbol;
	// fallback: check code prefix
	for (const val of Object.values(CURRENCY_MAP)) {
		if (currency.startsWith(val.code)) return val.symbol;
	}
	return "$";
}

export function getCurrencyCode(currency: string): string {
	const entry = CURRENCY_MAP[currency];
	if (entry) return entry.code;
	return currency.split(" ")[0] || "USD";
}

// ── Storage Keys ──

const KEYS = {
	clients: "billingo_clients",
	invoices: "billingo_invoices",
	invoiceCounter: "billingo_invoice_counter",
} as const;

// ── Generic Helpers ──

function readList<T>(key: string): T[] {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function writeList<T>(key: string, data: T[]): void {
	localStorage.setItem(key, JSON.stringify(data));
}

// ── User Profile (derived from onboarding data) ──

export function getUserProfile(): UserProfile {
	const onboarding = localStorage.getItem("billingo_onboarding");
	const user = localStorage.getItem("billingo_user");

	let name = "User";
	let email = "";
	if (user) {
		try {
			const u = JSON.parse(user);
			name = u.fullName || "User";
			email = u.email || "";
		} catch {
			// ignore
		}
	}

	let businessType = "company";
	let country = "United States";
	let currency = "USD - US Dollar";
	let taxEnabled = false;
	let taxRate = 0;
	let servicesEnabled: string[] = ["invoicing"];

	if (onboarding) {
		try {
			const o = JSON.parse(onboarding);
			businessType = o.businessType || businessType;
			country = o.country || country;
			currency = o.currency || currency;
			taxEnabled = o.chargesTax === true;
			taxRate = o.chargesTax ? parseFloat(o.taxPercentage) || 0 : 0;
			servicesEnabled = o.services || servicesEnabled;
		} catch {
			// ignore
		}
	}

	return {
		id: "user-1",
		name,
		email,
		businessType,
		country,
		currency,
		taxEnabled,
		taxRate,
		servicesEnabled,
	};
}

// ── Client CRUD ──

export function getClients(): Client[] {
	return readList<Client>(KEYS.clients);
}

export function getClientById(id: string): Client | undefined {
	return getClients().find((c) => c.id === id);
}

export function saveClient(client: Omit<Client, "id" | "totalBilled" | "totalPaid" | "outstandingAmount">): Client {
	const clients = getClients();
	const newClient: Client = {
		...client,
		id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		totalBilled: 0,
		totalPaid: 0,
		outstandingAmount: 0,
	};
	clients.push(newClient);
	writeList(KEYS.clients, clients);
	logActivity("client_created", `Client "${newClient.name}" created`);
	return newClient;
}

export function updateClient(id: string, updates: Partial<Client>): void {
	const clients = getClients();
	const idx = clients.findIndex((c) => c.id === id);
	if (idx !== -1) {
		clients[idx] = { ...clients[idx], ...updates };
		writeList(KEYS.clients, clients);
	}
}

// ── Invoice Number Generation ──

function getNextInvoiceNumber(): string {
	const raw = localStorage.getItem(KEYS.invoiceCounter);
	const counter = raw ? parseInt(raw, 10) + 1 : 1;
	localStorage.setItem(KEYS.invoiceCounter, String(counter));
	return `INV-${String(counter).padStart(4, "0")}`;
}

// ── Invoice CRUD ──

export function getInvoices(): Invoice[] {
	return readList<Invoice>(KEYS.invoices);
}

export function getInvoiceById(id: string): Invoice | undefined {
	return getInvoices().find((inv) => inv.id === id);
}

export function createInvoice(data: {
	clientId: string;
	items: Omit<InvoiceItem, "id" | "total">[];
	currency: string;
	currencyCode?: string;
	taxEnabled: boolean;
	taxRate: number;
	dueDate: string;
	branchId?: string;
	taxName?: string;
}): Invoice {
	const items: InvoiceItem[] = data.items.map((it) => ({
		...it,
		id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		total: it.quantity * it.price,
	}));

	const subtotal = items.reduce((sum, it) => sum + it.total, 0);
	const taxAmount = data.taxEnabled ? subtotal * (data.taxRate / 100) : 0;
	const grandTotal = subtotal + taxAmount;

	const invoice: Invoice = {
		id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		invoiceNumber: getNextInvoiceNumber(),
		clientId: data.clientId,
		items,
		subtotal,
		taxAmount,
		grandTotal,
		currency: data.currency,
		currencyCode: data.currencyCode,
		status: "Unpaid",
		issueDate: new Date().toISOString().split("T")[0],
		dueDate: data.dueDate,
		branchId: data.branchId,
		taxName: data.taxName,
	};

	const invoices = getInvoices();
	invoices.push(invoice);
	writeList(KEYS.invoices, invoices);

	// Reduce stock for product-linked items
	for (const item of items) {
		if (item.productId) {
			reduceStock(item.productId, item.quantity);
		}
	}

	// Update client totals
	recalculateClientTotals(data.clientId);

	logActivity("invoice_created", `Invoice ${invoice.invoiceNumber} created for $${invoice.grandTotal.toFixed(2)}`);
	return invoice;
}

export function updateInvoice(id: string, data: {
	clientId: string;
	items: Omit<InvoiceItem, "id" | "total">[];
	currency: string;
	currencyCode?: string;
	taxEnabled: boolean;
	taxRate: number;
	dueDate: string;
	branchId?: string;
	taxName?: string;
}): Invoice | undefined {
	const invoices = getInvoices();
	const idx = invoices.findIndex((inv) => inv.id === id);
	if (idx === -1) return undefined;

	const oldClientId = invoices[idx].clientId;

	const items: InvoiceItem[] = data.items.map((it) => ({
		...it,
		id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		total: it.quantity * it.price,
	}));

	const subtotal = items.reduce((sum, it) => sum + it.total, 0);
	const taxAmount = data.taxEnabled ? subtotal * (data.taxRate / 100) : 0;
	const grandTotal = subtotal + taxAmount;

	invoices[idx] = {
		...invoices[idx],
		clientId: data.clientId,
		items,
		subtotal,
		taxAmount,
		grandTotal,
		currency: data.currency,
		currencyCode: data.currencyCode,
		dueDate: data.dueDate,
		branchId: data.branchId,
		taxName: data.taxName,
	};

	writeList(KEYS.invoices, invoices);

	recalculateClientTotals(data.clientId);
	if (oldClientId !== data.clientId) {
		recalculateClientTotals(oldClientId);
	}

	logActivity("invoice_edited", `Invoice ${invoices[idx].invoiceNumber} updated`);
	return invoices[idx];
}

export function markInvoicePaid(id: string): void {
	const invoices = getInvoices();
	const idx = invoices.findIndex((inv) => inv.id === id);
	if (idx !== -1) {
		invoices[idx].status = "Paid";
		writeList(KEYS.invoices, invoices);
		recalculateClientTotals(invoices[idx].clientId);
		logActivity("payment_marked", `Invoice ${invoices[idx].invoiceNumber} marked as paid ($${invoices[idx].grandTotal.toFixed(2)})`);
	}
}

export function deleteInvoice(id: string): void {
	const invoices = getInvoices();
	const invoice = invoices.find((inv) => inv.id === id);
	if (!invoice) return;
	const clientId = invoice.clientId;
	const invNumber = invoice.invoiceNumber;
	writeList(
		KEYS.invoices,
		invoices.filter((inv) => inv.id !== id),
	);
	recalculateClientTotals(clientId);
	logActivity("invoice_deleted", `Invoice ${invNumber} deleted`);
}

// ── Status Auto-Update ──

export function refreshInvoiceStatuses(): void {
	const invoices = getInvoices();
	const today = new Date().toISOString().split("T")[0];
	let changed = false;

	for (const inv of invoices) {
		if (inv.status === "Unpaid" && inv.dueDate < today) {
			inv.status = "Overdue";
			changed = true;
		}
	}

	if (changed) {
		writeList(KEYS.invoices, invoices);
	}
}

// ── Client Balance Recalculation ──

export function recalculateClientTotals(clientId: string): void {
	const invoices = getInvoices();
	const clientInvoices = invoices.filter((inv) => inv.clientId === clientId);

	const totalBilled = clientInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
	const totalPaid = clientInvoices
		.filter((inv) => inv.status === "Paid")
		.reduce((sum, inv) => sum + inv.grandTotal, 0);
	const outstandingAmount = totalBilled - totalPaid;

	updateClient(clientId, { totalBilled, totalPaid, outstandingAmount });
}

// ── Report Aggregates ──

export interface ReportSummary {
	totalRevenue: number;
	totalOutstanding: number;
	paidCount: number;
	overdueCount: number;
	unpaidCount: number;
	totalInvoices: number;
}

export function getReportSummary(): ReportSummary {
	refreshInvoiceStatuses();
	const invoices = getInvoices();

	const paid = invoices.filter((inv) => inv.status === "Paid");
	const overdue = invoices.filter((inv) => inv.status === "Overdue");
	const unpaid = invoices.filter((inv) => inv.status === "Unpaid");

	return {
		totalRevenue: paid.reduce((sum, inv) => sum + inv.grandTotal, 0),
		totalOutstanding: [...overdue, ...unpaid].reduce((sum, inv) => sum + inv.grandTotal, 0),
		paidCount: paid.length,
		overdueCount: overdue.length,
		unpaidCount: unpaid.length,
		totalInvoices: invoices.length,
	};
}
