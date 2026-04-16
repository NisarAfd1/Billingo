import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
	Trash2,
	FileText,
	ArrowLeft,
	Save,
	CheckCircle2,
	UserPlus,
	Calculator,
	Printer,
	Clock,
	Send,
	Eye,
	Pencil,
} from "lucide-react";
import {
	type Client,
	getClients,
	saveClient,
	getUserProfile,
	getCurrencySymbol,
} from "@/lib/billing-store";

export const Route = createFileRoute("/estimates")({
	component: EstimatesPage,
});

interface EstimateItem {
	id: string;
	description: string;
	quantity: string;
	price: string;
}

type EstimateStatus = "Draft" | "Sent" | "Accepted" | "Declined";

interface Estimate {
	id: string;
	estimateNumber: string;
	clientId: string;
	clientName: string;
	items: { description: string; quantity: number; price: number; total: number }[];
	subtotal: number;
	taxAmount: number;
	grandTotal: number;
	status: EstimateStatus;
	createdDate: string;
	validUntil: string;
}

// localStorage helpers for estimates
function getEstimates(): Estimate[] {
	try {
		const raw = localStorage.getItem("billingo_estimates");
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveEstimates(estimates: Estimate[]): void {
	localStorage.setItem("billingo_estimates", JSON.stringify(estimates));
}

function getNextEstimateNumber(): string {
	const raw = localStorage.getItem("billingo_estimate_counter");
	const counter = raw ? parseInt(raw, 10) + 1 : 1;
	localStorage.setItem("billingo_estimate_counter", String(counter));
	return `EST-${String(counter).padStart(4, "0")}`;
}

function EstimatesPage() {
	const navigate = useNavigate();
	const [view, setView] = useState<"list" | "create">("list");
	const [estimates, setEstimates] = useState<Estimate[]>([]);
	const [userName, setUserName] = useState("User");
	const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
	const [editEstimate, setEditEstimate] = useState<Estimate | null>(null);
	const [editClientId, setEditClientId] = useState("");
	const [editValidUntil, setEditValidUntil] = useState("");
	const [editItems, setEditItems] = useState<EstimateItem[]>([]);
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
		setEstimates(getEstimates());
		setClients(getClients());
	}, [navigate]);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	function handleEstimateCreated() {
		setEstimates(getEstimates());
		setView("list");
	}

	function handleUpdateStatus(id: string, status: EstimateStatus) {
		const all = getEstimates();
		const idx = all.findIndex((e) => e.id === id);
		if (idx !== -1) {
			all[idx].status = status;
			saveEstimates(all);
			setEstimates(all);
		}
	}

	function handleDelete(id: string) {
		const all = getEstimates().filter((e) => e.id !== id);
		saveEstimates(all);
		setEstimates(all);
		setDeleteDialogId(null);
	}

	function handleStartEdit(est: Estimate) {
		setEditEstimate(est);
		setEditClientId(est.clientId);
		setEditValidUntil(est.validUntil);
		setEditItems(
			est.items.map((it, idx) => ({
				id: String(idx),
				description: it.description,
				quantity: String(it.quantity),
				price: String(it.price),
			})),
		);
	}

	const editLineTotal = (item: EstimateItem) => {
		const q = parseFloat(item.quantity) || 0;
		const p = parseFloat(item.price) || 0;
		return q * p;
	};

	const editSubtotal = editItems.reduce((sum, it) => sum + editLineTotal(it), 0);
	const editTaxRate = profile.taxEnabled ? profile.taxRate : 0;
	const editTaxAmount = editSubtotal * (editTaxRate / 100);
	const editGrandTotal = editSubtotal + editTaxAmount;

	function handleSaveEdit() {
		if (!editEstimate) return;
		const validItems = editItems.filter(
			(it) => it.description.trim() && parseFloat(it.price) > 0,
		);
		if (validItems.length === 0 || !editClientId || !editValidUntil) return;

		const client = clients.find((c) => c.id === editClientId);
		const all = getEstimates();
		const idx = all.findIndex((e) => e.id === editEstimate.id);
		if (idx === -1) return;

		all[idx] = {
			...all[idx],
			clientId: editClientId,
			clientName: client?.name || "Unknown",
			validUntil: editValidUntil,
			items: validItems.map((it) => ({
				description: it.description.trim(),
				quantity: parseFloat(it.quantity) || 1,
				price: parseFloat(it.price) || 0,
				total: editLineTotal(it),
			})),
			subtotal: editSubtotal,
			taxAmount: editTaxAmount,
			grandTotal: editGrandTotal,
		};

		saveEstimates(all);
		setEstimates(all);
		setEditEstimate(null);
	}

	function handlePrintEstimate(est: Estimate) {
		const onboardingRaw = localStorage.getItem("billingo_onboarding");
		let bName = "Billingo";
		if (onboardingRaw) {
			try { bName = JSON.parse(onboardingRaw).businessName || bName; } catch { /* ignore */ }
		}

		const printWin = window.open("", "_blank");
		if (!printWin) return;

		const itemsHtml = est.items.map((item) =>
			`<tr>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${item.description}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${currencySymbol}${item.price.toFixed(2)}</td>
				<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${currencySymbol}${item.total.toFixed(2)}</td>
			</tr>`
		).join("");

		printWin.document.write(`<!DOCTYPE html><html><head><title>Estimate ${est.estimateNumber}</title>
		<style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
		.header{display:flex;justify-content:space-between;margin-bottom:40px}
		.logo{font-size:24px;font-weight:bold;color:#4f46e5}
		table{width:100%;border-collapse:collapse;margin:20px 0}
		th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b}
		.totals{margin-top:20px;text-align:right}
		.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:4px 0}
		.grand{font-size:18px;font-weight:bold;color:#4f46e5;border-top:2px solid #e2e8f0;padding-top:8px;margin-top:8px}
		.note{margin-top:40px;padding:16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#64748b}
		@media print{body{margin:20px}}</style></head><body>
		<div class="header"><div><div class="logo">${bName}</div><p style="color:#64748b;font-size:14px;margin:4px 0">Estimate / Quotation</p></div>
		<div style="text-align:right"><p style="font-size:20px;font-weight:bold;margin:0">${est.estimateNumber}</p>
		<p style="color:#64748b;font-size:13px;margin:4px 0">Date: ${new Date(est.createdDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
		<p style="color:#64748b;font-size:13px;margin:4px 0">Valid Until: ${new Date(est.validUntil).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p></div></div>
		<div style="margin-bottom:30px"><p style="font-size:13px;color:#64748b;margin:0">Prepared For:</p>
		<p style="font-size:16px;font-weight:600;margin:4px 0">${est.clientName}</p></div>
		<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
		<tbody>${itemsHtml}</tbody></table>
		<div class="totals"><div class="row"><span>Subtotal:</span><span>${currencySymbol}${est.subtotal.toFixed(2)}</span></div>
		${est.taxAmount > 0 ? `<div class="row"><span>Tax:</span><span>${currencySymbol}${est.taxAmount.toFixed(2)}</span></div>` : ""}
		<div class="row grand"><span>Grand Total:</span><span>${currencySymbol}${est.grandTotal.toFixed(2)}</span></div></div>
		<div class="note">This estimate is valid until ${new Date(est.validUntil).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}. Prices are subject to change after the expiry date.</div>
		<script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
		printWin.document.close();
	}

	const statusConfig: Record<EstimateStatus, { bg: string; text: string }> = {
		Draft: { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-700 dark:text-slate-300" },
		Sent: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
		Accepted: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
		Declined: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
	};

	const deleteEstimateName = deleteDialogId
		? estimates.find((e) => e.id === deleteDialogId)?.estimateNumber || ""
		: "";

	return (
		<div className="min-h-screen bg-slate-50/50 dark:bg-slate-900">
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
								Estimates
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{userName}</span>
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
								{userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
							</div>
							<Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:text-red-600">
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{view === "list" ? (
					<>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
							<div className="flex items-center gap-3">
								<div>
									<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Estimates</h1>
									<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create and manage quotations for your clients.</p>
								</div>
							</div>
							<Button
								onClick={() => setView("create")}
								className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
							>
								<Plus className="w-4 h-4 mr-2" />
								New Estimate
							</Button>
						</div>

						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-100">
							<CardContent className="p-0">
								{estimates.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-16 px-4">
										<div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
											<FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
										</div>
										<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No estimates yet</h3>
										<p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">Create your first estimate to send to clients.</p>
										<Button
											onClick={() => setView("create")}
											className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
										>
											<Plus className="w-4 h-4 mr-2" />
											Create Estimate
										</Button>
									</div>
								) : (
									<>
										{/* Desktop Table */}
										<div className="hidden md:block">
											<Table>
												<TableHeader>
													<TableRow className="border-slate-200/60 dark:border-slate-700">
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium">Estimate #</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium">Client</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium">Date</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium">Valid Until</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium text-right">Amount</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium">Status</TableHead>
														<TableHead className="text-slate-500 dark:text-slate-400 font-medium text-right">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{estimates.map((est) => {
														const sc = statusConfig[est.status];
														return (
															<TableRow key={est.id} className="border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
																<TableCell className="font-medium text-slate-900 dark:text-white">{est.estimateNumber}</TableCell>
																<TableCell className="text-slate-600 dark:text-slate-400">{est.clientName}</TableCell>
																<TableCell className="text-slate-500 dark:text-slate-400 text-sm">
																	{new Date(est.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
																</TableCell>
																<TableCell className="text-slate-500 dark:text-slate-400 text-sm">
																	{new Date(est.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
																</TableCell>
																<TableCell className="text-right font-semibold text-slate-900 dark:text-white">
																	{currencySymbol}{est.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
																</TableCell>
																<TableCell>
																	<span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", sc.bg, sc.text)}>
																		{est.status}
																	</span>
																</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-1.5">
																		<Button variant="outline" size="sm" onClick={() => handlePrintEstimate(est)}
																			className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs">
																			<Printer className="w-3 h-3 mr-1" />Print
																		</Button>
																		{est.status === "Draft" && (
																			<Button variant="outline" size="sm" onClick={() => handleUpdateStatus(est.id, "Sent")}
																				className="rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 text-xs">
																				<Send className="w-3 h-3 mr-1" />Send
																			</Button>
																		)}
																		{est.status === "Sent" && (
																			<Button variant="outline" size="sm" onClick={() => handleUpdateStatus(est.id, "Accepted")}
																				className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs">
																				<CheckCircle2 className="w-3 h-3 mr-1" />Accept
																			</Button>
																		)}
																		<Button variant="outline" size="sm" onClick={() => handleStartEdit(est)}
																			className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs">
																			<Pencil className="w-3 h-3 mr-1" />Edit
																		</Button>
																		<Button variant="outline" size="sm" onClick={() => setDeleteDialogId(est.id)}
																			className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs">
																			<Trash2 className="w-3 h-3 mr-1" />Delete
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
											{estimates.map((est) => {
												const sc = statusConfig[est.status];
												return (
													<div key={est.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
														<div className="flex items-start justify-between mb-2">
															<div>
																<p className="font-semibold text-slate-900 dark:text-white">{est.estimateNumber}</p>
																<p className="text-sm text-slate-500 dark:text-slate-400">{est.clientName}</p>
															</div>
															<span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", sc.bg, sc.text)}>
																{est.status}
															</span>
														</div>
														<div className="flex items-end justify-between">
															<div className="text-xs text-slate-400 dark:text-slate-500">
																<p>Created: {new Date(est.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
																<p>Valid: {new Date(est.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
															</div>
															<div className="text-right">
																<p className="text-lg font-bold text-slate-900 dark:text-white">
																	{currencySymbol}{est.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
																</p>
																<div className="flex items-center justify-end gap-1.5 mt-2 flex-wrap">
																	<Button variant="outline" size="sm" onClick={() => handlePrintEstimate(est)}
																		className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs">
																		<Printer className="w-3 h-3 mr-1" />Print
																	</Button>
																	<Button variant="outline" size="sm" onClick={() => handleStartEdit(est)}
																		className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs">
																		<Pencil className="w-3 h-3 mr-1" />Edit
																	</Button>
																	<Button variant="outline" size="sm" onClick={() => setDeleteDialogId(est.id)}
																		className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs">
																		<Trash2 className="w-3 h-3 mr-1" />Delete
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
					</>
				) : (
					<EstimateCreateForm
						currencySymbol={currencySymbol}
						profile={profile}
						onCreated={handleEstimateCreated}
						onCancel={() => setView("list")}
					/>
				)}
			</main>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogId !== null} onOpenChange={(open) => { if (!open) setDeleteDialogId(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl dark:bg-slate-800 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
							<Trash2 className="w-5 h-5" />
							Delete Estimate
						</DialogTitle>
						<DialogDescription className="dark:text-slate-400">
							Are you sure you want to delete estimate <span className="font-semibold text-slate-900 dark:text-white">{deleteEstimateName}</span>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setDeleteDialogId(null)} className="rounded-xl dark:border-slate-600">
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

			{/* Edit Estimate Dialog */}
			<Dialog open={editEstimate !== null} onOpenChange={(open) => { if (!open) setEditEstimate(null); }}>
				<DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 dark:text-white">
							<Pencil className="w-5 h-5 text-indigo-600" />
							Edit Estimate {editEstimate?.estimateNumber}
						</DialogTitle>
						<DialogDescription className="dark:text-slate-400">
							Update estimate details below.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-5 py-2">
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
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valid Until</Label>
								<Input
									type="date"
									value={editValidUntil}
									onChange={(e) => setEditValidUntil(e.target.value)}
									className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
								/>
							</div>
						</div>

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
						<Button variant="outline" onClick={() => setEditEstimate(null)} className="rounded-xl dark:border-slate-600">
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

// ── Create Estimate Form ──

function EstimateCreateForm({
	currencySymbol,
	profile,
	onCreated,
	onCancel,
}: {
	currencySymbol: string;
	profile: ReturnType<typeof getUserProfile>;
	onCreated: () => void;
	onCancel: () => void;
}) {
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClientId, setSelectedClientId] = useState("");
	const [items, setItems] = useState<EstimateItem[]>([
		{ id: "1", description: "", quantity: "1", price: "" },
	]);
	const [validUntil, setValidUntil] = useState("");
	const [showClientDialog, setShowClientDialog] = useState(false);
	const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "" });
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		setClients(getClients());
		const d = new Date();
		d.setDate(d.getDate() + 30);
		setValidUntil(d.toISOString().split("T")[0]);
	}, []);

	const addItem = useCallback(() => {
		setItems((prev) => [...prev, { id: String(Date.now()), description: "", quantity: "1", price: "" }]);
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
	}, []);

	const updateItem = useCallback((id: string, field: keyof EstimateItem, value: string) => {
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
	}, []);

	const lineTotal = (item: EstimateItem) => {
		const q = parseFloat(item.quantity) || 0;
		const p = parseFloat(item.price) || 0;
		return q * p;
	};

	const subtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
	const taxRate = profile.taxEnabled ? profile.taxRate : 0;
	const taxAmount = subtotal * (taxRate / 100);
	const grandTotal = subtotal + taxAmount;

	function handleAddClient() {
		if (!newClient.name.trim()) return;
		const created = saveClient({
			name: newClient.name.trim(),
			email: newClient.email.trim(),
			phone: newClient.phone.trim(),
			address: newClient.address.trim(),
		});
		setClients(getClients());
		setSelectedClientId(created.id);
		setNewClient({ name: "", email: "", phone: "", address: "" });
		setShowClientDialog(false);
	}

	function handleSave() {
		const errs: Record<string, string> = {};
		if (!selectedClientId) errs.client = "Select a client";
		if (!validUntil) errs.validUntil = "Set a valid-until date";
		const validItems = items.filter((it) => it.description.trim() && parseFloat(it.price) > 0);
		if (validItems.length === 0) errs.items = "Add at least one item";
		setErrors(errs);
		if (Object.keys(errs).length > 0) return;

		setSaving(true);

		const client = clients.find((c) => c.id === selectedClientId);
		const estimate: Estimate = {
			id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			estimateNumber: getNextEstimateNumber(),
			clientId: selectedClientId,
			clientName: client?.name || "Unknown",
			items: validItems.map((it) => ({
				description: it.description.trim(),
				quantity: parseFloat(it.quantity) || 1,
				price: parseFloat(it.price) || 0,
				total: lineTotal(it),
			})),
			subtotal,
			taxAmount,
			grandTotal,
			status: "Draft",
			createdDate: new Date().toISOString().split("T")[0],
			validUntil,
		};

		const existing = getEstimates();
		existing.push(estimate);
		saveEstimates(existing);

		setTimeout(() => {
			setSaving(false);
			setSaved(true);
			setTimeout(() => onCreated(), 1200);
		}, 600);
	}

	if (saved) {
		return (
			<Card className="border-emerald-200 dark:border-emerald-700 dark:bg-slate-800 animate-scale-in">
				<CardContent className="p-12 text-center">
					<div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
						<CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
					</div>
					<h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Estimate Created!</h2>
					<p className="text-slate-500 dark:text-slate-400">Redirecting to your estimates...</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-8 animate-fade-in-up">
				<Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 dark:text-slate-400">
					<ArrowLeft className="w-4 h-4" />
				</Button>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
						<FileText className="w-7 h-7 text-indigo-600" />
						Create Estimate
					</h1>
					<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Fill in the details to create a new estimate or quotation.</p>
				</div>
			</div>

			{/* Client & Valid Until */}
			<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up">
				<CardContent className="p-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</Label>
							<div className="flex gap-2">
								<Select
									value={selectedClientId}
									onValueChange={(val) => {
										setSelectedClientId(val);
										setErrors((prev) => { const next = { ...prev }; delete next.client; return next; });
									}}
								>
									<SelectTrigger className={cn("w-full h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600", errors.client && "border-red-400")}>
										<SelectValue placeholder="Select a client" />
									</SelectTrigger>
									<SelectContent>
										{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
										{clients.length === 0 && (<div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No clients yet.</div>)}
									</SelectContent>
								</Select>
								<Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-600 shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" onClick={() => setShowClientDialog(true)}>
									<UserPlus className="w-4 h-4 text-indigo-600" />
								</Button>
							</div>
							{errors.client && <p className="text-xs text-red-500">{errors.client}</p>}
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Valid Until</Label>
							<Input type="date" value={validUntil}
								onChange={(e) => { setValidUntil(e.target.value); setErrors((prev) => { const next = { ...prev }; delete next.validUntil; return next; }); }}
								className={cn("h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600", errors.validUntil && "border-red-400")} />
							{errors.validUntil && <p className="text-xs text-red-500">{errors.validUntil}</p>}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Items */}
			<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-100">
				<CardContent className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
							<Calculator className="w-4 h-4 text-indigo-600" />Line Items
						</h3>
						<Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50">
							<Plus className="w-3.5 h-3.5 mr-1" />Add Item
						</Button>
					</div>
					{errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

					<div className="space-y-2">
						{items.map((item, idx) => (
							<div key={item.id} className="grid grid-cols-[1fr_80px_100px_80px_36px] sm:grid-cols-[1fr_100px_120px_100px_40px] gap-2 sm:gap-3 items-center group">
								<Input placeholder="Description" value={item.description}
									onChange={(e) => updateItem(item.id, "description", e.target.value)}
									className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
								<Input type="number" min="1" placeholder="1" value={item.quantity}
									onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
									className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
								<Input type="number" min="0" step="0.01" placeholder="0.00" value={item.price}
									onChange={(e) => updateItem(item.id, "price", e.target.value)}
									className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
								<div className="text-right font-medium text-slate-900 dark:text-white text-sm">
									{currencySymbol}{lineTotal(item).toFixed(2)}
								</div>
								<Button type="button" variant="ghost" size="icon"
									className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={() => removeItem(item.id)} disabled={items.length === 1}>
									<Trash2 className="w-3.5 h-3.5" />
								</Button>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Summary */}
			<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-200">
				<CardContent className="p-6">
					<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Summary</h3>
					<div className="space-y-3">
						<div className="flex justify-between text-sm">
							<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
							<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{subtotal.toFixed(2)}</span>
						</div>
						{profile.taxEnabled && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-500 dark:text-slate-400">Tax ({profile.taxRate}%)</span>
								<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{taxAmount.toFixed(2)}</span>
							</div>
						)}
						<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between">
							<span className="text-base font-bold text-slate-900 dark:text-white">Grand Total</span>
							<span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
								{currencySymbol}{grandTotal.toFixed(2)}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up animation-delay-300">
				<Button onClick={handleSave} disabled={saving}
					className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90">
					{saving ? (
						<div className="flex items-center gap-2">
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...
						</div>
					) : (
						<div className="flex items-center gap-2"><Save className="w-4 h-4" />Save Estimate</div>
					)}
				</Button>
				<Button variant="outline" onClick={onCancel} className="h-12 rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">Cancel</Button>
			</div>

			{/* Add Client Dialog */}
			<Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
				<DialogContent className="sm:max-w-md rounded-2xl dark:bg-slate-800 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 dark:text-white"><UserPlus className="w-5 h-5 text-indigo-600" />Add New Client</DialogTitle>
						<DialogDescription className="dark:text-slate-400">Enter client details.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name *</Label>
							<Input placeholder="Client name" value={newClient.name}
								onChange={(e) => setNewClient((prev) => ({ ...prev, name: e.target.value }))}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
							<Input type="email" placeholder="client@example.com" value={newClient.email}
								onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowClientDialog(false)} className="rounded-xl dark:border-slate-600">Cancel</Button>
						<Button onClick={handleAddClient} disabled={!newClient.name.trim()}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							<Plus className="w-4 h-4 mr-1" />Add Client
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
