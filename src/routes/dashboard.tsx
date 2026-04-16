import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
	Zap,
	Bot,
	LogOut,
	DollarSign,
	Users,
	FileText,
	TrendingUp,
	Package,
	BarChart3,
	CreditCard,
	Building2,
	Receipt,
	ShoppingCart,
	AlertTriangle,
	Clock,
	CheckCircle2,
	ArrowUpRight,
	ArrowDownRight,
	Loader2,
	Plus,
	PieChart,
	Brain,
	Settings,
	Sun,
	Moon,
} from "lucide-react";
import { firebaseSignOut, useFirebaseAuth } from "@/lib/firebase";
import {
	getClients,
	getReportSummary,
	getCurrencySymbol as getStoreCurrencySymbol,
	getUserProfile,
	refreshInvoiceStatuses,
} from "@/lib/billing-store";
import { getBranches, getActiveBranch, getActiveBranchId, setActiveBranchId } from "@/lib/branch-store";
import { getInventorySummary, getLowStockProducts } from "@/lib/product-store";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

interface OnboardingData {
	businessType: string;
	services: string[];
	businessName: string;
	country: string;
	currency: string;
}

interface DashboardWidget {
	id: string;
	title: string;
	type: "stat" | "chart" | "list" | "alert";
	icon: React.ComponentType<{ className?: string }>;
	value?: string;
	subtitle?: string;
	trend?: { direction: "up" | "down"; value: string };
	items?: { label: string; value: string; status?: string }[];
	color: string;
}

function generateDashboard(data: OnboardingData): DashboardWidget[] {
	const profile = getUserProfile();
	const sym = getStoreCurrencySymbol(profile.currency);
	const widgets: DashboardWidget[] = [];

	// Get real data from the billing store
	refreshInvoiceStatuses();
	const summary = getReportSummary();
	const clients = getClients();

	const unpaidCount = summary.unpaidCount + summary.overdueCount;
	const fmtAmt = (val: number) =>
		`${sym}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	// Core stats — always based on real data
	widgets.push(
		{
			id: "revenue",
			title: "Total Revenue",
			type: "stat",
			icon: DollarSign,
			value: fmtAmt(summary.totalRevenue),
			subtitle: `${summary.paidCount} paid invoice${summary.paidCount !== 1 ? "s" : ""}`,
			color: "from-emerald-500 to-teal-500",
		},
		{
			id: "clients",
			title: "Total Clients",
			type: "stat",
			icon: Users,
			value: String(clients.length),
			subtitle: "All time",
			color: "from-blue-500 to-indigo-500",
		},
		{
			id: "invoices-total",
			title: "Total Invoices",
			type: "stat",
			icon: FileText,
			value: String(summary.totalInvoices),
			subtitle: `${unpaidCount} pending`,
			color: "from-purple-500 to-pink-500",
		},
		{
			id: "outstanding",
			title: "Outstanding",
			type: "stat",
			icon: Clock,
			value: fmtAmt(summary.totalOutstanding),
			subtitle: `${summary.overdueCount} overdue`,
			color: "from-orange-500 to-amber-500",
		},
	);

	// Inventory widget
	const inventorySummary = getInventorySummary();
	const lowStockItems = getLowStockProducts();
	if (inventorySummary.totalProducts > 0) {
		widgets.push({
			id: "inventory",
			title: "Inventory",
			type: "alert",
			icon: Package,
			items: [
				...(inventorySummary.outOfStockItems > 0
					? [{ label: `${inventorySummary.outOfStockItems} item${inventorySummary.outOfStockItems > 1 ? "s" : ""} out of stock`, value: "Critical", status: "critical" }]
					: []),
				...(inventorySummary.lowStockItems > 0
					? lowStockItems.filter((p) => p.stockQuantity > 0).slice(0, 3).map((p) => ({
						label: `${p.name} — ${p.stockQuantity} left`,
						value: "Low",
						status: "warning",
					}))
					: []),
				...(inventorySummary.outOfStockItems === 0 && inventorySummary.lowStockItems === 0
					? [{ label: `${inventorySummary.totalProducts} tracked items in stock`, value: "OK", status: "info" }]
					: []),
			],
			color: "from-amber-500 to-orange-500",
		});
	}

	// POS Sales widget
	const posSalesRaw = localStorage.getItem("billingo_pos_sales");
	const posSales: { grandTotal: number; date: string; paymentMethod: string; items: { name: string; quantity: number }[] }[] = posSalesRaw ? JSON.parse(posSalesRaw) : [];
	if (posSales.length > 0) {
		const today = new Date().toISOString().split("T")[0];
		const todayPosSales = posSales.filter((s) => s.date.startsWith(today));
		const totalPosRevenue = posSales.reduce((sum, s) => sum + s.grandTotal, 0);
		const todayPosRevenue = todayPosSales.reduce((sum, s) => sum + s.grandTotal, 0);

		widgets.push({
			id: "pos-sales",
			title: "POS Sales",
			type: "list",
			icon: ShoppingCart,
			items: [
				{ label: `${posSales.length} total sale${posSales.length !== 1 ? "s" : ""}`, value: fmtAmt(totalPosRevenue), status: "" },
				{ label: `${todayPosSales.length} sale${todayPosSales.length !== 1 ? "s" : ""} today`, value: todayPosRevenue > 0 ? fmtAmt(todayPosRevenue) : fmtAmt(0), status: todayPosSales.length > 0 ? "positive" : "" },
				...(posSales.length > 0 ? [{
					label: `Avg. sale: ${fmtAmt(totalPosRevenue / posSales.length)}`,
					value: "",
					status: "",
				}] : []),
			],
			color: "from-rose-500 to-pink-500",
		});
	}

	// Client list — show real clients sorted by billed amount
	const topClients = [...clients]
		.sort((a, b) => b.totalBilled - a.totalBilled)
		.slice(0, 4);

	if (topClients.length > 0) {
		widgets.push({
			id: "client-list",
			title: "Top Clients",
			type: "list",
			icon: Users,
			items: topClients.map((c) => ({
				label: c.name,
				value: fmtAmt(c.totalBilled),
				status: c.outstandingAmount > 0 ? "pending" : "paid",
			})),
			color: "from-blue-500 to-indigo-500",
		});
	} else {
		widgets.push({
			id: "client-list",
			title: "Recent Clients",
			type: "list",
			icon: Users,
			items: [{ label: "No clients yet", value: "", status: "" }],
			color: "from-blue-500 to-indigo-500",
		});
	}

	// Invoice summary chart — real data
	widgets.push({
		id: "invoice-stats",
		title: "Invoice Summary",
		type: "chart",
		icon: BarChart3,
		items: [
			{ label: "Paid", value: String(summary.paidCount) },
			{ label: "Unpaid", value: String(summary.unpaidCount) },
			{ label: "Overdue", value: String(summary.overdueCount) },
		],
		color: "from-indigo-500 to-purple-500",
	});

	// AI Insights widget if service enabled
	const svcs = data.services || [];
	if (svcs.includes("ai-insights")) {
		const insightItems: { label: string; value: string; status: string }[] = [];

		if (summary.totalInvoices === 0) {
			insightItems.push({
				label: "Create your first invoice to unlock AI insights",
				value: "",
				status: "action",
			});
		} else {
			if (summary.overdueCount > 0) {
				insightItems.push({
					label: `${summary.overdueCount} overdue invoice${summary.overdueCount > 1 ? "s" : ""} need attention`,
					value: "",
					status: "action",
				});
			}
			if (summary.paidCount > 0) {
				insightItems.push({
					label: `${summary.paidCount} invoice${summary.paidCount > 1 ? "s" : ""} paid — ${fmtAmt(summary.totalRevenue)} collected`,
					value: "",
					status: "positive",
				});
			}
			if (summary.totalOutstanding > 0) {
				insightItems.push({
					label: `${fmtAmt(summary.totalOutstanding)} outstanding across ${unpaidCount} invoice${unpaidCount > 1 ? "s" : ""}`,
					value: "",
					status: "action",
				});
			}
		}

		if (insightItems.length === 0) {
			insightItems.push({
				label: "All payments collected. Business is on track!",
				value: "",
				status: "positive",
			});
		}

		widgets.push({
			id: "ai-insight",
			title: "AI Insights",
			type: "list",
			icon: Bot,
			items: insightItems,
			color: "from-indigo-500 to-cyan-500",
		});
	}

	return widgets;
}

function DashboardPage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(() => {
		// Only show loading screen once per login session
		const shown = sessionStorage.getItem("billingo_dashboard_loaded");
		return !shown;
	});
	const [progress, setProgress] = useState(0);
	const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
	const [businessName, setBusinessName] = useState("Your Business");
	const [userName, setUserName] = useState("User");
	const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
	const { isDark, toggle: toggleDarkMode } = useTheme();
	const firebaseUser = useFirebaseAuth((s) => s.user);
	const firebaseInitialized = useFirebaseAuth((s) => s.initialized);

	useEffect(() => {
		// Wait for Firebase to initialize before checking auth
		if (!firebaseInitialized) return;

		// Check Firebase auth first, fall back to localStorage
		if (!firebaseUser && !localStorage.getItem("billingo_auth")) {
			navigate({ to: "/login" });
			return;
		}

		// Get user name from Firebase or localStorage
		if (firebaseUser?.displayName) {
			setUserName(firebaseUser.displayName);
		} else {
			const user = localStorage.getItem("billingo_user");
			if (user) {
				try {
					const parsed = JSON.parse(user);
					setUserName(parsed.fullName || "User");
				} catch {
					// ignore
				}
			}
		}

		// If loading screen was already shown this session, load dashboard immediately
		const alreadyShown = sessionStorage.getItem("billingo_dashboard_loaded");
		if (alreadyShown) {
			const onboardingRaw = localStorage.getItem("billingo_onboarding");
			let data: OnboardingData = {
				businessType: "company",
				services: ["invoicing", "payment-tracking"],
				businessName: "My Business",
				country: "United States",
				currency: "USD - US Dollar",
			};
			if (onboardingRaw) {
				try {
					data = JSON.parse(onboardingRaw);
				} catch {
					// use defaults
				}
			}
			setBusinessName(data.businessName || "Your Business");
			setWidgets(generateDashboard(data));
			setLoading(false);
			return;
		}

		// Simulate AI building dashboard (only on first visit this session)
		const interval = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 100) {
					clearInterval(interval);
					return 100;
				}
				return prev + 2;
			});
		}, 60);

		const timeout = setTimeout(() => {
			const onboardingRaw = localStorage.getItem("billingo_onboarding");
			let data: OnboardingData = {
				businessType: "company",
				services: ["invoicing", "payment-tracking"],
				businessName: "My Business",
				country: "United States",
				currency: "USD - US Dollar",
			};
			if (onboardingRaw) {
				try {
					data = JSON.parse(onboardingRaw);
				} catch {
					// use defaults
				}
			}
			setBusinessName(data.businessName || "Your Business");
			setWidgets(generateDashboard(data));
			setLoading(false);
			// Mark as shown for this session
			sessionStorage.setItem("billingo_dashboard_loaded", "true");
		}, 3200);

		return () => {
			clearInterval(interval);
			clearTimeout(timeout);
		};
	}, [navigate, firebaseUser, firebaseInitialized]);

	async function handleLogout() {
		await firebaseSignOut();
		localStorage.removeItem("billingo_auth");
		sessionStorage.removeItem("billingo_dashboard_loaded");
		navigate({ to: "/login" });
	}

	if (loading) {
		return <LoadingScreen progress={progress} />;
	}

	return (
		<div className="min-h-screen bg-slate-50/50 dark:bg-slate-900">
			{/* Dashboard header */}
			<header className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-3">
							<Link to="/" className="flex items-center gap-2 group">
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
									<Zap className="w-4 h-4 text-white" />
								</div>
								<span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
									Billingo
								</span>
							</Link>
							<span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500">
								/
							</span>
							<span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
								{businessName}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
								{userName}
							</span>
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
								{userName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.slice(0, 2)
									.toUpperCase()}
							</div>
							<button
								type="button"
								onClick={toggleDarkMode}
								className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-indigo-900/60 border border-slate-300 dark:border-indigo-700 p-0.5 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
								title={isDark ? "Switch to light mode" : "Switch to dark mode"}
								aria-label="Toggle dark mode"
							>
								<span
									className={cn(
										"flex items-center justify-center w-6 h-6 rounded-full shadow-sm transition-all duration-300",
										isDark
											? "translate-x-6.5 bg-indigo-500 text-white"
											: "translate-x-0 bg-white text-amber-500",
									)}
								>
									{isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
								</span>
							</button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowLogoutConfirm(true)}
								className="text-slate-500 hover:text-red-600"
							>
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Logout Confirmation Dialog */}
			<AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Sign out of Billingo?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to sign out? You will need to log in again to access your account.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleLogout}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							Sign Out
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Dashboard body */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Welcome */}
				<div className="mb-8 animate-fade-in-up">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
								Welcome Back, {businessName}
							</h1>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
								Here&apos;s your AI-personalized dashboard overview.
							</p>
						</div>
						<div className="flex items-center gap-2">
							{getBranches().length > 0 && (
								<Select
									value={getActiveBranchId() || "all"}
									onValueChange={(v) => setActiveBranchId(v === "all" ? null : v)}
								>
									<SelectTrigger className="h-10 w-44 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-sm">
										<Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400 dark:text-slate-500" />
										<SelectValue placeholder="All Branches" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Branches</SelectItem>
										{getBranches().map((b) => (
											<SelectItem key={b.branchId} value={b.branchId}>
												{b.branchName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							<Link to="/invoices/new">
								<Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity">
									<Plus className="w-4 h-4 mr-1.5" />
									New Invoice
								</Button>
							</Link>
						</div>
					</div>
				</div>

				{/* Quick Navigation */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-fade-in-up animation-delay-100">
					<Link to="/invoices" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<FileText className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Invoices</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Manage & track</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/reports" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<PieChart className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Reports</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Analytics & insights</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/invoices/new" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<Plus className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Create</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">New invoice</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/products" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<Package className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Products</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Catalog & inventory</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/estimates" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<FileText className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Estimates</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Quotations</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/pos" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<ShoppingCart className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">POS</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Point of Sale</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/ai" className="group">
						<Card className="border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<Brain className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">AI Assistant</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Smart tools</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/analytics" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform">
									<BarChart3 className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Analytics</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Advanced insights</p>
								</div>
							</CardContent>
						</Card>
					</Link>
					<Link to="/settings" className="group">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
							<CardContent className="p-4 flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center group-hover:scale-105 transition-transform">
									<Settings className="w-5 h-5 text-white" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900 dark:text-white">Settings</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">Global config</p>
								</div>
							</CardContent>
						</Card>
					</Link>
				</div>

				{/* Stats grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{widgets
						.filter((w) => w.type === "stat")
						.map((widget, i) => (
							<Card
								key={widget.id}
								className={cn(
									"border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300",
									`animate-fade-in-up`,
								)}
								style={{ animationDelay: `${i * 100}ms` }}
							>
								<CardContent className="p-5">
									<div className="flex items-start justify-between mb-3">
										<div
											className={cn(
												"w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
												widget.color,
											)}
										>
											<widget.icon className="w-5 h-5 text-white" />
										</div>
										{widget.trend && (
											<div
												className={cn(
													"flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
													widget.trend.direction === "up"
														? "text-emerald-700 bg-emerald-50"
														: "text-red-700 bg-red-50",
												)}
											>
												{widget.trend.direction === "up" ? (
													<ArrowUpRight className="w-3 h-3" />
												) : (
													<ArrowDownRight className="w-3 h-3" />
												)}
												{widget.trend.value}
											</div>
										)}
									</div>
									<p className="text-2xl font-bold text-slate-900 dark:text-white">
										{widget.value}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
										{widget.subtitle}
									</p>
								</CardContent>
							</Card>
						))}
				</div>

				{/* Secondary widgets */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{widgets
						.filter((w) => w.type !== "stat")
						.map((widget, i) => (
							<Card
								key={widget.id}
								className={cn(
									"border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up",
								)}
								style={{ animationDelay: `${(i + 4) * 100}ms` }}
							>
								<CardContent className="p-6">
									<div className="flex items-center gap-3 mb-5">
										<div
											className={cn(
												"w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center",
												widget.color,
											)}
										>
											<widget.icon className="w-4 h-4 text-white" />
										</div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">
											{widget.title}
										</h3>
									</div>

									{widget.type === "list" && (
										<div className="space-y-3">
											{widget.items?.map((item) => (
												<div
													key={item.label}
													className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/80 dark:bg-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors"
												>
													<div className="flex items-center gap-2">
														{item.status === "positive" && (
															<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
														)}
														{item.status === "action" && (
															<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
														)}
														<span className="text-sm text-slate-700 dark:text-slate-300">
															{item.label}
														</span>
													</div>
													<div className="flex items-center gap-2">
														{item.value && (
															<span className="text-sm font-medium text-slate-900 dark:text-white">
																{item.value}
															</span>
														)}
														{item.status === "paid" && (
															<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
																Paid
															</span>
														)}
														{item.status === "pending" && (
															<span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
																Pending
															</span>
														)}
														{item.status === "overdue" && (
															<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
																Overdue
															</span>
														)}
													</div>
												</div>
											))}
										</div>
									)}

									{widget.type === "chart" && (
										<div className="space-y-3">
											{widget.items?.map((item) => {
												const maxVal = Math.max(
													...(widget.items?.map((it) =>
														Number(it.value),
													) || [1]),
												);
												const pct =
													(Number(item.value) / maxVal) * 100;
												return (
													<div key={item.label}>
														<div className="flex items-center justify-between mb-1">
															<span className="text-sm text-slate-600 dark:text-slate-400">
																{item.label}
															</span>
															<span className="text-sm font-medium text-slate-800 dark:text-slate-200">
																{item.value}
															</span>
														</div>
														<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
															<div
																className={cn(
																	"h-full rounded-full bg-gradient-to-r transition-all duration-1000",
																	widget.color,
																)}
																style={{
																	width: `${pct}%`,
																}}
															/>
														</div>
													</div>
												);
											})}
										</div>
									)}

									{widget.type === "alert" && (
										<div className="space-y-3">
											{widget.items?.map((item) => (
												<div
													key={item.label}
													className={cn(
														"flex items-center justify-between py-2.5 px-3 rounded-lg border",
														item.status === "critical"
															? "bg-red-50/60 dark:bg-red-900/20 border-red-100 dark:border-red-800"
															: item.status === "warning"
																? "bg-amber-50/60 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
																: "bg-slate-50/60 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600",
													)}
												>
													<div className="flex items-center gap-2">
														<AlertTriangle
															className={cn(
																"w-4 h-4 shrink-0",
																item.status === "critical"
																	? "text-red-500"
																	: item.status ===
																		  "warning"
																		? "text-amber-500"
																		: "text-slate-400",
															)}
														/>
														<span className="text-sm text-slate-700 dark:text-slate-300">
															{item.label}
														</span>
													</div>
													<span
														className={cn(
															"text-xs font-medium px-2 py-0.5 rounded-full",
															item.status === "critical"
																? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
																: item.status === "warning"
																	? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
																	: "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300",
														)}
													>
														{item.value}
													</span>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						))}
				</div>
			</main>
		</div>
	);
}

function LoadingScreen({ progress }: { progress: number }) {
	const messages = [
		"Analyzing your business profile...",
		"Configuring personalized modules...",
		"Building your smart dashboard...",
		"Applying AI optimizations...",
		"Almost ready...",
	];
	const msgIndex = Math.min(
		Math.floor(progress / 22),
		messages.length - 1,
	);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
			{/* Background effects */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow" />
				<div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float-slow" />
			</div>

			<div className="relative z-10 text-center max-w-md mx-auto px-4">
				{/* Animated bot icon */}
				<div className="mb-8 animate-fade-in-up">
					<div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-float">
						<Bot className="w-10 h-10 text-white" />
					</div>
				</div>

				<h2 className="text-2xl font-bold text-white mb-2 animate-fade-in-up animation-delay-200">
					AI is building your optimized workspace...
				</h2>
				<p className="text-indigo-300/80 text-sm mb-8 animate-fade-in-up animation-delay-300">
					{messages[msgIndex]}
				</p>

				{/* Progress */}
				<div className="animate-fade-in-up animation-delay-400">
					<Progress
						value={progress}
						className="h-2 bg-slate-800"
					/>
					<div className="flex items-center justify-between mt-3">
						<div className="flex items-center gap-2">
							<Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
							<span className="text-xs text-indigo-400">
								Processing
							</span>
						</div>
						<span className="text-xs text-indigo-400 font-medium">
							{Math.min(progress, 100)}%
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
