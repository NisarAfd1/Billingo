import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingBanner } from "@/components/FloatingBanner";
import { useEffect } from "react";
import { initTheme } from "@/lib/dark-mode";
import { setupInactivityListeners, createSession, getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const navigate = useNavigate();

	useEffect(() => {
		// Initialize dark mode
		initTheme();

		// Initialize session if logged in and no session exists
		const auth = localStorage.getItem("billingo_auth");
		if (auth && !getSession()) {
			createSession();
		}

		// Setup inactivity monitoring
		const cleanup = setupInactivityListeners(() => {
			logActivity("logout", "Session expired due to inactivity");
			localStorage.removeItem("billingo_auth");
			navigate({ to: "/login" });
		});

		return cleanup;
	}, [navigate]);

	return (
		<div className="flex flex-col min-h-screen">
			<ErrorBoundary tagName="main" className="flex-1">
				<Outlet />
			</ErrorBoundary>
			<TanStackRouterDevtools position="bottom-right" />
			<FloatingBanner position="bottom-left" />
		</div>
	);
}
