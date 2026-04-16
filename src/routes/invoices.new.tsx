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
	Building2,
	DollarSign,
} from "lucide-react";
import {
	type Client,
	type UserProfile,
	getClients,
	saveClient,
	createInvoice,
	getUserProfile,
	getCurrencySymbol,
} from "@/lib/billing-store";
import { CURRENCIES, getBusinessCurrency } from "@/lib/currency";
import { getTaxConfig } from "@/lib/tax-engine";
import { getBranches, getActiveBranchId } from "@/lib/branch-store";
import { type Product, getProducts } from "@/lib/product-store";

export const Route = createFileRoute("/invoices/new")({
	component: InvoiceCreatePage,
});

interface ItemRow {
	id: string;
	description: string;
	quantity: string;
	price: string;
	productId?: string;
}

function InvoiceCreatePage() {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [clients, setClients] = useState<Client[]>([]);
	const [selectedClientId, setSelectedClientId] = useState("");
	const [items, setItems] = useState<ItemRow[]>([
		{ id: "1", description: "", quantity: "1", price: "" },
	]);
	const [dueDate, setDueDate] = useState("");
	const [showClientDialog, setShowClientDialog] = useState(false);
	const [newClient, setNewClient] = useState({
		name: "",
		email: "",
		phone: "",
		address: "",
	});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [invoiceCurrency, setInvoiceCurrency] = useState(getBusinessCurrency());
	const [invoiceBranchId, setInvoiceBranchId] = useState(getActiveBranchId() || "");
	const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

	const branches = getBranches();
	const taxConfig = getTaxConfig();

	useEffect(() => {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) {
			navigate({ to: "/login" });
			return;
		}
		setProfile(getUserProfile());
		setClients(getClients());
		setAvailableProducts(getProducts());

		// Default due date: 30 days from now
		const d = new Date();
		d.setDate(d.getDate() + 30);
		setDueDate(d.toISOString().split("T")[0]);
	}, [navigate]);

	const invoiceCurrencyConfig = CURRENCIES[invoiceCurrency];
	const currencySymbol = invoiceCurrencyConfig?.symbol || getCurrencySymbol(profile?.currency || "USD");

	// ── Item Helpers ──

	const addItem = useCallback(() => {
		setItems((prev) => [
			...prev,
			{
				id: String(Date.now()),
				description: "",
				quantity: "1",
				price: "",
			},
		]);
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
	}, []);

	const updateItem = useCallback(
		(id: string, field: keyof ItemRow, value: string) => {
			setItems((prev) =>
				prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
			);
		},
		[],
	);

	const selectProductForItem = useCallback((itemId: string, productId: string) => {
		if (productId === "manual") {
			setItems((prev) =>
				prev.map((it) => it.id === itemId ? { ...it, productId: undefined } : it),
			);
			return;
		}
		const product = availableProducts.find((p) => p.id === productId);
		if (!product) return;
		setItems((prev) =>
			prev.map((it) =>
				it.id === itemId
					? {
						...it,
						productId: product.id,
						description: product.name,
						price: String(product.basePrice),
					}
					: it,
			),
		);
	}, [availableProducts]);

	// ── Calculations ──

	const lineTotal = (item: ItemRow) => {
		const q = parseFloat(item.quantity) || 0;
		const p = parseFloat(item.price) || 0;
		return q * p;
	};

	const subtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
	const effectiveTaxEnabled = taxConfig.enabled || (profile?.taxEnabled ?? false);
	const effectiveTaxRate = taxConfig.enabled ? taxConfig.taxRate : (profile?.taxRate || 0);
	const effectiveTaxName = taxConfig.enabled ? taxConfig.taxName : "Tax";
	const taxRate = effectiveTaxEnabled ? effectiveTaxRate : 0;
	const taxAmount = subtotal * (taxRate / 100);
	const grandTotal = subtotal + taxAmount;

	// ── Add Client ──

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

	// ── Save Invoice ──

	function validate(): Record<string, string> {
		const errs: Record<string, string> = {};
		if (!selectedClientId) errs.client = "Select a client";
		if (!dueDate) errs.dueDate = "Set a due date";
		const validItems = items.filter(
			(it) => it.description.trim() && parseFloat(it.price) > 0,
		);
		if (validItems.length === 0) errs.items = "Add at least one item";
		return errs;
	}

	function handleSave() {
		const errs = validate();
		setErrors(errs);
		if (Object.keys(errs).length > 0) return;

		setSaving(true);
		const validItems = items.filter(
			(it) => it.description.trim() && parseFloat(it.price) > 0,
		);

		createInvoice({
			clientId: selectedClientId,
			items: validItems.map((it) => ({
				description: it.description.trim(),
				quantity: parseFloat(it.quantity) || 1,
				price: parseFloat(it.price) || 0,
				productId: it.productId,
			})),
			currency: profile?.currency || "USD - US Dollar",
			currencyCode: invoiceCurrency,
			taxEnabled: effectiveTaxEnabled,
			taxRate: effectiveTaxRate,
			dueDate,
			branchId: invoiceBranchId && invoiceBranchId !== "none" ? invoiceBranchId : undefined,
			taxName: effectiveTaxName,
		});

		setTimeout(() => {
			setSaving(false);
			setSaved(true);
			setTimeout(() => {
				navigate({ to: "/invoices" });
			}, 1200);
		}, 600);
	}

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	if (!profile) return null;

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
								onClick={() => navigate({ to: "/invoices" })}
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
							<Link
								to="/invoices"
								className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors"
							>
								Invoices
							</Link>
							<span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500">/</span>
							<span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
								New Invoice
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
								{profile.name}
							</span>
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
								{profile.name
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
								className="text-slate-500 dark:text-slate-400 hover:text-red-600"
							>
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Body */}
			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page heading */}
				<div className="flex items-center gap-3 mb-8 animate-fade-in-up">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
							<FileText className="w-7 h-7 text-indigo-600" />
							Create Invoice
						</h1>
						<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
							Fill in the details below to generate a new invoice.
						</p>
					</div>
				</div>

				{saved ? (
					<Card className="border-emerald-200 animate-scale-in dark:bg-slate-800 dark:border-slate-700">
						<CardContent className="p-12 text-center">
							<div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
								<CheckCircle2 className="w-8 h-8 text-emerald-600" />
							</div>
							<h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
								Invoice Created!
							</h2>
							<p className="text-slate-500 dark:text-slate-400">
								Redirecting to your invoices...
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-6">
						{/* Client & Due Date */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up">
							<CardContent className="p-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
									{/* Client Selection */}
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
											Client
										</Label>
										<div className="flex gap-2">
											<Select
												value={selectedClientId}
												onValueChange={(val) => {
													setSelectedClientId(val);
													setErrors((prev) => {
														const next = { ...prev };
														delete next.client;
														return next;
													});
												}}
											>
												<SelectTrigger
													className={cn(
														"w-full h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400",
														errors.client && "border-red-400",
													)}
												>
													<SelectValue placeholder="Select a client" />
												</SelectTrigger>
												<SelectContent>
													{clients.map((c) => (
														<SelectItem key={c.id} value={c.id}>
															{c.name}
														</SelectItem>
													))}
													{clients.length === 0 && (
														<div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
															No clients yet. Add one below.
														</div>
													)}
												</SelectContent>
											</Select>
											<Button
												type="button"
												variant="outline"
												size="icon"
												className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-600 shrink-0 hover:bg-indigo-50 hover:border-indigo-300"
												onClick={() => setShowClientDialog(true)}
											>
												<UserPlus className="w-4 h-4 text-indigo-600" />
											</Button>
										</div>
										{errors.client && (
											<p className="text-xs text-red-500">{errors.client}</p>
										)}
									</div>

									{/* Due Date */}
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
											Due Date
										</Label>
										<Input
											type="date"
											value={dueDate}
											onChange={(e) => {
												setDueDate(e.target.value);
												setErrors((prev) => {
													const next = { ...prev };
													delete next.dueDate;
													return next;
												});
											}}
											className={cn(
												"h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400",
												errors.dueDate && "border-red-400",
											)}
										/>
										{errors.dueDate && (
											<p className="text-xs text-red-500">
												{errors.dueDate}
											</p>
										)}
									</div>
								</div>

								{/* Currency & Branch Selection */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
											<DollarSign className="w-3.5 h-3.5 text-indigo-600" />
											Invoice Currency
										</Label>
										<Select value={invoiceCurrency} onValueChange={setInvoiceCurrency}>
											<SelectTrigger className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400">
												<SelectValue placeholder="Select currency" />
											</SelectTrigger>
											<SelectContent>
												{Object.values(CURRENCIES).map((c) => (
													<SelectItem key={c.code} value={c.code}>
														{c.symbol} {c.code} - {c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{branches.length > 0 && (
										<div className="space-y-2">
											<Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
												<Building2 className="w-3.5 h-3.5 text-indigo-600" />
												Branch
											</Label>
											<Select value={invoiceBranchId} onValueChange={setInvoiceBranchId}>
												<SelectTrigger className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400">
													<SelectValue placeholder="Select branch (optional)" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">No branch</SelectItem>
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
							</CardContent>
						</Card>

						{/* Items Table */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-100">
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
										<Calculator className="w-4 h-4 text-indigo-600" />
										Line Items
									</h3>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={addItem}
										className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50"
									>
										<Plus className="w-3.5 h-3.5 mr-1" />
										Add Item
									</Button>
								</div>
								{errors.items && (
									<p className="text-xs text-red-500 mb-3">{errors.items}</p>
								)}

								{/* Desktop table */}
								<div className="hidden sm:block">
									<div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-3 mb-2">
										<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
											Description
										</span>
										<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
											Qty
										</span>
										<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
											Price ({currencySymbol})
										</span>
										<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
											Total
										</span>
										<span />
									</div>
									<div className="space-y-3">
										{items.map((item) => (
											<div key={item.id} className="space-y-2">
												{availableProducts.length > 0 && (
													<Select value={item.productId || "manual"} onValueChange={(v) => selectProductForItem(item.id, v)}>
														<SelectTrigger className="h-9 rounded-lg bg-indigo-50/50 border-indigo-100 text-sm text-indigo-700 w-full">
															<SelectValue placeholder="Select product/service or enter manually" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="manual">Manual entry</SelectItem>
															{availableProducts.map((p) => (
																<SelectItem key={p.id} value={p.id}>
																	{p.name} — {p.currency} {p.basePrice.toFixed(2)} {p.type === "Service" ? "(Service)" : ""}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
												<div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-3 items-center group">
													<Input
														placeholder="Item description"
														value={item.description}
														onChange={(e) =>
															updateItem(item.id, "description", e.target.value)
														}
														className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
													/>
													<Input
														type="number"
														min="1"
														placeholder="1"
														value={item.quantity}
														onChange={(e) =>
															updateItem(item.id, "quantity", e.target.value)
														}
														className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
													/>
													<Input
														type="number"
														min="0"
														step="0.01"
														placeholder="0.00"
														value={item.price}
														onChange={(e) =>
															updateItem(item.id, "price", e.target.value)
														}
														className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
													/>
													<div className="text-right font-medium text-slate-900 dark:text-white text-sm">
														{currencySymbol}
														{lineTotal(item).toFixed(2)}
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
														onClick={() => removeItem(item.id)}
														disabled={items.length === 1}
													>
														<Trash2 className="w-3.5 h-3.5" />
													</Button>
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Mobile card layout */}
								<div className="sm:hidden space-y-4">
									{items.map((item, idx) => (
										<div
											key={item.id}
											className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3"
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
													Item {idx + 1}
												</span>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500"
													onClick={() => removeItem(item.id)}
													disabled={items.length === 1}
												>
													<Trash2 className="w-3.5 h-3.5" />
												</Button>
											</div>
											{availableProducts.length > 0 && (
												<Select value={item.productId || "manual"} onValueChange={(v) => selectProductForItem(item.id, v)}>
													<SelectTrigger className="h-9 rounded-lg bg-indigo-50/50 border-indigo-100 text-sm text-indigo-700">
														<SelectValue placeholder="Select product/service" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="manual">Manual entry</SelectItem>
														{availableProducts.map((p) => (
															<SelectItem key={p.id} value={p.id}>
																{p.name} — {p.currency} {p.basePrice.toFixed(2)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
											<Input
												placeholder="Description"
												value={item.description}
												onChange={(e) =>
													updateItem(item.id, "description", e.target.value)
												}
												className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
											/>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<Label className="text-xs text-slate-500 dark:text-slate-400">Qty</Label>
													<Input
														type="number"
														min="1"
														value={item.quantity}
														onChange={(e) =>
															updateItem(item.id, "quantity", e.target.value)
														}
														className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
													/>
												</div>
												<div>
													<Label className="text-xs text-slate-500 dark:text-slate-400">
														Price ({currencySymbol})
													</Label>
													<Input
														type="number"
														min="0"
														step="0.01"
														value={item.price}
														onChange={(e) =>
															updateItem(item.id, "price", e.target.value)
														}
														className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
													/>
												</div>
											</div>
											<div className="text-right font-medium text-slate-900 dark:text-white text-sm">
												Total: {currencySymbol}
												{lineTotal(item).toFixed(2)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Summary */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-200">
							<CardContent className="p-6">
								<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
									Summary
								</h3>
								<div className="space-y-3">
									<div className="flex justify-between text-sm">
										<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
										<span className="font-medium text-slate-900 dark:text-white">
											{currencySymbol}
											{subtotal.toFixed(2)}
										</span>
									</div>
									{effectiveTaxEnabled && (
										<div className="flex justify-between text-sm">
											<span className="text-slate-500 dark:text-slate-400">
												{effectiveTaxName} ({effectiveTaxRate}%)
											</span>
											<span className="font-medium text-slate-900 dark:text-white">
												{currencySymbol}
												{taxAmount.toFixed(2)}
											</span>
										</div>
									)}
									<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between">
										<span className="text-base font-bold text-slate-900 dark:text-white">
											Grand Total
										</span>
										<span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
											{currencySymbol}
											{grandTotal.toFixed(2)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Actions */}
						<div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up animation-delay-300">
							<Button
								onClick={handleSave}
								disabled={saving}
								className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
							>
								{saving ? (
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Saving...
									</div>
								) : (
									<div className="flex items-center gap-2">
										<Save className="w-4 h-4" />
										Save Invoice
									</div>
								)}
							</Button>
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/invoices" })}
								className="h-12 rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400"
							>
								Cancel
							</Button>
						</div>
					</div>
				)}
			</main>

			{/* Add Client Dialog */}
			<Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<UserPlus className="w-5 h-5 text-indigo-600" />
							Add New Client
						</DialogTitle>
						<DialogDescription>
							Enter client details to add them to your invoice list.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
								Name *
							</Label>
							<Input
								placeholder="Client name"
								value={newClient.name}
								onChange={(e) =>
									setNewClient((prev) => ({ ...prev, name: e.target.value }))
								}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
							<Input
								type="email"
								placeholder="client@example.com"
								value={newClient.email}
								onChange={(e) =>
									setNewClient((prev) => ({ ...prev, email: e.target.value }))
								}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</Label>
							<Input
								placeholder="+1 234 567 8900"
								value={newClient.phone}
								onChange={(e) =>
									setNewClient((prev) => ({ ...prev, phone: e.target.value }))
								}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
								Address
							</Label>
							<Input
								placeholder="123 Business St, City"
								value={newClient.address}
								onChange={(e) =>
									setNewClient((prev) => ({
										...prev,
										address: e.target.value,
									}))
								}
								className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowClientDialog(false)}
							className="rounded-xl"
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddClient}
							disabled={!newClient.name.trim()}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
						>
							<Plus className="w-4 h-4 mr-1" />
							Add Client
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
