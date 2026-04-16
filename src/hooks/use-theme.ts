import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { type Theme, getTheme, setTheme, resolveTheme } from "@/lib/dark-mode";

// External store for cross-component reactivity
let listeners: (() => void)[] = [];
function subscribe(listener: () => void) {
	listeners.push(listener);
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}
function emitChange() {
	for (const l of listeners) l();
}
function getSnapshot() {
	return resolveTheme();
}

export function useTheme() {
	const resolved = useSyncExternalStore(subscribe, getSnapshot);
	const isDark = resolved === "dark";
	const theme = getTheme();

	const setThemeValue = useCallback((t: Theme) => {
		setTheme(t);
		emitChange();
	}, []);

	const toggle = useCallback(() => {
		setThemeValue(isDark ? "light" : "dark");
	}, [isDark, setThemeValue]);

	return { theme, resolved, isDark, setTheme: setThemeValue, toggle } as const;
}
