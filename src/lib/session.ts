// ─────────────────────────────────────────────────
// Billingo Session Management
// Token expiration, auto-logout on inactivity
// ─────────────────────────────────────────────────

const SESSION_KEY = "billingo_session";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionData {
	token: string;
	createdAt: number;
	lastActivity: number;
	expiresAt: number;
}

/** Create a new session */
export function createSession(): SessionData {
	const now = Date.now();
	const array = new Uint8Array(24);
	crypto.getRandomValues(array);
	const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

	const session: SessionData = {
		token,
		createdAt: now,
		lastActivity: now,
		expiresAt: now + TOKEN_EXPIRY_MS,
	};

	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	return session;
}

/** Get current session (or null if expired/missing) */
export function getSession(): SessionData | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const session: SessionData = JSON.parse(raw);

		const now = Date.now();

		// Check token expiry
		if (now > session.expiresAt) {
			destroySession();
			return null;
		}

		// Check inactivity timeout
		if (now - session.lastActivity > INACTIVITY_TIMEOUT_MS) {
			destroySession();
			return null;
		}

		return session;
	} catch {
		return null;
	}
}

/** Update last activity timestamp */
export function touchSession(): void {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return;
		const session: SessionData = JSON.parse(raw);
		session.lastActivity = Date.now();
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {
		// ignore
	}
}

/** Check if session is valid */
export function isSessionValid(): boolean {
	return getSession() !== null;
}

/** Get remaining time before session expires (in ms) */
export function getSessionTimeRemaining(): number {
	const session = getSession();
	if (!session) return 0;
	const now = Date.now();
	const tokenRemaining = session.expiresAt - now;
	const inactivityRemaining = INACTIVITY_TIMEOUT_MS - (now - session.lastActivity);
	return Math.max(0, Math.min(tokenRemaining, inactivityRemaining));
}

/** Destroy the session */
export function destroySession(): void {
	localStorage.removeItem(SESSION_KEY);
}

/** Setup inactivity listeners (call once on app mount) */
export function setupInactivityListeners(onExpired: () => void): () => void {
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];

	function handleActivity() {
		touchSession();
	}

	function checkSession() {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) return; // not logged in, skip check

		const session = getSession();
		if (!session) {
			onExpired();
		}
	}

	// Listen for user activity
	for (const event of activityEvents) {
		window.addEventListener(event, handleActivity, { passive: true });
	}

	// Periodically check session validity
	intervalId = setInterval(checkSession, 60_000); // every minute

	// Cleanup
	return () => {
		for (const event of activityEvents) {
			window.removeEventListener(event, handleActivity);
		}
		if (intervalId) clearInterval(intervalId);
	};
}
