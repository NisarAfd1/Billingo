// ─────────────────────────────────────────────────
// Billingo AI Intelligence Engine
// Separated AI logic from UI — ready for real API integration later
// ─────────────────────────────────────────────────

import {
	type Invoice,
	type Client,
	getInvoices,
	getClients,
	getClientById,
	getUserProfile,
	getCurrencySymbol,
	saveClient,
	createInvoice,
	refreshInvoiceStatuses,
	getReportSummary,
} from "./billing-store";

// ══════════════════════════════════════════════════
// PART 2: Natural Language Invoice Parser
// ══════════════════════════════════════════════════

export interface ParsedInvoice {
	clientName: string;
	items: { description: string; quantity: number; price: number }[];
	currency: string;
	dueDate: string;
	totalAmount: number;
}

export interface ParseResult {
	success: boolean;
	parsed: ParsedInvoice | null;
	error?: string;
}

const CURRENCY_KEYWORDS: Record<string, string> = {
	pkr: "PKR - Pakistani Rupee",
	rs: "PKR - Pakistani Rupee",
	rupees: "PKR - Pakistani Rupee",
	usd: "USD - US Dollar",
	dollar: "USD - US Dollar",
	dollars: "USD - US Dollar",
	"$": "USD - US Dollar",
	eur: "EUR - Euro",
	euro: "EUR - Euro",
	euros: "EUR - Euro",
	gbp: "GBP - British Pound",
	pound: "GBP - British Pound",
	pounds: "GBP - British Pound",
	inr: "INR - Indian Rupee",
	aed: "AED - UAE Dirham",
	dirham: "AED - UAE Dirham",
	jpy: "JPY - Japanese Yen",
	yen: "JPY - Japanese Yen",
	cad: "CAD - Canadian Dollar",
	aud: "AUD - Australian Dollar",
};

function extractCurrency(text: string): string | null {
	const lower = text.toLowerCase();
	for (const [keyword, value] of Object.entries(CURRENCY_KEYWORDS)) {
		if (lower.includes(keyword)) return value;
	}
	return null;
}

function extractPrice(text: string): number | null {
	// Match patterns like 20,000, 20000, $500, Rs 5000, 1500.50
	const pricePatterns = [
		/(?:rs\.?|pkr|usd|\$|€|£|¥|inr|aed|eur|gbp)\s*([\d,]+(?:\.\d{1,2})?)/i,
		/([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|pkr|usd|dollars?|euros?|pounds?|rupees?|inr|aed|eur|gbp)/i,
		/([\d,]+(?:\.\d{1,2})?)\s*(?:each|per|total|price)/i,
	];

	for (const pattern of pricePatterns) {
		const match = text.match(pattern);
		if (match) {
			return parseFloat(match[1].replace(/,/g, ""));
		}
	}

	// Fallback: find large numbers (likely prices)
	const numbers = text.match(/[\d,]+(?:\.\d{1,2})?/g);
	if (numbers) {
		const parsed = numbers
			.map((n) => parseFloat(n.replace(/,/g, "")))
			.filter((n) => n >= 10); // prices are usually >= 10
		if (parsed.length > 0) {
			return Math.max(...parsed); // largest number is likely the price
		}
	}
	return null;
}

function extractQuantity(text: string): number {
	const qtyPatterns = [
		/(\d+)\s*(?:x\s|units?\s|items?\s|pieces?\s|pcs?\s|qty\s|quantity\s)/i,
		/(?:qty|quantity)\s*(?:of\s|:\s*)?\s*(\d+)/i,
		/(\d+)\s+(?:logo|page|hour|design|website|app|project|service|task|session|report|article|video|photo|image)/i,
	];

	for (const pattern of qtyPatterns) {
		const match = text.match(pattern);
		if (match) return parseInt(match[1], 10);
	}
	return 1;
}

function extractDueDate(text: string): string {
	const lower = text.toLowerCase();

	// "due in X days"
	const daysMatch = lower.match(/due\s+in\s+(\d+)\s*days?/i);
	if (daysMatch) {
		const days = parseInt(daysMatch[1], 10);
		const d = new Date();
		d.setDate(d.getDate() + days);
		return d.toISOString().split("T")[0];
	}

	// "due by [date]"
	const byMatch = lower.match(
		/due\s+(?:by|on|before)\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
	);
	if (byMatch) {
		const parsed = new Date(byMatch[1]);
		if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
	}

	// "next week"
	if (lower.includes("next week")) {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().split("T")[0];
	}

	// "next month"
	if (lower.includes("next month")) {
		const d = new Date();
		d.setMonth(d.getMonth() + 1);
		return d.toISOString().split("T")[0];
	}

	// "tomorrow"
	if (lower.includes("tomorrow")) {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d.toISOString().split("T")[0];
	}

	// Default: 30 days from now
	const d = new Date();
	d.setDate(d.getDate() + 30);
	return d.toISOString().split("T")[0];
}

function extractClientName(text: string): string | null {
	// "for [Name]" pattern
	const forMatch = text.match(
		/(?:for|to|client|customer|bill)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,
	);
	if (forMatch) return forMatch[1].trim();

	// "invoice [Name]" pattern
	const invMatch = text.match(
		/invoice\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
	);
	if (invMatch) return invMatch[1].trim();

	return null;
}

function extractItemDescription(text: string): string {
	const lower = text.toLowerCase();

	// Try to find description between quantity and price
	const descPatterns = [
		/\d+\s+(.+?)(?:\s+(?:at|@|for)\s+)/i,
		/(?:for\s+\w+(?:\s+\w+)*\s*[-–—]\s*)(.+?)(?:\s*[-–—]\s*[\d,])/i,
		/[-–—]\s*(\d+\s+.+?)(?:\s*[-–—])/i,
	];

	for (const pattern of descPatterns) {
		const match = text.match(pattern);
		if (match) return match[1].trim();
	}

	// Common service keywords
	const services = [
		"logo design",
		"web design",
		"website design",
		"website development",
		"web development",
		"app development",
		"mobile app",
		"graphic design",
		"branding",
		"seo",
		"marketing",
		"consulting",
		"photography",
		"videography",
		"copywriting",
		"content writing",
		"social media",
		"ui design",
		"ux design",
		"illustration",
		"animation",
		"editing",
		"translation",
		"accounting",
		"maintenance",
		"hosting",
		"support",
		"training",
		"development",
		"design",
	];

	for (const service of services) {
		if (lower.includes(service)) return service.replace(/^\w/, (c) => c.toUpperCase());
	}

	return "Professional Services";
}

export function parseNaturalLanguage(text: string): ParseResult {
	if (!text || text.trim().length < 5) {
		return { success: false, parsed: null, error: "Input too short. Please provide more detail." };
	}

	const clientName = extractClientName(text);
	if (!clientName) {
		return {
			success: false,
			parsed: null,
			error: "Could not identify client name. Use format: 'for [Client Name]'",
		};
	}

	const price = extractPrice(text);
	if (!price) {
		return {
			success: false,
			parsed: null,
			error: "Could not identify price. Include an amount like '20,000 PKR'",
		};
	}

	const profile = getUserProfile();
	const quantity = extractQuantity(text);
	const description = extractItemDescription(text);
	const currency = extractCurrency(text) || profile.currency;
	const dueDate = extractDueDate(text);

	const unitPrice = price / quantity;

	return {
		success: true,
		parsed: {
			clientName,
			items: [{ description, quantity, price: unitPrice }],
			currency,
			dueDate,
			totalAmount: price,
		},
	};
}

export function executeInvoiceFromParsed(parsed: ParsedInvoice): {
	invoice: Invoice;
	clientCreated: boolean;
	client: Client;
} {
	const profile = getUserProfile();

	// Find or create client
	const clients = getClients();
	let client = clients.find(
		(c) => c.name.toLowerCase() === parsed.clientName.toLowerCase(),
	);
	let clientCreated = false;

	if (!client) {
		client = saveClient({
			name: parsed.clientName,
			email: "",
			phone: "",
			address: "",
		});
		clientCreated = true;
	}

	const invoice = createInvoice({
		clientId: client.id,
		items: parsed.items,
		currency: parsed.currency,
		taxEnabled: profile.taxEnabled,
		taxRate: profile.taxRate,
		dueDate: parsed.dueDate,
	});

	return { invoice, clientCreated, client };
}

// ══════════════════════════════════════════════════
// PART 3: AI Financial Insights Engine
// ══════════════════════════════════════════════════

export interface AIInsight {
	id: string;
	type: "positive" | "warning" | "info" | "action";
	icon: "trending-up" | "alert" | "info" | "users" | "dollar" | "calendar";
	title: string;
	description: string;
}

export function generateInsights(): AIInsight[] {
	refreshInvoiceStatuses();
	const invoices = getInvoices();
	const clients = getClients();
	const summary = getReportSummary();
	const profile = getUserProfile();
	const sym = getCurrencySymbol(profile.currency);
	const insights: AIInsight[] = [];

	if (invoices.length === 0) {
		insights.push({
			id: "no-data",
			type: "info",
			icon: "info",
			title: "Get Started",
			description:
				"Create your first invoice to start receiving AI-powered business insights.",
		});
		return insights;
	}

	// Revenue trend analysis (compare recent vs older invoices)
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

	const recentPaid = invoices.filter(
		(inv) =>
			inv.status === "Paid" && new Date(inv.issueDate) >= thirtyDaysAgo,
	);
	const olderPaid = invoices.filter(
		(inv) =>
			inv.status === "Paid" &&
			new Date(inv.issueDate) >= sixtyDaysAgo &&
			new Date(inv.issueDate) < thirtyDaysAgo,
	);

	const recentRevenue = recentPaid.reduce(
		(s, inv) => s + inv.grandTotal,
		0,
	);
	const olderRevenue = olderPaid.reduce((s, inv) => s + inv.grandTotal, 0);

	if (olderRevenue > 0) {
		const pctChange = ((recentRevenue - olderRevenue) / olderRevenue) * 100;
		if (pctChange > 0) {
			insights.push({
				id: "revenue-up",
				type: "positive",
				icon: "trending-up",
				title: "Revenue Growth",
				description: `Your revenue increased ${Math.round(pctChange)}% compared to last period. Current period: ${sym}${recentRevenue.toLocaleString()}.`,
			});
		} else if (pctChange < -5) {
			insights.push({
				id: "revenue-down",
				type: "warning",
				icon: "trending-up",
				title: "Revenue Decline",
				description: `Revenue dropped ${Math.abs(Math.round(pctChange))}% compared to last period. Consider sending follow-ups to pending clients.`,
			});
		}
	} else if (recentRevenue > 0) {
		insights.push({
			id: "first-revenue",
			type: "positive",
			icon: "dollar",
			title: "Revenue Incoming",
			description: `You've earned ${sym}${recentRevenue.toLocaleString()} in the last 30 days. Keep the momentum going!`,
		});
	}

	// Overdue invoice alerts
	if (summary.overdueCount > 0) {
		insights.push({
			id: "overdue-alert",
			type: "warning",
			icon: "alert",
			title: "Overdue Payments",
			description: `You have ${summary.overdueCount} overdue invoice${summary.overdueCount > 1 ? "s" : ""} totaling ${sym}${invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.grandTotal, 0).toLocaleString()}. Consider sending payment reminders.`,
		});
	}

	// Client with most unpaid invoices
	const clientUnpaidMap: Record<string, number> = {};
	for (const inv of invoices) {
		if (inv.status !== "Paid") {
			clientUnpaidMap[inv.clientId] =
				(clientUnpaidMap[inv.clientId] || 0) + 1;
		}
	}
	const topUnpaidEntry = Object.entries(clientUnpaidMap).sort(
		(a, b) => b[1] - a[1],
	)[0];
	if (topUnpaidEntry && topUnpaidEntry[1] >= 2) {
		const client = getClientById(topUnpaidEntry[0]);
		if (client) {
			insights.push({
				id: "client-unpaid",
				type: "action",
				icon: "users",
				title: "Follow Up Required",
				description: `Client ${client.name} has ${topUnpaidEntry[1]} unpaid invoices. Consider reaching out.`,
			});
		}
	}

	// Highest earning category
	const categoryRevenue: Record<string, number> = {};
	for (const inv of invoices.filter((i) => i.status === "Paid")) {
		for (const item of inv.items) {
			const cat = item.description || "Other";
			categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.total;
		}
	}
	const topCategory = Object.entries(categoryRevenue).sort(
		(a, b) => b[1] - a[1],
	)[0];
	if (topCategory) {
		insights.push({
			id: "top-category",
			type: "info",
			icon: "dollar",
			title: "Top Earning Service",
			description: `Your highest earning category is "${topCategory[0]}" with ${sym}${topCategory[1].toLocaleString()} in revenue.`,
		});
	}

	// Payment collection rate
	if (summary.totalInvoices >= 3) {
		const collectionRate = Math.round(
			(summary.paidCount / summary.totalInvoices) * 100,
		);
		if (collectionRate >= 80) {
			insights.push({
				id: "collection-good",
				type: "positive",
				icon: "trending-up",
				title: "Strong Collection Rate",
				description: `Your payment collection rate is ${collectionRate}%. This is excellent.`,
			});
		} else if (collectionRate < 50) {
			insights.push({
				id: "collection-low",
				type: "warning",
				icon: "alert",
				title: "Low Collection Rate",
				description: `Only ${collectionRate}% of invoices are paid. Consider implementing stricter payment terms.`,
			});
		}
	}

	// Client count insight
	if (clients.length > 0) {
		insights.push({
			id: "client-count",
			type: "info",
			icon: "users",
			title: "Client Base",
			description: `You have ${clients.length} client${clients.length > 1 ? "s" : ""} on record with a total billing of ${sym}${clients.reduce((s, c) => s + c.totalBilled, 0).toLocaleString()}.`,
		});
	}

	return insights;
}

// ══════════════════════════════════════════════════
// PART 4: Smart Payment Reminder Generator
// ══════════════════════════════════════════════════

export interface PaymentReminder {
	invoiceId: string;
	invoiceNumber: string;
	clientName: string;
	clientEmail: string;
	amount: string;
	dueDate: string;
	daysOverdue: number;
	message: string;
}

export function generatePaymentReminders(): PaymentReminder[] {
	refreshInvoiceStatuses();
	const invoices = getInvoices();
	const profile = getUserProfile();
	const sym = getCurrencySymbol(profile.currency);
	const today = new Date();

	const overdueInvoices = invoices.filter(
		(inv) => inv.status === "Overdue",
	);

	return overdueInvoices.map((inv) => {
		const client = getClientById(inv.clientId);
		const clientName = client?.name || "Valued Client";
		const clientEmail = client?.email || "";
		const daysOverdue = Math.floor(
			(today.getTime() - new Date(inv.dueDate).getTime()) /
				(1000 * 60 * 60 * 24),
		);

		const formattedAmount = `${sym}${inv.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		const formattedDue = new Date(inv.dueDate).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});

		let urgency = "";
		if (daysOverdue > 30) {
			urgency =
				" This matter requires immediate attention to avoid any disruption in our business relationship.";
		} else if (daysOverdue > 14) {
			urgency =
				" We would greatly appreciate prompt attention to this matter.";
		}

		const message = `Dear ${clientName},\n\nThis is a friendly reminder that invoice ${inv.invoiceNumber} for ${formattedAmount} was due on ${formattedDue} and is currently ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue.${urgency}\n\nKindly process the payment at your earliest convenience. If you have already made the payment, please disregard this notice.\n\nThank you for your continued business.\n\nBest regards,\n${profile.name}`;

		return {
			invoiceId: inv.id,
			invoiceNumber: inv.invoiceNumber,
			clientName,
			clientEmail,
			amount: formattedAmount,
			dueDate: formattedDue,
			daysOverdue,
			message,
		};
	});
}

// ══════════════════════════════════════════════════
// PART 5: Revenue Forecast Simulation
// ══════════════════════════════════════════════════

export interface RevenueForecast {
	last30DaysRevenue: number;
	averageInvoiceValue: number;
	invoicesPerMonth: number;
	projectedMonthly: number;
	projectedAnnual: number;
	monthlyData: { month: string; actual: number; projected: number }[];
}

export function generateRevenueForecast(): RevenueForecast {
	refreshInvoiceStatuses();
	const invoices = getInvoices();
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Last 30 days paid revenue
	const recentPaid = invoices.filter(
		(inv) =>
			inv.status === "Paid" && new Date(inv.issueDate) >= thirtyDaysAgo,
	);
	const last30DaysRevenue = recentPaid.reduce(
		(s, inv) => s + inv.grandTotal,
		0,
	);

	// All paid invoices for averages
	const allPaid = invoices.filter((inv) => inv.status === "Paid");
	const averageInvoiceValue =
		allPaid.length > 0
			? allPaid.reduce((s, inv) => s + inv.grandTotal, 0) / allPaid.length
			: 0;

	// Invoices per month (based on history)
	const firstInvoiceDate =
		invoices.length > 0
			? new Date(
					Math.min(
						...invoices.map((inv) => new Date(inv.issueDate).getTime()),
					),
				)
			: now;
	const monthsActive = Math.max(
		1,
		(now.getTime() - firstInvoiceDate.getTime()) / (30 * 24 * 60 * 60 * 1000),
	);
	const invoicesPerMonth = invoices.length / monthsActive;

	// Projections
	const projectedMonthly = Math.max(
		last30DaysRevenue,
		averageInvoiceValue * invoicesPerMonth,
	);
	const projectedAnnual = projectedMonthly * 12;

	// Build monthly data (last 6 months + next 3 projected)
	const monthlyData: { month: string; actual: number; projected: number }[] =
		[];
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	// Last 6 months actual
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		const monthPaid = invoices
			.filter(
				(inv) =>
					inv.status === "Paid" &&
					new Date(inv.issueDate) >= d &&
					new Date(inv.issueDate) <= monthEnd,
			)
			.reduce((s, inv) => s + inv.grandTotal, 0);

		monthlyData.push({
			month: months[d.getMonth()],
			actual: monthPaid,
			projected: 0,
		});
	}

	// Next 3 months projected
	for (let i = 1; i <= 3; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
		// Add slight growth factor (2% per month)
		const growth = 1 + 0.02 * i;
		monthlyData.push({
			month: months[d.getMonth()],
			actual: 0,
			projected: Math.round(projectedMonthly * growth),
		});
	}

	return {
		last30DaysRevenue,
		averageInvoiceValue,
		invoicesPerMonth: Math.round(invoicesPerMonth * 10) / 10,
		projectedMonthly,
		projectedAnnual,
		monthlyData,
	};
}

// ══════════════════════════════════════════════════
// PART 6: AI Business Health Score
// ══════════════════════════════════════════════════

export interface HealthScore {
	overall: number; // 0-100
	factors: {
		label: string;
		score: number;
		weight: number;
		description: string;
	}[];
	grade: "A" | "B" | "C" | "D" | "F";
	summary: string;
}

export function calculateHealthScore(): HealthScore {
	refreshInvoiceStatuses();
	const invoices = getInvoices();
	const summary = getReportSummary();
	const factors: {
		label: string;
		score: number;
		weight: number;
		description: string;
	}[] = [];

	if (invoices.length === 0) {
		return {
			overall: 0,
			factors: [
				{
					label: "No Data",
					score: 0,
					weight: 1,
					description: "Create invoices to generate a health score.",
				},
			],
			grade: "F",
			summary: "Start creating invoices to build your business health profile.",
		};
	}

	// Factor 1: Payment Collection Rate (weight: 40%)
	const collectionRate =
		summary.totalInvoices > 0
			? (summary.paidCount / summary.totalInvoices) * 100
			: 0;
	factors.push({
		label: "Payment Collection",
		score: Math.round(collectionRate),
		weight: 40,
		description: `${summary.paidCount} of ${summary.totalInvoices} invoices paid (${Math.round(collectionRate)}%)`,
	});

	// Factor 2: Overdue Ratio (weight: 30%) — inverted (lower is better)
	const overdueRatio =
		summary.totalInvoices > 0
			? (summary.overdueCount / summary.totalInvoices) * 100
			: 0;
	const overdueScore = Math.max(0, 100 - overdueRatio * 3); // Penalize heavily
	factors.push({
		label: "On-Time Payments",
		score: Math.round(overdueScore),
		weight: 30,
		description: `${summary.overdueCount} overdue out of ${summary.totalInvoices} total invoices`,
	});

	// Factor 3: Revenue Consistency (weight: 30%)
	const now = new Date();
	const monthlyTotals: number[] = [];
	for (let i = 0; i < 3; i++) {
		const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
		const monthRevenue = invoices
			.filter(
				(inv) =>
					inv.status === "Paid" &&
					new Date(inv.issueDate) >= start &&
					new Date(inv.issueDate) <= end,
			)
			.reduce((s, inv) => s + inv.grandTotal, 0);
		monthlyTotals.push(monthRevenue);
	}

	let consistencyScore = 50; // Base
	const nonZeroMonths = monthlyTotals.filter((v) => v > 0).length;
	if (nonZeroMonths >= 3) {
		const avg =
			monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
		if (avg > 0) {
			const variance =
				monthlyTotals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) /
				monthlyTotals.length;
			const cv = Math.sqrt(variance) / avg; // coefficient of variation
			consistencyScore = Math.max(0, Math.min(100, 100 - cv * 100));
		}
	} else if (nonZeroMonths >= 1) {
		consistencyScore = 60;
	}

	factors.push({
		label: "Revenue Consistency",
		score: Math.round(consistencyScore),
		weight: 30,
		description: `Based on revenue patterns across recent months`,
	});

	// Calculate weighted overall
	const overall = Math.round(
		factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0),
	);

	// Grade
	let grade: "A" | "B" | "C" | "D" | "F";
	if (overall >= 85) grade = "A";
	else if (overall >= 70) grade = "B";
	else if (overall >= 55) grade = "C";
	else if (overall >= 40) grade = "D";
	else grade = "F";

	// Summary
	let summaryText: string;
	if (grade === "A") {
		summaryText =
			"Excellent! Your business finances are in great shape with strong collection rates and consistent revenue.";
	} else if (grade === "B") {
		summaryText =
			"Good performance. A few overdue invoices to follow up on, but overall healthy finances.";
	} else if (grade === "C") {
		summaryText =
			"Fair condition. Consider improving payment collection and following up on overdue invoices.";
	} else if (grade === "D") {
		summaryText =
			"Needs attention. High overdue ratio and inconsistent revenue patterns detected.";
	} else {
		summaryText =
			"Critical. Significant issues with payment collection and revenue consistency require immediate action.";
	}

	return { overall, factors, grade, summary: summaryText };
}
