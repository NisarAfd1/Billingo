import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	Zap,
	LogOut,
	ArrowLeft,
	BarChart3,
	TrendingUp,
	PieChart,
	Users,
	DollarSign,
	Receipt,
	Building2,
	Loader2,
} from "lucide-react";
import {
	type Invoice,
	getInvoices,
	getClients,
	getClientById,
	getUserProfile,
	getCurrencySymbol,
	getReportSummary,
	refreshInvoiceStatuses,
} from "@/lib/billing-store";
import { getTaxConfig } from "@/lib/tax-engine";
import { getBranches, getActiveBranchId, setActiveBranchId, type Branch } from "@/lib/branch-store";

export const Route = createFileRoute("/analytics")({
	component: AnalyticsPage,
});

// Animated counter for loading transitions
function AnimatedValue({ value, prefix = "" }: { value: number; prefix?: string }) {
	const [display, setDisplay] = useState(0);
	useEffect(() => {
		const duration = 800;
		const start = Date.now();
		const from = 0;
		const tick = () => {
			const elapsed = Date.now() - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setDisplay(from + (value - from) * eased);
			if (progress < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}, [value]);
	return (
		<span>
			{prefix}
			{display.toLocaleString("en-US", {
				minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
				maximumFractionDigits: 2,
			})}
		</span>
	);
}

function AnalyticsPage() {
	const navigate = useNavigate();
	const [userName, setUserName] = useState("User");
	const [loading, setLoading] = useState(true);
	const [branchFilter, setBranchFilter] = useState<string>("all");

	const profile = getUserProfile();
	const currencySymbol = getCurrencySymbol(profile.currency);
	const taxConfig = getTaxConfig();
	const branches = getBranches();

	useEffect(() => {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) {
			navigate({ to: "/login" });
			return;
		}
		const user = localStorage.getItem("billingo_user");
		if (user) {
			try {
				setUserName(JSON.parse(user).fullName || "User");
			} catch {
				// ignore
			}
		}
		refreshInvoiceStatuses();
		// Smooth loading transition
		const timer = setTimeout(() => setLoading(false), 600);
		return () => clearTimeout(timer);
	}, [navigate]);

	// Get data filtered by branch
	const allInvoices = getInvoices();
	const filteredInvoices = useMemo(() => {
		if (branchFilter === "all") return allInvoices;
		return allInvoices.filter((inv) => inv.branchId === branchFilter);
	}, [allInvoices, branchFilter]);

	const clients = getClients();

	// ── Revenue Trend (Monthly, last 12 months) ──
	const monthlyRevenue = useMemo(() => {
		const months: { label: string; revenue: number; invoiceCount: number }[] = [];
		const now = new Date();
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
			const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			const monthInvoices = filteredInvoices.filter(
				(inv) => inv.status === "Paid" && inv.issueDate.startsWith(monthStr),
			);
			months.push({
				label,
				revenue: monthInvoices.reduce((s, inv) => s + inv.grandTotal, 0),
				invoiceCount: monthInvoices.length,
			});
		}
		return months;
	}, [filteredInvoices]);

	const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

	// ── Invoice Status Distribution ──
	const statusData = useMemo(() => {
		const paid = filteredInvoices.filter((inv) => inv.status === "Paid");
		const unpaid = filteredInvoices.filter((inv) => inv.status === "Unpaid");
		const overdue = filteredInvoices.filter((inv) => inv.status === "Overdue");
		const total = filteredInvoices.length || 1;
		return [
			{ label: "Paid", count: paid.length, pct: (paid.length / total) * 100, amount: paid.reduce((s, i) => s + i.grandTotal, 0), color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
			{ label: "Unpaid", count: unpaid.length, pct: (unpaid.length / total) * 100, amount: unpaid.reduce((s, i) => s + i.grandTotal, 0), color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400" },
			{ label: "Overdue", count: overdue.length, pct: (overdue.length / total) * 100, amount: overdue.reduce((s, i) => s + i.grandTotal, 0), color: "from-red-500 to-rose-500", bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400" },
		];
	}, [filteredInvoices]);

	// ── Client Revenue Breakdown ──
	const clientRevenue = useMemo(() => {
		const clientMap: Record<string, { name: string; revenue: number; invoices: number }> = {};
		for (const inv of filteredInvoices) {
			if (!clientMap[inv.clientId]) {
				const client = getClientById(inv.clientId);
				clientMap[inv.clientId] = {
					name: client?.name || "Unknown",
					revenue: 0,
					invoices: 0,
				};
			}
			clientMap[inv.clientId].revenue += inv.grandTotal;
			clientMap[inv.clientId].invoices += 1;
		}
		return Object.values(clientMap)
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 8);
	}, [filteredInvoices]);

	const maxClientRevenue = Math.max(...clientRevenue.map((c) => c.revenue), 1);

	// ── Tax Summary ──
	const taxSummary = useMemo(() => {
		const totalTaxCollected = filteredInvoices
			.filter((inv) => inv.status === "Paid")
			.reduce((s, inv) => s + inv.taxAmount, 0);
		const totalTaxPending = filteredInvoices
			.filter((inv) => inv.status !== "Paid")
			.reduce((s, inv) => s + inv.taxAmount, 0);
		const totalSubtotal = filteredInvoices.reduce((s, inv) => s + inv.subtotal, 0);
		const effectiveRate = totalSubtotal > 0 ? ((totalTaxCollected + totalTaxPending) / totalSubtotal) * 100 : 0;
		return {
			taxCollected: totalTaxCollected,
			taxPending: totalTaxPending,
			totalTax: totalTaxCollected + totalTaxPending,
			effectiveRate,
			taxName: taxConfig.taxName || "Tax",
		};
	}, [filteredInvoices, taxConfig.taxName]);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-slate-900">
				<div className="text-center animate-fade-in-up">
					<div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-4">
						<Loader2 className="w-8 h-8 text-white animate-spin" />
					</div>
					<p className="text-sm text-slate-500 dark:text-slate-400">Loading analytics...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50/50 dark:bg-slate-900">
			{/* Header */}
			<header className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 sticky top-0 z-40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								size="sm"
								onClick={() => navigate({ to: "/dashboard" })}
								className="rounded-lg border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 gap-1.5"
							>
								<ArrowLeft className="w-4 h-4" />
								<span className="hidden sm:inline">Back</span>
							</Button>
							<Link to="/dashboard" className="flex items-center gap-2 group">
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
									<Zap className="w-4 h-4 text-white" />
								</div>
								<span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
									Billingo
								</span>
							</Link>
							<span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500">/</span>
							<span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
								Analytics
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{userName}</span>
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
								{userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
							</div>
							<Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page heading + Branch filter */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
					<div className="flex items-center gap-3">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<BarChart3 className="w-7 h-7 text-indigo-600" />
								Analytics
							</h1>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
								Advanced business intelligence and insights.
							</p>
						</div>
					</div>
					{branches.length > 0 && (
						<div className="flex items-center gap-2">
							<Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
							<Select value={branchFilter} onValueChange={setBranchFilter}>
								<SelectTrigger className="h-9 w-48 rounded-xl bg-white dark:bg-slate-800 border-slate-200 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Branches</SelectItem>
									{branches.map((b) => (
										<SelectItem key={b.branchId} value={b.branchId}>
											{b.branchName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				{/* Summary Stats */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{[
						{
							label: "Total Revenue",
							value: filteredInvoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.grandTotal, 0),
							icon: DollarSign,
							color: "from-emerald-500 to-teal-500",
							prefix: currencySymbol,
						},
						{
							label: "Outstanding",
							value: filteredInvoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.grandTotal, 0),
							icon: TrendingUp,
							color: "from-orange-500 to-amber-500",
							prefix: currencySymbol,
						},
						{
							label: "Total Invoices",
							value: filteredInvoices.length,
							icon: Receipt,
							color: "from-blue-500 to-indigo-500",
							prefix: "",
						},
						{
							label: `${taxSummary.taxName} Collected`,
							value: taxSummary.taxCollected,
							icon: Receipt,
							color: "from-purple-500 to-pink-500",
							prefix: currencySymbol,
						},
					].map((stat, i) => (
						<Card
							key={stat.label}
							className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<CardContent className="p-5">
								<div className="flex items-start justify-between mb-3">
									<div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", stat.color)}>
										<stat.icon className="w-5 h-5 text-white" />
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-900 dark:text-white">
									<AnimatedValue value={stat.value} prefix={stat.prefix} />
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Charts Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					{/* Revenue Trend Chart */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-400">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
									<TrendingUp className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
							</div>
							{filteredInvoices.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
									<p className="text-sm text-slate-500 dark:text-slate-400">No revenue data yet.</p>
								</div>
							) : (
								<div className="space-y-2">
									{monthlyRevenue.map((m, i) => (
										<div key={m.label} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs text-slate-500 dark:text-slate-400 w-16">{m.label}</span>
												<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
													{currencySymbol}
													{m.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
												</span>
											</div>
											<div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
												<div
													className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000 animate-chart-grow"
													style={{ width: `${(m.revenue / maxMonthlyRevenue) * 100}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Invoice Status Pie (visual bar representation) */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-500">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
									<PieChart className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">Invoice Status</h3>
							</div>
							{filteredInvoices.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<PieChart className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
									<p className="text-sm text-slate-500 dark:text-slate-400">No invoices to analyze.</p>
								</div>
							) : (
								<div className="space-y-4">
									{/* Visual pie representation */}
									<div className="flex h-4 rounded-full overflow-hidden">
										{statusData.map((s) => (
											<div
												key={s.label}
												className={cn("bg-gradient-to-r transition-all duration-1000", s.color)}
												style={{ width: `${s.pct}%` }}
											/>
										))}
									</div>

									<div className="space-y-3">
										{statusData.map((s) => (
											<div
												key={s.label}
												className={cn("flex items-center justify-between p-3 rounded-xl border border-transparent", s.bg)}
											>
												<div className="flex items-center gap-3">
													<div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", s.color)} />
													<div>
														<p className={cn("text-sm font-medium", s.text)}>{s.label}</p>
														<p className="text-xs text-slate-500 dark:text-slate-400">
															{s.count} invoice{s.count !== 1 ? "s" : ""} ({s.pct.toFixed(0)}%)
														</p>
													</div>
												</div>
												<span className={cn("text-sm font-bold", s.text)}>
													{currencySymbol}
													{s.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Client Revenue Breakdown */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-600">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
									<Users className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">Client Revenue</h3>
							</div>
							{clientRevenue.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
									<p className="text-sm text-slate-500 dark:text-slate-400">No client data yet.</p>
								</div>
							) : (
								<div className="space-y-3">
									{clientRevenue.map((client, idx) => (
										<div key={client.name} className="animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
											<div className="flex items-center justify-between mb-1">
												<div className="flex items-center gap-2">
													<span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
														{idx + 1}
													</span>
													<span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{client.name}</span>
												</div>
												<div className="text-right">
													<span className="text-sm font-medium text-slate-900 dark:text-white">
														{currencySymbol}
														{client.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</span>
													<span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
														({client.invoices})
													</span>
												</div>
											</div>
											<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
												<div
													className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 animate-chart-grow"
													style={{ width: `${(client.revenue / maxClientRevenue) * 100}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Tax Summary Report */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-700">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
									<Receipt className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">
									{taxSummary.taxName} Summary
								</h3>
							</div>

							<div className="space-y-4">
								{/* Effective Tax Rate Ring */}
								<div className="flex items-center justify-center py-4">
									<div className="relative w-32 h-32">
										<svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
											<circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
											<circle
												cx="50"
												cy="50"
												r="42"
												fill="none"
												stroke="url(#taxGrad)"
												strokeWidth="8"
												strokeLinecap="round"
												strokeDasharray={`${taxSummary.effectiveRate * 2.64} 264`}
												className="transition-all duration-1000"
											/>
											<defs>
												<linearGradient id="taxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
													<stop offset="0%" stopColor="#a855f7" />
													<stop offset="100%" stopColor="#ec4899" />
												</linearGradient>
											</defs>
										</svg>
										<div className="absolute inset-0 flex flex-col items-center justify-center">
											<span className="text-2xl font-bold text-slate-900 dark:text-white">
												{taxSummary.effectiveRate.toFixed(1)}%
											</span>
											<span className="text-[10px] text-slate-500 dark:text-slate-400">Effective Rate</span>
										</div>
									</div>
								</div>

								{/* Tax Breakdown */}
								<div className="space-y-3">
									<div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-transparent">
										<div>
											<p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{taxSummary.taxName} Collected</p>
											<p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">From paid invoices</p>
										</div>
										<span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
											{currencySymbol}
											{taxSummary.taxCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</span>
									</div>
									<div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-transparent">
										<div>
											<p className="text-sm font-medium text-amber-700 dark:text-amber-400">{taxSummary.taxName} Pending</p>
											<p className="text-xs text-amber-600/70 dark:text-amber-500/70">From unpaid/overdue invoices</p>
										</div>
										<span className="text-sm font-bold text-amber-700 dark:text-amber-400">
											{currencySymbol}
											{taxSummary.taxPending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</span>
									</div>
									<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between items-center">
										<span className="text-sm font-bold text-slate-900 dark:text-white">Total {taxSummary.taxName}</span>
										<span className="text-base font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
											{currencySymbol}
											{taxSummary.totalTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
