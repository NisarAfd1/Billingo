// ─────────────────────────────────────────────────
// Billingo Environment Config & Logger
// Production-ready configuration structure
// ─────────────────────────────────────────────────

// ── Environment Configuration ──

export interface EnvConfig {
	NODE_ENV: "development" | "production" | "test";
	API_BASE_URL: string;
	APP_NAME: string;
	APP_VERSION: string;
	ENABLE_ANALYTICS: boolean;
	ENABLE_DEBUG: boolean;
	SESSION_TIMEOUT_MINUTES: number;
	MAX_LOGIN_ATTEMPTS: number;
	BACKUP_RETENTION_DAYS: number;
}

function getEnvConfig(): EnvConfig {
	return {
		NODE_ENV: (import.meta.env.MODE as EnvConfig["NODE_ENV"]) || "development",
		API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "https://api.billingo.app",
		APP_NAME: import.meta.env.VITE_APP_NAME || "Billingo",
		APP_VERSION: import.meta.env.VITE_APP_VERSION || "2.0.0",
		ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS !== "false",
		ENABLE_DEBUG: import.meta.env.MODE === "development",
		SESSION_TIMEOUT_MINUTES: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || "30", 10),
		MAX_LOGIN_ATTEMPTS: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || "5", 10),
		BACKUP_RETENTION_DAYS: parseInt(import.meta.env.VITE_BACKUP_RETENTION || "30", 10),
	};
}

export const ENV = getEnvConfig();

export function isProduction(): boolean {
	return ENV.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
	return ENV.NODE_ENV === "development";
}

// ── Centralized Logger ──

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const MIN_LOG_LEVEL: LogLevel = isProduction() ? "warn" : "debug";

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	data?: unknown;
}

const LOG_BUFFER_KEY = "billingo_error_log";
const MAX_LOG_BUFFER = 100;

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function persistError(entry: LogEntry): void {
	try {
		const raw = localStorage.getItem(LOG_BUFFER_KEY);
		const buffer: LogEntry[] = raw ? JSON.parse(raw) : [];
		buffer.unshift(entry);
		if (buffer.length > MAX_LOG_BUFFER) buffer.length = MAX_LOG_BUFFER;
		localStorage.setItem(LOG_BUFFER_KEY, JSON.stringify(buffer));
	} catch {
		// Storage full or unavailable
	}
}

export const logger = {
	debug(message: string, data?: unknown): void {
		if (!shouldLog("debug")) return;
		console.debug(`[Billingo][DEBUG] ${message}`, data ?? "");
	},

	info(message: string, data?: unknown): void {
		if (!shouldLog("info")) return;
		console.info(`[Billingo][INFO] ${message}`, data ?? "");
	},

	warn(message: string, data?: unknown): void {
		if (!shouldLog("warn")) return;
		console.warn(`[Billingo][WARN] ${message}`, data ?? "");
		persistError({ level: "warn", message, timestamp: new Date().toISOString(), data });
	},

	error(message: string, data?: unknown): void {
		if (!shouldLog("error")) return;
		console.error(`[Billingo][ERROR] ${message}`, data ?? "");
		persistError({ level: "error", message, timestamp: new Date().toISOString(), data });
	},
};

/** Get persisted error logs */
export function getErrorLogs(): LogEntry[] {
	try {
		const raw = localStorage.getItem(LOG_BUFFER_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** Clear error logs */
export function clearErrorLogs(): void {
	localStorage.removeItem(LOG_BUFFER_KEY);
}

// ── Error Handling Middleware ──

/** Global error handler for promises */
export function handleError(error: unknown, context?: string): string {
	const message = error instanceof Error ? error.message : String(error);
	logger.error(`${context ? `[${context}] ` : ""}${message}`, error);

	// Return user-friendly message
	if (message.includes("network") || message.includes("fetch")) {
		return "Network error. Please check your connection and try again.";
	}
	if (message.includes("permission") || message.includes("forbidden")) {
		return "You don't have permission to perform this action.";
	}
	if (message.includes("not found") || message.includes("404")) {
		return "The requested resource was not found.";
	}
	if (message.includes("timeout")) {
		return "The request timed out. Please try again.";
	}

	return "Something went wrong. Please try again.";
}

/** Wrap an async function with error handling */
export function withErrorHandling<T>(
	fn: () => Promise<T>,
	context?: string,
): Promise<{ data?: T; error?: string }> {
	return fn()
		.then((data) => ({ data }))
		.catch((err) => ({ error: handleError(err, context) }));
}
