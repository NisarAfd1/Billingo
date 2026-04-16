// ─────────────────────────────────────────────────
// Billingo Fraud & Risk Alert Engine
// Duplicate detection, anomaly detection, alerts
// ─────────────────────────────────────────────────

import { getInvoices } from "@/lib/billing-store";
import { getActivityLogs } from "@/lib/activity-log";

const ALERTS_KEY = "billingo_security_alerts";

export type AlertSeverity = "critical" | "warning" | "info";

export interface SecurityAlert {
	id: string;
	severity: AlertSeverity;
	title: string;
	description: string;
	timestamp: string;
	dismissed: boolean;
	category: "duplicate" | "anomaly" | "auth" | "revenue";
}

/** Get all security alerts */
export function getSecurityAlerts(): SecurityAlert[] {
	try {
		const raw = localStorage.getItem(ALERTS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** Get active (not dismissed) alerts */
export function getActiveAlerts(): SecurityAlert[] {
	return getSecurityAlerts().filter((a) => !a.dismissed);
}

/** Dismiss an alert */
export function dismissAlert(alertId: string): void {
	const alerts = getSecurityAlerts();
	const idx = alerts.findIndex((a) => a.id === alertId);
	if (idx !== -1) {
		alerts[idx].dismissed = true;
		localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
	}
}

/** Dismiss all alerts */
export function dismissAllAlerts(): void {
	const alerts = getSecurityAlerts();
	for (const alert of alerts) {
		alert.dismissed = true;
	}
	localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/** Add an alert (avoids duplicates by title within 1 hour) */
function addAlert(alert: Omit<SecurityAlert, "id" | "timestamp" | "dismissed">): void {
	const alerts = getSecurityAlerts();
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

	// Deduplicate: skip if same title exists within the last hour
	const exists = alerts.some(
		(a) => a.title === alert.title && a.timestamp > oneHourAgo && !a.dismissed,
	);
	if (exists) return;

	const newAlert: SecurityAlert = {
		...alert,
		id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		timestamp: new Date().toISOString(),
		dismissed: false,
	};

	alerts.unshift(newAlert);

	// Keep only last 100 alerts
	if (alerts.length > 100) alerts.length = 100;

	localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

// ── Detection Functions ──

/** Detect duplicate invoice numbers */
export function detectDuplicateInvoices(): SecurityAlert[] {
	const invoices = getInvoices();
	const seen = new Map<string, number>();
	const found: SecurityAlert[] = [];

	for (const inv of invoices) {
		const count = (seen.get(inv.invoiceNumber) || 0) + 1;
		seen.set(inv.invoiceNumber, count);

		if (count === 2) {
			addAlert({
				severity: "warning",
				title: `Duplicate Invoice: ${inv.invoiceNumber}`,
				description: `Invoice number ${inv.invoiceNumber} appears more than once. This may indicate a data integrity issue.`,
				category: "duplicate",
			});
		}
	}

	return found;
}

/** Detect extremely large invoice amounts (anomaly) */
export function detectAnomalousAmounts(): void {
	const invoices = getInvoices();
	if (invoices.length < 3) return;

	// Calculate average and standard deviation
	const totals = invoices.map((inv) => inv.grandTotal);
	const avg = totals.reduce((sum, v) => sum + v, 0) / totals.length;
	const stdDev = Math.sqrt(
		totals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / totals.length,
	);

	// Flag invoices > 3 standard deviations above mean
	const threshold = avg + 3 * stdDev;

	for (const inv of invoices) {
		if (inv.grandTotal > threshold && inv.grandTotal > 10000) {
			addAlert({
				severity: "warning",
				title: `Unusual Amount: ${inv.invoiceNumber}`,
				description: `Invoice ${inv.invoiceNumber} has an unusually large amount ($${inv.grandTotal.toLocaleString()}). Average invoice is $${avg.toFixed(2)}.`,
				category: "anomaly",
			});
		}
	}
}

/** Detect too many failed login attempts */
export function detectFailedLogins(): void {
	const logs = getActivityLogs();
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

	const recentFailures = logs.filter(
		(log) => log.actionType === "login_failed" && log.timestamp > oneHourAgo,
	);

	if (recentFailures.length >= 3) {
		addAlert({
			severity: "critical",
			title: "Multiple Failed Login Attempts",
			description: `${recentFailures.length} failed login attempts detected in the last hour. This may indicate unauthorized access attempts.`,
			category: "auth",
		});
	}
}

/** Detect sudden revenue spikes */
export function detectRevenueSpikes(): void {
	const invoices = getInvoices();

	// Group invoices by day
	const dailyRevenue = new Map<string, number>();
	for (const inv of invoices) {
		if (inv.status === "Paid") {
			const day = inv.issueDate;
			dailyRevenue.set(day, (dailyRevenue.get(day) || 0) + inv.grandTotal);
		}
	}

	const days = Array.from(dailyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	if (days.length < 3) return;

	// Check if latest day has 5x the average
	const allButLast = days.slice(0, -1);
	const avgDaily = allButLast.reduce((sum, [, v]) => sum + v, 0) / allButLast.length;
	const latestDay = days[days.length - 1];

	if (latestDay && latestDay[1] > avgDaily * 5 && latestDay[1] > 5000) {
		addAlert({
			severity: "info",
			title: "Revenue Spike Detected",
			description: `Revenue on ${latestDay[0]} ($${latestDay[1].toLocaleString()}) is significantly higher than the daily average ($${avgDaily.toFixed(2)}).`,
			category: "revenue",
		});
	}
}

/** Run all fraud detection checks */
export function runAllFraudChecks(): void {
	detectDuplicateInvoices();
	detectAnomalousAmounts();
	detectFailedLogins();
	detectRevenueSpikes();
}
