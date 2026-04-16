// ─────────────────────────────────────────────────
// Billingo Dark Mode System
// ─────────────────────────────────────────────────

const THEME_KEY = "billingo_theme";

export type Theme = "light" | "dark" | "system";

/** Get current theme preference */
export function getTheme(): Theme {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") return stored;
	return "light";
}

/** Set theme preference and apply */
export function setTheme(theme: Theme): void {
	localStorage.setItem(THEME_KEY, theme);
	applyTheme(theme);
}

/** Check if system prefers dark mode */
function systemPrefersDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve the actual mode (light or dark) */
export function resolveTheme(theme?: Theme): "light" | "dark" {
	const t = theme || getTheme();
	if (t === "system") return systemPrefersDark() ? "dark" : "light";
	return t;
}

/** Apply theme to DOM */
export function applyTheme(theme?: Theme): void {
	const resolved = resolveTheme(theme);
	// Add transition class for smooth switching
	document.documentElement.classList.add("theme-transition");
	if (resolved === "dark") {
		document.documentElement.classList.add("dark");
	} else {
		document.documentElement.classList.remove("dark");
	}
	// Remove transition class after animation to avoid interfering with other transitions
	setTimeout(() => {
		document.documentElement.classList.remove("theme-transition");
	}, 350);
}

/** Initialize theme on app start */
export function initTheme(): void {
	applyTheme();

	// Listen for system preference changes
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	mediaQuery.addEventListener("change", () => {
		if (getTheme() === "system") {
			applyTheme();
		}
	});
}

/** Check if currently in dark mode */
export function isDarkMode(): boolean {
	return resolveTheme() === "dark";
}
