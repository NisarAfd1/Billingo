// ─────────────────────────────────────────────────
// Billingo Data Backup System
// JSON/CSV export, scheduled backup structure
// ─────────────────────────────────────────────────

import { getInvoices, getClients } from "@/lib/billing-store";
import { getActivityLogs } from "@/lib/activity-log";
import { getBranches } from "@/lib/branch-store";
import { logActivity } from "@/lib/activity-log";

const BACKUP_HISTORY_KEY = "billingo_backup_history";

export interface BackupRecord {
	id: string;
	timestamp: string;
	type: "full" | "invoices" | "clients";
	format: "json" | "csv";
	recordCount: number;
}

/** Get backup history */
export function getBackupHistory(): BackupRecord[] {
	try {
		const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** Record a backup */
function recordBackup(type: BackupRecord["type"], format: BackupRecord["format"], count: number): void {
	const history = getBackupHistory();
	history.unshift({
		id: `bkp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		timestamp: new Date().toISOString(),
		type,
		format,
		recordCount: count,
	});
	// Keep last 50 backup records
	if (history.length > 50) history.length = 50;
	localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));
}

/** Export all data as JSON and trigger download */
export function exportFullBackupJSON(): void {
	const data = {
		exportedAt: new Date().toISOString(),
		version: "1.0",
		invoices: getInvoices(),
		clients: getClients(),
		branches: getBranches(),
		activityLogs: getActivityLogs(),
		settings: {
			taxConfig: safeGet("billingo_tax_config"),
			onboarding: safeGet("billingo_onboarding"),
			businessCurrency: localStorage.getItem("billingo_business_currency"),
			locale: localStorage.getItem("billingo_locale"),
		},
	};

	const totalRecords = data.invoices.length + data.clients.length + data.branches.length;
	downloadFile(
		JSON.stringify(data, null, 2),
		`billingo-backup-${formatDate()}.json`,
		"application/json",
	);

	recordBackup("full", "json", totalRecords);
	logActivity("backup_created", `Full JSON backup created (${totalRecords} records)`);
}

/** Export invoices as CSV */
export function exportInvoicesCSV(): void {
	const invoices = getInvoices();
	const headers = [
		"Invoice Number",
		"Client ID",
		"Status",
		"Issue Date",
		"Due Date",
		"Subtotal",
		"Tax Amount",
		"Grand Total",
		"Currency",
		"Branch ID",
		"Items Count",
	];

	const rows = invoices.map((inv) => [
		inv.invoiceNumber,
		inv.clientId,
		inv.status,
		inv.issueDate,
		inv.dueDate,
		inv.subtotal.toFixed(2),
		inv.taxAmount.toFixed(2),
		inv.grandTotal.toFixed(2),
		inv.currencyCode || inv.currency,
		inv.branchId || "",
		String(inv.items.length),
	]);

	const csv = [headers, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");

	downloadFile(csv, `billingo-invoices-${formatDate()}.csv`, "text/csv");
	recordBackup("invoices", "csv", invoices.length);
	logActivity("backup_created", `Invoices CSV backup created (${invoices.length} invoices)`);
}

/** Export clients as CSV */
export function exportClientsCSV(): void {
	const clients = getClients();
	const headers = ["Name", "Email", "Phone", "Address", "Total Billed", "Total Paid", "Outstanding"];

	const rows = clients.map((c) => [
		c.name,
		c.email,
		c.phone,
		c.address,
		c.totalBilled.toFixed(2),
		c.totalPaid.toFixed(2),
		c.outstandingAmount.toFixed(2),
	]);

	const csv = [headers, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");

	downloadFile(csv, `billingo-clients-${formatDate()}.csv`, "text/csv");
	recordBackup("clients", "csv", clients.length);
	logActivity("backup_created", `Clients CSV backup created (${clients.length} clients)`);
}

// ── Scheduled Backup Structure (simulated) ──

const SCHEDULE_KEY = "billingo_backup_schedule";

export interface BackupSchedule {
	enabled: boolean;
	frequency: "daily" | "weekly" | "monthly";
	lastRun: string | null;
	nextRun: string | null;
}

export function getBackupSchedule(): BackupSchedule {
	try {
		const raw = localStorage.getItem(SCHEDULE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore
	}
	return { enabled: false, frequency: "weekly", lastRun: null, nextRun: null };
}

export function setBackupSchedule(schedule: BackupSchedule): void {
	if (schedule.enabled && !schedule.nextRun) {
		const next = new Date();
		switch (schedule.frequency) {
			case "daily": next.setDate(next.getDate() + 1); break;
			case "weekly": next.setDate(next.getDate() + 7); break;
			case "monthly": next.setMonth(next.getMonth() + 1); break;
		}
		schedule.nextRun = next.toISOString().split("T")[0];
	}
	localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

// ── Helpers ──

function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function formatDate(): string {
	return new Date().toISOString().split("T")[0];
}

function safeGet(key: string): unknown {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
