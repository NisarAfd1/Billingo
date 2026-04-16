// ─────────────────────────────────────────────────
// Billingo Security Layer
// Input validation, CSRF, roles, password strength
// ─────────────────────────────────────────────────

// ── Input Sanitization ──

const HTML_ENTITIES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#x27;",
	"/": "&#x2F;",
	"`": "&#96;",
};

const ENTITY_RE = /[&<>"'`/]/g;

/** Escape HTML special characters to prevent XSS */
export function sanitizeHTML(input: string): string {
	if (!input) return "";
	return input.replace(ENTITY_RE, (char) => HTML_ENTITIES[char] || char);
}

/** Strip all HTML tags from a string */
export function stripTags(input: string): string {
	if (!input) return "";
	return input.replace(/<[^>]*>/g, "");
}

/** Sanitize a form field: trim, strip tags, limit length */
export function sanitizeInput(input: string, maxLength = 500): string {
	if (!input) return "";
	let clean = input.trim();
	clean = stripTags(clean);
	clean = sanitizeHTML(clean);
	if (clean.length > maxLength) {
		clean = clean.slice(0, maxLength);
	}
	return clean;
}

/** Sanitize an object's string values (shallow) */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
	const result = { ...data };
	for (const key of Object.keys(result)) {
		const val = result[key];
		if (typeof val === "string") {
			(result as Record<string, unknown>)[key] = sanitizeInput(val);
		}
	}
	return result;
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate phone format (basic international) */
export function isValidPhone(phone: string): boolean {
	if (!phone) return true; // optional field
	return /^[+]?[\d\s()-]{7,20}$/.test(phone);
}

/** Prevent SQL-like injection patterns at structure level */
export function hasSQLInjectionPattern(input: string): boolean {
	const patterns = [
		/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
		/(--|;|\/\*|\*\/)/,
		/(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
	];
	return patterns.some((p) => p.test(input));
}

/** Prevent script injection patterns */
export function hasXSSPattern(input: string): boolean {
	const patterns = [
		/<script[\s>]/i,
		/javascript:/i,
		/on\w+\s*=/i,
		/eval\s*\(/i,
		/document\.\w+/i,
		/window\.\w+/i,
	];
	return patterns.some((p) => p.test(input));
}

/** Combined validation: returns error message or null */
export function validateSecureInput(input: string, fieldName: string): string | null {
	if (hasSQLInjectionPattern(input)) {
		return `${fieldName} contains invalid characters`;
	}
	if (hasXSSPattern(input)) {
		return `${fieldName} contains invalid content`;
	}
	return null;
}

// ── CSRF Protection ──

const CSRF_KEY = "billingo_csrf_token";

/** Generate a CSRF token and store it */
export function generateCSRFToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
	sessionStorage.setItem(CSRF_KEY, token);
	return token;
}

/** Validate a CSRF token against the stored one */
export function validateCSRFToken(token: string): boolean {
	const stored = sessionStorage.getItem(CSRF_KEY);
	return !!stored && stored === token;
}

/** Get current CSRF token (or generate one) */
export function getCSRFToken(): string {
	const existing = sessionStorage.getItem(CSRF_KEY);
	if (existing) return existing;
	return generateCSRFToken();
}

// ── Role-Based Access Control ──

export type UserRole = "owner" | "manager" | "staff";

export interface RolePermissions {
	canManageUsers: boolean;
	canManageSettings: boolean;
	canDeleteInvoices: boolean;
	canEditInvoices: boolean;
	canCreateInvoices: boolean;
	canViewAnalytics: boolean;
	canExportData: boolean;
	canManageBranches: boolean;
	canViewActivityLogs: boolean;
	canUpgradePlan: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
	owner: {
		canManageUsers: true,
		canManageSettings: true,
		canDeleteInvoices: true,
		canEditInvoices: true,
		canCreateInvoices: true,
		canViewAnalytics: true,
		canExportData: true,
		canManageBranches: true,
		canViewActivityLogs: true,
		canUpgradePlan: true,
	},
	manager: {
		canManageUsers: false,
		canManageSettings: true,
		canDeleteInvoices: true,
		canEditInvoices: true,
		canCreateInvoices: true,
		canViewAnalytics: true,
		canExportData: true,
		canManageBranches: true,
		canViewActivityLogs: true,
		canUpgradePlan: false,
	},
	staff: {
		canManageUsers: false,
		canManageSettings: false,
		canDeleteInvoices: false,
		canEditInvoices: true,
		canCreateInvoices: true,
		canViewAnalytics: false,
		canExportData: false,
		canManageBranches: false,
		canViewActivityLogs: false,
		canUpgradePlan: false,
	},
};

const ROLE_KEY = "billingo_user_role";

export function getUserRole(): UserRole {
	const stored = localStorage.getItem(ROLE_KEY);
	if (stored === "owner" || stored === "manager" || stored === "staff") return stored;
	return "owner"; // default for single-user setup
}

export function setUserRole(role: UserRole): void {
	localStorage.setItem(ROLE_KEY, role);
}

export function getPermissions(role?: UserRole): RolePermissions {
	return ROLE_PERMISSIONS[role || getUserRole()];
}

export function hasPermission(permission: keyof RolePermissions, role?: UserRole): boolean {
	return getPermissions(role)[permission];
}

// ── Password Strength ──

export interface PasswordStrengthResult {
	score: number; // 0-5
	label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
	suggestions: string[];
	color: string;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
	let score = 0;
	const suggestions: string[] = [];

	if (!password) {
		return { score: 0, label: "Very Weak", suggestions: ["Enter a password"], color: "bg-red-500" };
	}

	// Length checks
	if (password.length >= 8) score++;
	else suggestions.push("Use at least 8 characters");

	if (password.length >= 12) score++;

	// Character variety
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	else suggestions.push("Use both uppercase and lowercase letters");

	if (/\d/.test(password)) score++;
	else suggestions.push("Include at least one number");

	if (/[^a-zA-Z0-9]/.test(password)) score++;
	else suggestions.push("Add a special character (!@#$%...)");

	// Common password patterns
	const common = ["password", "123456", "qwerty", "abc123", "letmein", "admin"];
	if (common.some((c) => password.toLowerCase().includes(c))) {
		score = Math.max(0, score - 2);
		suggestions.push("Avoid common password patterns");
	}

	const labels: PasswordStrengthResult["label"][] = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
	const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];
	const idx = Math.min(score, 4);

	return {
		score: Math.min(score, 5),
		label: labels[idx],
		suggestions,
		color: colors[idx],
	};
}

/** Enforce minimum password requirements */
export function isPasswordAcceptable(password: string): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (password.length < 8) errors.push("Password must be at least 8 characters");
	if (!/[A-Z]/.test(password)) errors.push("Password must contain an uppercase letter");
	if (!/[a-z]/.test(password)) errors.push("Password must contain a lowercase letter");
	if (!/\d/.test(password)) errors.push("Password must contain a number");
	return { valid: errors.length === 0, errors };
}
