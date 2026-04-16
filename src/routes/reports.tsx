import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	Zap,
	LogOut,
	DollarSign,
	TrendingUp,
	CheckCircle2,
	AlertTriangle,
	Clock,
	FileText,
	BarChart3,
	ArrowLeft,
	Users,
	PieChart,
	Download,
} from "lucide-react";
import {
	type Invoice,
	type ReportSummary,
	getInvoices,
	getClients,
	getClientById,
	getUserProfile,
	getCurrencySymbol,
	getReportSummary,
	refreshInvoiceStatuses,
} from "@/lib/billing-store";

export const Route = createFileRoute("/reports")({
	component: ReportsPage,
});

function ReportsPage() {
	const navigate = useNavigate();
	const [summary, setSummary] = useState<ReportSummary | null>(null);
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [userName, setUserName] = useState("User");

	const profile = getUserProfile();
	const currencySymbol = getCurrencySymbol(profile.currency);

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
		setSummary(getReportSummary());
		setInvoices(getInvoices());
	}, [navigate]);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	// ── Download Helpers ──

	function downloadCSV(filename: string, rows: string[][]) {
		const csvContent = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleDownloadRevenueReport() {
		const headers = ["Month", "Revenue"];
		const dataRows = monthlyData.map((m) => [m.label, m.revenue.toFixed(2)]);
		downloadCSV("billingo-revenue-report.csv", [headers, ...dataRows]);
	}

	function handleDownloadInvoiceReport() {
		const headers = ["Invoice #", "Client", "Issue Date", "Due Date", "Amount", "Status"];
		const dataRows = invoices.map((inv) => {
			const client = getClientById(inv.clientId);
			return [
				inv.invoiceNumber,
				client?.name || "Unknown",
				inv.issueDate,
				inv.dueDate,
				inv.grandTotal.toFixed(2),
				inv.status,
			];
		});
		downloadCSV("billingo-invoice-report.csv", [headers, ...dataRows]);
	}

	function handleDownloadClientReport() {
		const allClients = getClients();
		const headers = ["Client Name", "Email", "Total Billed", "Total Paid", "Outstanding"];
		const dataRows = allClients.map((c) => [
			c.name,
			c.email || "N/A",
			c.totalBilled.toFixed(2),
			c.totalPaid.toFixed(2),
			c.outstandingAmount.toFixed(2),
		]);
		downloadCSV("billingo-client-report.csv", [headers, ...dataRows]);
	}

	function handleDownloadFullReport() {
		const headers = [
			"Type", "Invoice #", "Client", "Issue Date", "Due Date",
			"Subtotal", "Tax", "Grand Total", "Status",
		];
		const dataRows = invoices.map((inv) => {
			const client = getClientById(inv.clientId);
			return [
				"Invoice",
				inv.invoiceNumber,
				client?.name || "Unknown",
				inv.issueDate,
				inv.dueDate,
				inv.subtotal.toFixed(2),
				inv.taxAmount.toFixed(2),
				inv.grandTotal.toFixed(2),
				inv.status,
			];
		});
		downloadCSV("billingo-full-report.csv", [headers, ...dataRows]);
	}

	// ── Derived report data ──

	const clients = getClients();
	const topClients = [...clients]
		.sort((a, b) => b.totalBilled - a.totalBilled)
		.slice(0, 5);

	const paidInvoices = invoices.filter((inv) => inv.status === "Paid");
	const unpaidInvoices = invoices.filter((inv) => inv.status === "Unpaid");
	const overdueInvoices = invoices.filter((inv) => inv.status === "Overdue");

	// Monthly revenue breakdown (last 6 months)
	const monthlyData = (() => {
		const months: { label: string; revenue: number }[] = [];
		const now = new Date();
		for (let i = 5; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const label = d.toLocaleDateString("en-US", {
				month: "short",
				year: "2-digit",
			});
			const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			const revenue = paidInvoices
				.filter((inv) => inv.issueDate.startsWith(monthStr))
				.reduce((sum, inv) => sum + inv.grandTotal, 0);
			months.push({ label, revenue });
		}
		return months;
	})();

	const maxMonthlyRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

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
								className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 gap-1.5"
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
								Reports
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
							<Button
								variant="ghost"
								size="sm"
								onClick={handleLogout}
								className="text-slate-500 hover:text-red-600"
							>
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page heading */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
					<div className="flex items-center gap-3">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<BarChart3 className="w-7 h-7 text-indigo-600" />
								Reports
							</h1>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
								Financial overview and analytics at a glance.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadFullReport}
							className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
						>
							<Download className="w-4 h-4 mr-1.5" />
							Full Report
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadInvoiceReport}
							className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
						>
							<Download className="w-4 h-4 mr-1.5" />
							Invoices
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadRevenueReport}
							className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
						>
							<Download className="w-4 h-4 mr-1.5" />
							Revenue
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadClientReport}
							className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
						>
							<Download className="w-4 h-4 mr-1.5" />
							Clients
						</Button>
					</div>
				</div>

				{/* Summary Widgets */}
				{summary && (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						<Card className="border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up">
							<CardContent className="p-5">
								<div className="flex items-start justify-between mb-3">
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
										<DollarSign className="w-5 h-5 text-white" />
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-900 dark:text-white">
									{currencySymbol}
									{summary.totalRevenue.toLocaleString("en-US", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Revenue</p>
							</CardContent>
						</Card>

						<Card className="border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-100">
							<CardContent className="p-5">
								<div className="flex items-start justify-between mb-3">
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
										<TrendingUp className="w-5 h-5 text-white" />
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-900 dark:text-white">
									{currencySymbol}
									{summary.totalOutstanding.toLocaleString("en-US", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Total Outstanding
								</p>
							</CardContent>
						</Card>

						<Card className="border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-200">
							<CardContent className="p-5">
								<div className="flex items-start justify-between mb-3">
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
										<CheckCircle2 className="w-5 h-5 text-white" />
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-900 dark:text-white">
									{summary.paidCount}
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Paid Invoices</p>
							</CardContent>
						</Card>

						<Card className="border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-300">
							<CardContent className="p-5">
								<div className="flex items-start justify-between mb-3">
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
										<AlertTriangle className="w-5 h-5 text-white" />
									</div>
								</div>
								<p className="text-2xl font-bold text-slate-900 dark:text-white">
									{summary.overdueCount}
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
									Overdue Invoices
								</p>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Charts & Detailed Views */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					{/* Monthly Revenue Chart */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-400">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
									<BarChart3 className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">
									Monthly Revenue
								</h3>
							</div>
							{invoices.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<PieChart className="w-10 h-10 text-slate-300 mb-3" />
									<p className="text-sm text-slate-500 dark:text-slate-400">
										No data yet. Create invoices to see revenue trends.
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{monthlyData.map((m) => (
										<div key={m.label}>
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm text-slate-600 dark:text-slate-400">
													{m.label}
												</span>
												<span className="text-sm font-medium text-slate-800 dark:text-slate-200">
													{currencySymbol}
													{m.revenue.toLocaleString("en-US", {
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													})}
												</span>
											</div>
											<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
												<div
													className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000"
													style={{
														width: `${(m.revenue / maxMonthlyRevenue) * 100}%`,
													}}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Invoice Status Breakdown */}
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-500">
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-5">
								<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
									<PieChart className="w-4 h-4 text-white" />
								</div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">
									Invoice Breakdown
								</h3>
							</div>
							{invoices.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<FileText className="w-10 h-10 text-slate-300 mb-3" />
									<p className="text-sm text-slate-500 dark:text-slate-400">
										No invoices to analyze yet.
									</p>
								</div>
							) : (
								<div className="space-y-4">
									{/* Status bars */}
									{[
										{
											label: "Paid",
											count: paidInvoices.length,
											total: paidInvoices.reduce(
												(s, inv) => s + inv.grandTotal,
												0,
											),
											color: "from-emerald-500 to-teal-500",
											bg: "bg-emerald-50 dark:bg-emerald-900/20",
											text: "text-emerald-700",
										},
										{
											label: "Unpaid",
											count: unpaidInvoices.length,
											total: unpaidInvoices.reduce(
												(s, inv) => s + inv.grandTotal,
												0,
											),
											color: "from-amber-500 to-orange-500",
											bg: "bg-amber-50 dark:bg-amber-900/20",
											text: "text-amber-700",
										},
										{
											label: "Overdue",
											count: overdueInvoices.length,
											total: overdueInvoices.reduce(
												(s, inv) => s + inv.grandTotal,
												0,
											),
											color: "from-red-500 to-rose-500",
											bg: "bg-red-50 dark:bg-red-900/20",
											text: "text-red-700",
										},
									].map((item) => (
										<div
											key={item.label}
											className={cn(
												"flex items-center justify-between p-3 rounded-xl border transition-colors",
												item.bg,
												"border-transparent",
											)}
										>
											<div className="flex items-center gap-3">
												<div
													className={cn(
														"w-2.5 h-2.5 rounded-full bg-gradient-to-br",
														item.color,
													)}
												/>
												<div>
													<p
														className={cn(
															"text-sm font-medium",
															item.text,
														)}
													>
														{item.label}
													</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">
														{item.count} invoice
														{item.count !== 1 ? "s" : ""}
													</p>
												</div>
											</div>
											<span
												className={cn(
													"text-sm font-bold",
													item.text,
												)}
											>
												{currencySymbol}
												{item.total.toLocaleString("en-US", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</span>
										</div>
									))}

									{/* Total */}
									<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between items-center">
										<span className="text-sm font-medium text-slate-700 dark:text-slate-300">
											Total ({invoices.length} invoices)
										</span>
										<span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
											{currencySymbol}
											{invoices
												.reduce((s, inv) => s + inv.grandTotal, 0)
												.toLocaleString("en-US", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
										</span>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Top Clients */}
				<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-600">
					<CardContent className="p-6">
						<div className="flex items-center gap-3 mb-5">
							<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
								<Users className="w-4 h-4 text-white" />
							</div>
							<h3 className="text-base font-semibold text-slate-900 dark:text-white">
								Top Clients by Revenue
							</h3>
						</div>
						{topClients.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Users className="w-10 h-10 text-slate-300 mb-3" />
								<p className="text-sm text-slate-500 dark:text-slate-400">
									No clients yet. Add clients when creating invoices.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{topClients.map((client, idx) => (
									<div
										key={client.id}
										className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/80 dark:bg-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors"
									>
										<div className="flex items-center gap-3">
											<span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
												{idx + 1}
											</span>
											<div>
												<p className="text-sm font-medium text-slate-900 dark:text-white">
													{client.name}
												</p>
												<p className="text-xs text-slate-500 dark:text-slate-400">
													{client.email || "No email"}
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="text-sm font-semibold text-slate-900 dark:text-white">
												{currencySymbol}
												{client.totalBilled.toLocaleString("en-US", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</p>
											{client.outstandingAmount > 0 && (
												<p className="text-xs text-amber-600">
													{currencySymbol}
													{client.outstandingAmount.toLocaleString(
														"en-US",
														{
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														},
													)}{" "}
													outstanding
												</p>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
