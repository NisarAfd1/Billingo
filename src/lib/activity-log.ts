// ─────────────────────────────────────────────────
// Billingo Activity Log System
// Track all user actions for audit trail
// ─────────────────────────────────────────────────

const LOG_KEY = "billingo_activity_logs";
const MAX_LOGS = 500;

export type ActionType =
	| "invoice_created"
	| "invoice_edited"
	| "invoice_deleted"
	| "payment_marked"
	| "user_added"
	| "plan_upgraded"
	| "client_created"
	| "client_updated"
	| "settings_changed"
	| "login"
	| "logout"
	| "login_failed"
	| "backup_created"
	| "branch_created"
	| "branch_deleted"
	| "product_created"
	| "product_updated"
	| "product_deleted"
	| "pos_sale_completed"
	| "pos_sale_edited"
	| "pos_sale_deleted";

export interface ActivityLogEntry {
	id: string;
	userId: string;
	actionType: ActionType;
	description: string;
	timestamp: string;
	ipAddress: string; // placeholder
	metadata?: Record<string, string>;
}

/** Get all activity logs, newest first */
export function getActivityLogs(): ActivityLogEntry[] {
	try {
		const raw = localStorage.getItem(LOG_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** Get logs filtered by action type */
export function getLogsByAction(actionType: ActionType): ActivityLogEntry[] {
	return getActivityLogs().filter((log) => log.actionType === actionType);
}

/** Get logs within a date range */
export function getLogsByDateRange(start: string, end: string): ActivityLogEntry[] {
	return getActivityLogs().filter((log) => log.timestamp >= start && log.timestamp <= end);
}

/** Add a new activity log entry */
export function logActivity(
	actionType: ActionType,
	description: string,
	metadata?: Record<string, string>,
): ActivityLogEntry {
	const logs = getActivityLogs();

	const entry: ActivityLogEntry = {
		id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		userId: getUserId(),
		actionType,
		description,
		timestamp: new Date().toISOString(),
		ipAddress: "0.0.0.0", // placeholder - server would provide this
		metadata,
	};

	logs.unshift(entry);

	// Keep only most recent logs
	if (logs.length > MAX_LOGS) {
		logs.length = MAX_LOGS;
	}

	localStorage.setItem(LOG_KEY, JSON.stringify(logs));
	return entry;
}

/** Clear all activity logs */
export function clearActivityLogs(): void {
	localStorage.setItem(LOG_KEY, JSON.stringify([]));
}

/** Get the action type display label */
export function getActionLabel(actionType: ActionType): string {
	const labels: Record<ActionType, string> = {
		invoice_created: "Invoice Created",
		invoice_edited: "Invoice Edited",
		invoice_deleted: "Invoice Deleted",
		payment_marked: "Payment Marked",
		user_added: "User Added",
		plan_upgraded: "Plan Upgraded",
		client_created: "Client Created",
		client_updated: "Client Updated",
		settings_changed: "Settings Changed",
		login: "Login",
		logout: "Logout",
		login_failed: "Login Failed",
		backup_created: "Backup Created",
		branch_created: "Branch Created",
		branch_deleted: "Branch Deleted",
		product_created: "Product Created",
		product_updated: "Product Updated",
		product_deleted: "Product Deleted",
		pos_sale_completed: "POS Sale Completed",
		pos_sale_edited: "POS Sale Edited",
		pos_sale_deleted: "POS Sale Deleted",
	};
	return labels[actionType] || actionType;
}

/** Get icon color for action type */
export function getActionColor(actionType: ActionType): string {
	const colors: Record<ActionType, string> = {
		invoice_created: "text-emerald-600",
		invoice_edited: "text-blue-600",
		invoice_deleted: "text-red-600",
		payment_marked: "text-emerald-600",
		user_added: "text-indigo-600",
		plan_upgraded: "text-purple-600",
		client_created: "text-blue-600",
		client_updated: "text-blue-600",
		settings_changed: "text-slate-600",
		login: "text-emerald-600",
		logout: "text-slate-600",
		login_failed: "text-red-600",
		backup_created: "text-indigo-600",
		branch_created: "text-blue-600",
		branch_deleted: "text-red-600",
		product_created: "text-emerald-600",
		product_updated: "text-blue-600",
		product_deleted: "text-red-600",
		pos_sale_completed: "text-emerald-600",
		pos_sale_edited: "text-blue-600",
		pos_sale_deleted: "text-red-600",
	};
	return colors[actionType] || "text-slate-600";
}

// ── Internal Helpers ──

function getUserId(): string {
	try {
		const user = localStorage.getItem("billingo_user");
		if (user) {
			const parsed = JSON.parse(user);
			return parsed.email || "user-1";
		}
	} catch {
		// ignore
	}
	return "user-1";
}
