import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	Zap,
	LogOut,
	Plus,
	FileText,
	DollarSign,
	Clock,
	AlertTriangle,
	CheckCircle2,
	TrendingUp,
	Filter,
	BarChart3,
	ArrowLeft,
	Printer,
	Pencil,
	Trash2,
	Save,
	Calculator,
} from "lucide-react";
import {
	type Invoice,
	type InvoiceItem,
	type InvoiceStatus,
	type ReportSummary,
	type Client,
	getInvoices,
	getClients,
	getClientById,
	getUserProfile,
	getCurrencySymbol,
	getReportSummary,
	refreshInvoiceStatuses,
	markInvoicePaid,
	getInvoiceById,
	deleteInvoice,
	updateInvoice,
} from "@/lib/billing-store";

export const Route = createFileRoute("/invoices/")({
	component: InvoiceListPage,
});

type FilterType = "all" | "Paid" | "Unpaid" | "Overdue";

interface EditItemRow {
	id: string;
	description: string;
	quantity: string;
	price: string;
}

function InvoiceListPage() {
	const navigate = useNavigate();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [filter, setFilter] = useState<FilterType>("all");
	const [summary, setSummary] = useState<ReportSummary | null>(null);
	const [userName, setUserName] = useState("User");
	const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
	const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
	const [editClientId, setEditClientId] = useState("");
	const [editDueDate, setEditDueDate] = useState("");
	const [editItems, setEditItems] = useState<EditItemRow[]>([]);
	const [clients, setClients] = useState<Client[]>([]);

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
		setInvoices(getInvoices());
		setSummary(getReportSummary());
		setClients(getClients());
	}, [navigate]);

	const filteredInvoices = useMemo(() => {
		if (filter === "all") return invoices;
		return invoices.filter((inv) => inv.status === filter);
	}, [invoices, filter]);

	const filters: { label: string; value: FilterType; icon: React.ComponentType<{ className?: string }> }[] = [
		{ label: "All", value: "all", icon: Filter },
		{ label: "Paid", value: "Paid", icon: CheckCircle2 },
		{ label: "Unpaid", value: "Unpaid", icon: Clock },
		{ label: "Overdue", value: "Overdue", icon: AlertTriangle },
	];

	function getClientName(clientId: string): string {
		const client = getClientById(clientId);
		return client?.name || "Unknown Client";
	}

	function handleMarkPaid(invoiceId: string) {
		markInvoicePaid(invoiceId);
		refreshInvoiceStatuses();
		setInvoices(getInvoices());
		setSummary(getReportSummary());
	}

	function handleDelete(invoiceId: string) {
		deleteInvoice(invoiceId);
		refreshInvoiceStatuses();
		setInvoices(getInvoices());
		setSummary(getReportSummary());
		setDeleteDialogId(null);
	}

	function handleStartEdit(inv: Invoice) {
		setEditInvoice(inv);
		setEditClientId(inv.clientId);
		setEditDueDate(inv.dueDate);
		setEditItems(
			inv.items.map((it) => ({
				id: it.id,
				description: it.description,
				quantity: String(it.quantity),
				price: String(it.price),
			})),
		);
	}

	function handleSaveEdit() {
		if (!editInvoice) return;
		const validItems = editItems.filter(
			(it) => it.description.trim() && parseFloat(it.price) > 0,
		);
		if (validItems.length === 0 || !editClientId || !editDueDate) return;

		updateInvoice(editInvoice.id, {
			clientId: editClientId,
			items: validItems.map((it) => ({
				description: it.description.trim(),
				quantity: parseFloat(it.quantity) || 1,
				price: parseFloat(it.price) || 0,
			})),
			currency: profile.currency,
			taxEnabled: profile.taxEnabled,
			taxRate: profile.taxRate,
			dueDate: editDueDate,
		});

		refreshInvoiceStatuses();
		setInvoices(getInvoices());
		setSummary(getReportSummary());
		setEditInvoice(null);
	}

	const editLineTotal = (item: EditItemRow) => {
		const q = parseFloat(item.quantity) || 0;
		const p = parseFloat(item.price) || 0;
		return q * p;
	};

	const editSubtotal = editItems.reduce((sum, it) => sum + editLineTotal(it), 0);
	const editTaxRate = profile.taxEnabled ? profile.taxRate : 0;
	const editTaxAmount = editSubtotal * (editTaxRate / 100);
	const editGrandTotal = editSubtotal + editTaxAmount;

	function handlePrintInvoice(invoiceId: string) {
		const inv = getInvoiceById(invoiceId);
		if (!inv) return;
		const client = getClientById(inv.clientId);
		const onboardingRaw = localStorage.getItem("billingo_onboarding");
		let bName = "Billingo";
		if (onboardingRaw) {
			try { bName = JSON.parse(onboardingRaw).businessName || bName; } catch { /* ignore */ }
		}

		const printWin = window.open("", "_blank");
		if (!printWin) return;

		const itemsHtml = inv.items.map((item) =>
			`<tr>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.description}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${currencySymbol}${item.price.toFixed(2)}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${currencySymbol}${item.total.toFixed(2)}</td>
			</tr>`
		).join("");

		printWin.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title>
		<style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
		.header{display:flex;justify-content:space-between;margin-bottom:40px}
		.logo{font-size:24px;font-weight:bold;color:#4f46e5}
		table{width:100%;border-collapse:collapse;margin:20px 0}
		th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b}
		.totals{margin-top:20px;text-align:right}
		.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:4px 0}
		.grand{font-size:18px;font-weight:bold;color:#4f46e5;border-top:2px solid #e2e8f0;padding-top:8px;margin-top:8px}
		@media print{body{margin:20px}}</style></head><body>
		<div class="header"><div><div class="logo">${bName}</div><p style="color:#64748b;font-size:14px;margin:4px 0">Invoice</p></div>
		<div style="text-align:right"><p style="font-size:20px;font-weight:bold;margin:0">${inv.invoiceNumber}</p>
		<p style="color:#64748b;font-size:13px;margin:4px 0">Date: ${new Date(inv.issueDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
		<p style="color:#64748b;font-size:13px;margin:4px 0">Due: ${new Date(inv.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
		<p style="font-size:13px;margin:4px 0"><span style="padding:2px 8px;border-radius:4px;background:${inv.status==="Paid"?"#d1fae5;color:#065f46":"#fef3c7;color:#92400e"}">${inv.status}</span></p></div></div>
		<div style="margin-bottom:30px"><p style="font-size:13px;color:#64748b;margin:0">Bill To:</p>
		<p style="font-size:16px;font-weight:600;margin:4px 0">${client?.name || "Unknown Client"}</p>
		${client?.email ? `<p style="font-size:13px;color:#64748b;margin:2px 0">${client.email}</p>` : ""}
		${client?.address ? `<p style="font-size:13px;color:#64748b;margin:2px 0">${client.address}</p>` : ""}</div>
		<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
		<tbody>${itemsHtml}</tbody></table>
		<div class="totals"><div class="row"><span>Subtotal:</span><span>${currencySymbol}${inv.subtotal.toFixed(2)}</span></div>
		${inv.taxAmount > 0 ? `<div class="row"><span>Tax:</span><span>${currencySymbol}${inv.taxAmount.toFixed(2)}</span></div>` : ""}
		<div class="row grand"><span>Grand Total:</span><span>${currencySymbol}${inv.grandTotal.toFixed(2)}</span></div></div>
		<script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
		printWin.document.close();
	}

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	const statusConfig: Record<InvoiceStatus, { bg: string; text: string; dot: string }> = {
		Paid: {
			bg: "bg-emerald-50 dark:bg-emerald-900/20",
			text: "text-emerald-700",
			dot: "bg-emerald-500",
		},
		Unpaid: {
			bg: "bg-amber-50 dark:bg-amber-900/20",
			text: "text-amber-700",
			dot: "bg-amber-500",
		},
		Overdue: {
			bg: "bg-red-50 dark:bg-red-900/20",
			text: "text-red-700",
			dot: "bg-red-500",
		},
	};

	const deleteInvoiceName = deleteDialogId
		? invoices.find((inv) => inv.id === deleteDialogId)?.invoiceNumber || ""
		: "";

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
								className="rounded-lg border-slate-200 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 gap-1.5"
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
								Invoices
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
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
								Invoices
							</h1>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
								Manage and track all your invoices in one place.
							</p>
						</div>
					</div>
					<Button
						onClick={() => navigate({ to: "/invoices/new" })}
						className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
					>
						<Plus className="w-4 h-4 mr-2" />
						New Invoice
					</Button>
				</div>

				{/* Report Summary Widgets */}
				{summary && (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up">
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

						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-100">
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

						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-200">
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

						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-300">
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

				{/* Filters */}
				<div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up animation-delay-200">
					{filters.map((f) => (
						<Button
							key={f.value}
							variant={filter === f.value ? "default" : "outline"}
							size="sm"
							onClick={() => setFilter(f.value)}
							className={cn(
								"rounded-full transition-all duration-300",
								filter === f.value
									? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/25"
									: "border-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
							)}
						>
							<f.icon className="w-3.5 h-3.5 mr-1.5" />
							{f.label}
							{f.value !== "all" && (
								<span className="ml-1.5 text-xs opacity-80">
									{f.value === "Paid"
										? summary?.paidCount
										: f.value === "Unpaid"
											? summary?.unpaidCount
											: summary?.overdueCount}
								</span>
							)}
						</Button>
					))}
				</div>

				{/* Invoice Table */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-300">
					<CardContent className="p-0">
						{filteredInvoices.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 px-4">
								<div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
									<FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
									{filter === "all"
										? "No invoices yet"
										: `No ${filter.toLowerCase()} invoices`}
								</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
									{filter === "all"
										? "Create your first invoice to get started."
										: "There are no invoices matching this filter."}
								</p>
								{filter === "all" && (
									<Button
										onClick={() => navigate({ to: "/invoices/new" })}
										className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
									>
										<Plus className="w-4 h-4 mr-2" />
										Create Invoice
									</Button>
								)}
							</div>
						) : (
							<>
								{/* Desktop Table */}
								<div className="hidden md:block">
									<Table>
										<TableHeader>
											<TableRow className="border-slate-200/60 dark:border-slate-700">
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium">
													Invoice
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium">
													Client
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium">
													Date
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium">
													Due Date
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium text-right">
													Amount
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium">
													Status
												</TableHead>
												<TableHead className="text-slate-500 dark:text-slate-400 font-medium text-right">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredInvoices.map((inv) => {
												const sc = statusConfig[inv.status];
												return (
													<TableRow
														key={inv.id}
														className="border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50"
													>
														<TableCell className="font-medium text-slate-900 dark:text-white">
															{inv.invoiceNumber}
														</TableCell>
														<TableCell className="text-slate-600 dark:text-slate-400">
															{getClientName(inv.clientId)}
														</TableCell>
														<TableCell className="text-slate-500 dark:text-slate-400 text-sm">
															{new Date(inv.issueDate).toLocaleDateString(
																"en-US",
																{
																	month: "short",
																	day: "numeric",
																	year: "numeric",
																},
															)}
														</TableCell>
														<TableCell className="text-slate-500 dark:text-slate-400 text-sm">
															{new Date(inv.dueDate).toLocaleDateString(
																"en-US",
																{
																	month: "short",
																	day: "numeric",
																	year: "numeric",
																},
															)}
														</TableCell>
														<TableCell className="text-right font-semibold text-slate-900 dark:text-white">
															{currencySymbol}
															{inv.grandTotal.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
														</TableCell>
														<TableCell>
															<span
																className={cn(
																	"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
																	sc.bg,
																	sc.text,
																)}
															>
																<span
																	className={cn(
																		"w-1.5 h-1.5 rounded-full animate-pulse",
																		sc.dot,
																	)}
																/>
																{inv.status}
															</span>
														</TableCell>
														<TableCell className="text-right">
															<div className="flex items-center justify-end gap-1.5">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => handlePrintInvoice(inv.id)}
																	className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs"
																>
																	<Printer className="w-3 h-3 mr-1" />
																	Print
																</Button>
																{inv.status !== "Paid" && (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => handleMarkPaid(inv.id)}
																		className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs"
																	>
																		<CheckCircle2 className="w-3 h-3 mr-1" />
																		Mark Paid
																	</Button>
																)}
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => handleStartEdit(inv)}
																	className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs"
																>
																	<Pencil className="w-3 h-3 mr-1" />
																	Edit
																</Button>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => setDeleteDialogId(inv.id)}
																	className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs"
																>
																	<Trash2 className="w-3 h-3 mr-1" />
																	Delete
																</Button>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>

								{/* Mobile Cards */}
								<div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
									{filteredInvoices.map((inv) => {
										const sc = statusConfig[inv.status];
										return (
											<div
												key={inv.id}
												className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
											>
												<div className="flex items-start justify-between mb-2">
													<div>
														<p className="font-semibold text-slate-900 dark:text-white">
															{inv.invoiceNumber}
														</p>
														<p className="text-sm text-slate-500 dark:text-slate-400">
															{getClientName(inv.clientId)}
														</p>
													</div>
													<span
														className={cn(
															"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
															sc.bg,
															sc.text,
														)}
													>
														<span
															className={cn(
																"w-1.5 h-1.5 rounded-full animate-pulse",
																sc.dot,
															)}
														/>
														{inv.status}
													</span>
												</div>
												<div className="flex items-end justify-between">
													<div className="text-xs text-slate-400 dark:text-slate-500">
														<p>
															Issued:{" "}
															{new Date(inv.issueDate).toLocaleDateString(
																"en-US",
																{
																	month: "short",
																	day: "numeric",
																},
															)}
														</p>
														<p>
															Due:{" "}
															{new Date(inv.dueDate).toLocaleDateString(
																"en-US",
																{
																	month: "short",
																	day: "numeric",
																},
															)}
														</p>
													</div>
													<div className="text-right">
														<p className="text-lg font-bold text-slate-900 dark:text-white">
															{currencySymbol}
															{inv.grandTotal.toLocaleString("en-US", {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}
														</p>
														<div className="flex items-center justify-end gap-1.5 mt-2 flex-wrap">
															<Button
																variant="outline"
																size="sm"
																onClick={() => handlePrintInvoice(inv.id)}
																className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs"
															>
																<Printer className="w-3 h-3 mr-1" />
																Print
															</Button>
															{inv.status !== "Paid" && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => handleMarkPaid(inv.id)}
																	className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs"
																>
																	<CheckCircle2 className="w-3 h-3 mr-1" />
																	Mark Paid
																</Button>
															)}
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleStartEdit(inv)}
																className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs"
															>
																<Pencil className="w-3 h-3 mr-1" />
																Edit
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() => setDeleteDialogId(inv.id)}
																className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs"
															>
																<Trash2 className="w-3 h-3 mr-1" />
																Delete
															</Button>
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</main>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogId !== null} onOpenChange={(open) => { if (!open) setDeleteDialogId(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600">
							<Trash2 className="w-5 h-5" />
							Delete Invoice
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete invoice <span className="font-semibold text-slate-900 dark:text-white">{deleteInvoiceName}</span>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setDeleteDialogId(null)} className="rounded-xl">
							Cancel
						</Button>
						<Button
							onClick={() => deleteDialogId && handleDelete(deleteDialogId)}
							className="rounded-xl bg-red-600 text-white hover:bg-red-700"
						>
							<Trash2 className="w-4 h-4 mr-1" />
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Invoice Dialog */}
			<Dialog open={editInvoice !== null} onOpenChange={(open) => { if (!open) setEditInvoice(null); }}>
				<DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="w-5 h-5 text-indigo-600" />
							Edit Invoice {editInvoice?.invoiceNumber}
						</DialogTitle>
						<DialogDescription>
							Update invoice details below.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 py-2">
						{/* Client & Due Date */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</Label>
								<Select value={editClientId} onValueChange={setEditClientId}>
									<SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
										<SelectValue placeholder="Select a client" />
									</SelectTrigger>
									<SelectContent>
										{clients.map((c) => (
											<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due Date</Label>
								<Input
									type="date"
									value={editDueDate}
									onChange={(e) => setEditDueDate(e.target.value)}
									className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
								/>
							</div>
						</div>

						{/* Line Items */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
									<Calculator className="w-3.5 h-3.5 text-indigo-600" />
									Line Items
								</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setEditItems((prev) => [...prev, { id: String(Date.now()), description: "", quantity: "1", price: "" }])}
									className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs"
								>
									<Plus className="w-3 h-3 mr-1" />Add
								</Button>
							</div>
							<div className="space-y-2">
								{editItems.map((item) => (
									<div key={item.id} className="grid grid-cols-[1fr_70px_90px_70px_32px] gap-2 items-center group">
										<Input
											placeholder="Description"
											value={item.description}
											onChange={(e) => setEditItems((prev) => prev.map((it) => it.id === item.id ? { ...it, description: e.target.value } : it))}
											className="h-9 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-sm"
										/>
										<Input
											type="number"
											min="1"
											placeholder="1"
											value={item.quantity}
											onChange={(e) => setEditItems((prev) => prev.map((it) => it.id === item.id ? { ...it, quantity: e.target.value } : it))}
											className="h-9 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-sm"
										/>
										<Input
											type="number"
											min="0"
											step="0.01"
											placeholder="0.00"
											value={item.price}
											onChange={(e) => setEditItems((prev) => prev.map((it) => it.id === item.id ? { ...it, price: e.target.value } : it))}
											className="h-9 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-sm"
										/>
										<div className="text-right text-xs font-medium text-slate-900 dark:text-white">
											{currencySymbol}{editLineTotal(item).toFixed(2)}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={() => setEditItems((prev) => prev.length > 1 ? prev.filter((it) => it.id !== item.id) : prev)}
											disabled={editItems.length === 1}
										>
											<Trash2 className="w-3 h-3" />
										</Button>
									</div>
								))}
							</div>
						</div>

						{/* Summary */}
						<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
								<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{editSubtotal.toFixed(2)}</span>
							</div>
							{profile.taxEnabled && (
								<div className="flex justify-between text-sm">
									<span className="text-slate-500 dark:text-slate-400">Tax ({profile.taxRate}%)</span>
									<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{editTaxAmount.toFixed(2)}</span>
								</div>
							)}
							<div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
								<span className="text-sm font-bold text-slate-900 dark:text-white">Grand Total</span>
								<span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
									{currencySymbol}{editGrandTotal.toFixed(2)}
								</span>
							</div>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setEditInvoice(null)} className="rounded-xl">
							Cancel
						</Button>
						<Button
							onClick={handleSaveEdit}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
						>
							<Save className="w-4 h-4 mr-1" />
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
