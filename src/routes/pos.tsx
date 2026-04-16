import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	ShoppingCart,
	ArrowLeft,
	CheckCircle2,
	Printer,
	Search,
	Minus,
	Receipt,
	Package,
	Pencil,
	Save,
	History,
	LayoutGrid,
	AlertTriangle,
	X,
	CreditCard,
	Banknote,
	Wallet,
	Eye,
	TrendingUp,
	Clock,
	DollarSign,
	PackageCheck,
} from "lucide-react";
import {
	getUserProfile,
	getCurrencySymbol,
} from "@/lib/billing-store";
import { getProducts, reduceStock, type Product } from "@/lib/product-store";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/pos")({
	component: POSPage,
});

interface CartItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
	productId?: string;
	maxStock?: number;
	inventoryEnabled?: boolean;
}

interface POSSale {
	id: string;
	receiptNumber: string;
	items: CartItem[];
	subtotal: number;
	taxAmount: number;
	grandTotal: number;
	paymentMethod: string;
	date: string;
}

function getSales(): POSSale[] {
	try {
		const raw = localStorage.getItem("billingo_pos_sales");
		return raw ? JSON.parse(raw) : [];
	} catch { return []; }
}

function saveSales(sales: POSSale[]): void {
	localStorage.setItem("billingo_pos_sales", JSON.stringify(sales));
}

function getNextReceiptNumber(): string {
	const raw = localStorage.getItem("billingo_receipt_counter");
	const counter = raw ? parseInt(raw, 10) + 1 : 1;
	localStorage.setItem("billingo_receipt_counter", String(counter));
	return `REC-${String(counter).padStart(4, "0")}`;
}

interface EditSaleItem {
	id: string;
	name: string;
	price: string;
	quantity: string;
}

function POSPage() {
	const navigate = useNavigate();
	const [userName, setUserName] = useState("User");
	const [cart, setCart] = useState<CartItem[]>([]);
	const [recentSales, setRecentSales] = useState<POSSale[]>([]);
	const [saleComplete, setSaleComplete] = useState(false);
	const [lastReceipt, setLastReceipt] = useState<POSSale | null>(null);
	const [paymentMethod, setPaymentMethod] = useState("Cash");
	const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
	const [editSale, setEditSale] = useState<POSSale | null>(null);
	const [editItems, setEditItems] = useState<EditSaleItem[]>([]);
	const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
	const [viewSale, setViewSale] = useState<POSSale | null>(null);

	// Product search state
	const [productSearch, setProductSearch] = useState("");
	const [showProductDropdown, setShowProductDropdown] = useState(false);
	const [products, setProducts] = useState<Product[]>([]);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Manual item state
	const [showManualAdd, setShowManualAdd] = useState(false);
	const [manualName, setManualName] = useState("");
	const [manualPrice, setManualPrice] = useState("");

	// Sales history filter
	const [historySearch, setHistorySearch] = useState("");
	const [historyDateFilter, setHistoryDateFilter] = useState<"all" | "today" | "week" | "month">("all");

	const profile = getUserProfile();
	const currencySymbol = getCurrencySymbol(profile.currency);
	const taxRate = profile.taxEnabled ? profile.taxRate : 0;

	useEffect(() => {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) {
			navigate({ to: "/login" });
			return;
		}
		const user = localStorage.getItem("billingo_user");
		if (user) {
			try { setUserName(JSON.parse(user).fullName || "User"); } catch { /* ignore */ }
		}
		setRecentSales(getSales().reverse());
		setProducts(getProducts());
	}, [navigate]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
				searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
				setShowProductDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	// Filter products for search
	const filteredProducts = useMemo(() => {
		const term = productSearch.toLowerCase().trim();
		if (!term) return products.filter(p => p.type === "Product");
		return products.filter(p =>
			p.type === "Product" && (
				p.name.toLowerCase().includes(term) ||
				p.sku.toLowerCase().includes(term) ||
				p.description.toLowerCase().includes(term) ||
				p.category.toLowerCase().includes(term)
			)
		);
	}, [products, productSearch]);

	// Available (in-stock) vs out-of-stock split
	const inStockProducts = useMemo(() =>
		filteredProducts.filter(p => !p.inventoryEnabled || p.stockQuantity > 0),
		[filteredProducts]
	);
	const outOfStockProducts = useMemo(() =>
		filteredProducts.filter(p => p.inventoryEnabled && p.stockQuantity === 0),
		[filteredProducts]
	);

	function addProductToCart(product: Product) {
		setCart((prev) => {
			const existing = prev.find(item => item.productId === product.id);
			if (existing) {
				// Check stock limits
				if (product.inventoryEnabled && existing.quantity >= product.stockQuantity) return prev;
				return prev.map(item =>
					item.productId === product.id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				);
			}
			return [
				...prev,
				{
					id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
					name: product.name,
					price: product.basePrice,
					quantity: 1,
					productId: product.id,
					maxStock: product.inventoryEnabled ? product.stockQuantity : undefined,
					inventoryEnabled: product.inventoryEnabled,
				},
			];
		});
		setProductSearch("");
		setShowProductDropdown(false);
	}

	const addManualItem = useCallback(() => {
		if (!manualName.trim() || !manualPrice.trim()) return;
		const price = parseFloat(manualPrice);
		if (isNaN(price) || price <= 0) return;

		setCart((prev) => {
			const existing = prev.find(item => !item.productId && item.name.toLowerCase() === manualName.trim().toLowerCase());
			if (existing) {
				return prev.map(item =>
					item.id === existing.id
						? { ...item, quantity: item.quantity + 1 }
						: item,
				);
			}
			return [
				...prev,
				{
					id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
					name: manualName.trim(),
					price,
					quantity: 1,
				},
			];
		});
		setManualName("");
		setManualPrice("");
		setShowManualAdd(false);
	}, [manualName, manualPrice]);

	function updateQuantity(id: string, delta: number) {
		setCart((prev) =>
			prev
				.map((item) => {
					if (item.id !== id) return item;
					const newQty = Math.max(0, item.quantity + delta);
					// Enforce stock limit
					if (delta > 0 && item.inventoryEnabled && item.maxStock !== undefined && newQty > item.maxStock) {
						return item;
					}
					return { ...item, quantity: newQty };
				})
				.filter((item) => item.quantity > 0),
		);
	}

	function removeFromCart(id: string) {
		setCart((prev) => prev.filter((item) => item.id !== id));
	}

	const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const taxAmount = subtotal * (taxRate / 100);
	const grandTotal = subtotal + taxAmount;

	function completeSale() {
		if (cart.length === 0) return;

		const sale: POSSale = {
			id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			receiptNumber: getNextReceiptNumber(),
			items: [...cart],
			subtotal,
			taxAmount,
			grandTotal,
			paymentMethod,
			date: new Date().toISOString(),
		};

		// Reduce stock for inventory-tracked items
		for (const item of cart) {
			if (item.productId && item.inventoryEnabled) {
				reduceStock(item.productId, item.quantity);
			}
		}

		const existing = getSales();
		existing.push(sale);
		saveSales(existing);

		logActivity("pos_sale_completed", `POS Sale ${sale.receiptNumber} completed for ${currencySymbol}${sale.grandTotal.toFixed(2)}`);

		setLastReceipt(sale);
		setSaleComplete(true);
		setCart([]);
		setRecentSales(getSales().reverse());
		// Refresh products to reflect stock changes
		setProducts(getProducts());
	}

	function handleDeleteSale(id: string) {
		const sale = getSales().find(s => s.id === id);
		const all = getSales().filter((s) => s.id !== id);
		saveSales(all);
		setRecentSales(all.reverse());
		setDeleteDialogId(null);
		if (sale) {
			logActivity("pos_sale_deleted", `POS Sale ${sale.receiptNumber} deleted`);
		}
	}

	function handleStartEditSale(sale: POSSale) {
		setEditSale(sale);
		setEditItems(
			sale.items.map((it) => ({
				id: it.id,
				name: it.name,
				price: String(it.price),
				quantity: String(it.quantity),
			})),
		);
	}

	const editLineTotal = (item: EditSaleItem) => {
		const q = parseFloat(item.quantity) || 0;
		const p = parseFloat(item.price) || 0;
		return q * p;
	};

	const editSubtotal = editItems.reduce((sum, it) => sum + editLineTotal(it), 0);
	const editTaxAmount = editSubtotal * (taxRate / 100);
	const editGrandTotal = editSubtotal + editTaxAmount;

	function handleSaveEditSale() {
		if (!editSale) return;
		const validItems = editItems.filter(
			(it) => it.name.trim() && parseFloat(it.price) > 0 && parseFloat(it.quantity) > 0,
		);
		if (validItems.length === 0) return;

		const all = getSales();
		const idx = all.findIndex((s) => s.id === editSale.id);
		if (idx === -1) return;

		all[idx] = {
			...all[idx],
			items: validItems.map((it) => ({
				id: it.id,
				name: it.name.trim(),
				price: parseFloat(it.price) || 0,
				quantity: parseFloat(it.quantity) || 1,
			})),
			subtotal: editSubtotal,
			taxAmount: editTaxAmount,
			grandTotal: editGrandTotal,
		};

		saveSales(all);
		setRecentSales(all.reverse());
		setEditSale(null);
		logActivity("pos_sale_edited", `POS Sale ${all[idx].receiptNumber} edited`);
	}

	function handlePrintReceipt(sale: POSSale) {
		const onboardingRaw = localStorage.getItem("billingo_onboarding");
		let bName = "Billingo";
		if (onboardingRaw) {
			try { bName = JSON.parse(onboardingRaw).businessName || bName; } catch { /* ignore */ }
		}

		const printWin = window.open("", "_blank");
		if (!printWin) return;

		const itemsHtml = sale.items.map((item) =>
			`<tr>
				<td style="padding:4px 0;border-bottom:1px dashed #e2e8f0;">${item.name}</td>
				<td style="padding:4px 8px;border-bottom:1px dashed #e2e8f0;text-align:center;">${item.quantity}</td>
				<td style="padding:4px 0;border-bottom:1px dashed #e2e8f0;text-align:right;">${currencySymbol}${(item.price * item.quantity).toFixed(2)}</td>
			</tr>`
		).join("");

		printWin.document.write(`<!DOCTYPE html><html><head><title>Receipt ${sale.receiptNumber}</title>
		<style>body{font-family:'Courier New',monospace;margin:20px;color:#1e293b;max-width:300px;margin:20px auto}
		.header{text-align:center;margin-bottom:20px;padding-bottom:10px;border-bottom:2px dashed #e2e8f0}
		.logo{font-size:20px;font-weight:bold}
		table{width:100%;border-collapse:collapse;margin:10px 0}
		th{font-size:11px;text-transform:uppercase;color:#64748b;padding:4px 0;text-align:left}
		.totals{border-top:2px dashed #e2e8f0;padding-top:10px;margin-top:10px}
		.total-row{display:flex;justify-content:space-between;padding:2px 0;font-size:13px}
		.grand{font-size:16px;font-weight:bold;border-top:1px solid #1e293b;padding-top:6px;margin-top:6px}
		.footer{text-align:center;margin-top:20px;font-size:11px;color:#64748b}
		@media print{body{margin:10px auto}}</style></head><body>
		<div class="header"><div class="logo">${bName}</div>
		<p style="font-size:12px;color:#64748b;margin:4px 0">POS Receipt</p>
		<p style="font-size:12px;margin:2px 0">${sale.receiptNumber}</p>
		<p style="font-size:11px;color:#64748b;margin:2px 0">${new Date(sale.date).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</p></div>
		<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
		<tbody>${itemsHtml}</tbody></table>
		<div class="totals"><div class="total-row"><span>Subtotal:</span><span>${currencySymbol}${sale.subtotal.toFixed(2)}</span></div>
		${sale.taxAmount > 0 ? `<div class="total-row"><span>Tax:</span><span>${currencySymbol}${sale.taxAmount.toFixed(2)}</span></div>` : ""}
		<div class="total-row grand"><span>TOTAL:</span><span>${currencySymbol}${sale.grandTotal.toFixed(2)}</span></div>
		<div class="total-row" style="margin-top:8px"><span>Payment:</span><span>${sale.paymentMethod}</span></div></div>
		<div class="footer"><p>Thank you for your purchase!</p></div>
		<script>setTimeout(function(){window.print();},300);<\/script></body></html>`);
		printWin.document.close();
	}

	function resetSale() {
		setSaleComplete(false);
		setLastReceipt(null);
	}

	// Sales history filtering
	const filteredSales = useMemo(() => {
		let sales = [...recentSales];

		// Date filter
		const now = new Date();
		if (historyDateFilter === "today") {
			const todayStr = now.toISOString().split("T")[0];
			sales = sales.filter(s => s.date.startsWith(todayStr));
		} else if (historyDateFilter === "week") {
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			sales = sales.filter(s => new Date(s.date) >= weekAgo);
		} else if (historyDateFilter === "month") {
			const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			sales = sales.filter(s => new Date(s.date) >= monthAgo);
		}

		// Text search
		if (historySearch.trim()) {
			const term = historySearch.toLowerCase().trim();
			sales = sales.filter(s =>
				s.receiptNumber.toLowerCase().includes(term) ||
				s.items.some(i => i.name.toLowerCase().includes(term)) ||
				s.paymentMethod.toLowerCase().includes(term)
			);
		}

		return sales;
	}, [recentSales, historyDateFilter, historySearch]);

	// Sales summary stats
	const salesStats = useMemo(() => {
		const allSales = recentSales;
		const today = new Date().toISOString().split("T")[0];
		const todaySales = allSales.filter(s => s.date.startsWith(today));
		return {
			totalSales: allSales.length,
			totalRevenue: allSales.reduce((sum, s) => sum + s.grandTotal, 0),
			todaySales: todaySales.length,
			todayRevenue: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
		};
	}, [recentSales]);

	const deleteSaleName = deleteDialogId
		? recentSales.find((s) => s.id === deleteDialogId)?.receiptNumber || ""
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
							<span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">Point of Sale</span>
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
				<div className="flex items-center justify-between mb-6 animate-fade-in-up">
					<div className="flex items-center gap-3">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<ShoppingCart className="w-7 h-7 text-indigo-600" />
								Point of Sale
							</h1>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quick sales with inventory tracking.</p>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="flex gap-1 mb-6 bg-slate-100/80 dark:bg-slate-700 p-1 rounded-xl w-fit animate-fade-in-up">
					<button
						onClick={() => setActiveTab("pos")}
						className={cn(
							"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
							activeTab === "pos"
								? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
								: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
						)}
					>
						<LayoutGrid className="w-4 h-4" />
						New Sale
					</button>
					<button
						onClick={() => setActiveTab("history")}
						className={cn(
							"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
							activeTab === "history"
								? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
								: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
						)}
					>
						<History className="w-4 h-4" />
						Sales History
						{recentSales.length > 0 && (
							<span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">{recentSales.length}</span>
						)}
					</button>
				</div>

				{/* ============ POS TAB ============ */}
				{activeTab === "pos" && (
					<>
						{saleComplete && lastReceipt ? (
							<Card className="border-emerald-200 animate-scale-in max-w-lg mx-auto">
								<CardContent className="p-8 text-center">
									<div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
										<CheckCircle2 className="w-8 h-8 text-emerald-600" />
									</div>
									<h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Sale Complete!</h2>
									<p className="text-slate-500 dark:text-slate-400 mb-1">{lastReceipt.receiptNumber}</p>
									<p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent mb-6">
										{currencySymbol}{lastReceipt.grandTotal.toFixed(2)}
									</p>
									<div className="flex justify-center gap-3">
										<Button variant="outline" onClick={() => handlePrintReceipt(lastReceipt)} className="rounded-xl">
											<Printer className="w-4 h-4 mr-2" />Print Receipt
										</Button>
										<Button onClick={resetSale} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
											<Plus className="w-4 h-4 mr-2" />New Sale
										</Button>
									</div>
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Left Panel: Product Search & Cart */}
								<div className="lg:col-span-2 space-y-6">
									{/* Inventory Search */}
									<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up">
										<CardContent className="p-6">
											<div className="flex items-center justify-between mb-4">
												<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
													<Package className="w-4 h-4 text-indigo-600" />
													Select from Inventory
												</h3>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setShowManualAdd(!showManualAdd)}
													className="rounded-lg text-xs border-slate-200 dark:border-slate-600"
												>
													<Plus className="w-3 h-3 mr-1" />
													Manual Item
												</Button>
											</div>

											{/* Product Search */}
											<div className="relative">
												<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
												<Input
													ref={searchInputRef}
													placeholder="Search products by name, SKU, or category..."
													value={productSearch}
													onChange={(e) => {
														setProductSearch(e.target.value);
														setShowProductDropdown(true);
													}}
													onFocus={() => setShowProductDropdown(true)}
													className="h-11 pl-10 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
												/>
												{productSearch && (
													<button
														onClick={() => { setProductSearch(""); setShowProductDropdown(false); }}
														className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600"
													>
														<X className="w-4 h-4" />
													</button>
												)}

												{/* Product Dropdown */}
												{showProductDropdown && (
													<div ref={dropdownRef} className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto">
														{inStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
															<div className="p-6 text-center">
																<Package className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
																<p className="text-sm text-slate-500 dark:text-slate-400">
																	{products.length === 0
																		? "No products in inventory. Add products in the Products page."
																		: "No products match your search."}
																</p>
															</div>
														) : (
															<>
																{inStockProducts.length > 0 && (
																	<div>
																		<div className="px-3 py-2 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50/60 dark:bg-emerald-900/20 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
																			<PackageCheck className="w-3 h-3" />
																			Available ({inStockProducts.length})
																		</div>
																		{inStockProducts.map((product) => (
																			<button
																				key={product.id}
																				onClick={() => addProductToCart(product)}
																				className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-center justify-between group"
																			>
																				<div className="flex-1 min-w-0">
																					<div className="flex items-center gap-2">
																						<p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
																						<span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono shrink-0">{product.sku}</span>
																					</div>
																					<div className="flex items-center gap-2 mt-0.5">
																						{product.category && (
																							<span className="text-[10px] text-slate-400 dark:text-slate-500">{product.category}</span>
																						)}
																						{product.inventoryEnabled && (
																							<span className={cn(
																								"text-[10px] font-medium px-1.5 py-0.5 rounded-full",
																								product.stockQuantity <= 5
																									? "bg-amber-50 dark:bg-amber-900/20 text-amber-600"
																									: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600",
																							)}>
																								{product.stockQuantity} in stock
																							</span>
																						)}
																					</div>
																				</div>
																				<div className="flex items-center gap-2">
																					<span className="text-sm font-semibold text-slate-900 dark:text-white">
																						{currencySymbol}{product.basePrice.toFixed(2)}
																					</span>
																					<Plus className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
																				</div>
																			</button>
																		))}
																	</div>
																)}
																{outOfStockProducts.length > 0 && (
																	<div>
																		<div className="px-3 py-2 text-[10px] font-semibold text-red-500 uppercase tracking-wider bg-red-50/60 dark:bg-red-900/20 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1">
																			<AlertTriangle className="w-3 h-3" />
																			Out of Stock ({outOfStockProducts.length})
																		</div>
																		{outOfStockProducts.map((product) => (
																			<div
																				key={product.id}
																				className="w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-center justify-between opacity-50 cursor-not-allowed"
																			>
																				<div className="flex-1 min-w-0">
																					<div className="flex items-center gap-2">
																						<p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{product.name}</p>
																						<span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-mono shrink-0">{product.sku}</span>
																					</div>
																					<span className="text-[10px] text-red-400 font-medium">Out of stock</span>
																				</div>
																				<span className="text-sm text-slate-400 dark:text-slate-500">
																					{currencySymbol}{product.basePrice.toFixed(2)}
																				</span>
																			</div>
																		))}
																	</div>
																)}
															</>
														)}
													</div>
												)}
											</div>

											{/* Manual Add */}
											{showManualAdd && (
												<div className="mt-4 p-4 bg-slate-50/80 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
													<p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Add custom item not in inventory</p>
													<div className="flex flex-col sm:flex-row gap-3">
														<Input
															placeholder="Item name"
															value={manualName}
															onChange={(e) => setManualName(e.target.value)}
															onKeyDown={(e) => e.key === "Enter" && addManualItem()}
															className="h-10 flex-1 rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-sm"
														/>
														<Input
															type="number"
															min="0"
															step="0.01"
															placeholder={`Price (${currencySymbol})`}
															value={manualPrice}
															onChange={(e) => setManualPrice(e.target.value)}
															onKeyDown={(e) => e.key === "Enter" && addManualItem()}
															className="h-10 w-full sm:w-32 rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-sm"
														/>
														<div className="flex gap-2">
															<Button
																onClick={addManualItem}
																disabled={!manualName.trim() || !manualPrice.trim()}
																size="sm"
																className="h-10 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
															>
																<Plus className="w-4 h-4 mr-1" />Add
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setShowManualAdd(false)}
																className="h-10 rounded-lg text-slate-500"
															>
																<X className="w-4 h-4" />
															</Button>
														</div>
													</div>
												</div>
											)}
										</CardContent>
									</Card>

									{/* Cart */}
									<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-100">
										<CardContent className="p-6">
											<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
												<ShoppingCart className="w-4 h-4 text-indigo-600" />
												Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
											</h3>

											{cart.length === 0 ? (
												<div className="text-center py-8">
													<ShoppingCart className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
													<p className="text-sm text-slate-500 dark:text-slate-400">Cart is empty. Search products above to add items.</p>
												</div>
											) : (
												<div className="space-y-3">
													{cart.map((item) => (
														<div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 group">
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2">
																	<p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
																	{item.productId && (
																		<span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 font-medium shrink-0">Inventory</span>
																	)}
																</div>
																<div className="flex items-center gap-2 mt-0.5">
																	<p className="text-xs text-slate-500 dark:text-slate-400">{currencySymbol}{item.price.toFixed(2)} each</p>
																	{item.inventoryEnabled && item.maxStock !== undefined && (
																		<span className={cn(
																			"text-[10px] font-medium",
																			item.quantity >= item.maxStock ? "text-red-500" : "text-slate-400 dark:text-slate-500",
																		)}>
																			(max: {item.maxStock})
																		</span>
																	)}
																</div>
															</div>
															<div className="flex items-center gap-2">
																<Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, -1)}>
																	<Minus className="w-3 h-3" />
																</Button>
																<span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
																<Button
																	variant="outline"
																	size="icon"
																	className="h-7 w-7 rounded-lg"
																	onClick={() => updateQuantity(item.id, 1)}
																	disabled={item.inventoryEnabled && item.maxStock !== undefined && item.quantity >= item.maxStock}
																>
																	<Plus className="w-3 h-3" />
																</Button>
																<span className="text-sm font-semibold text-slate-900 dark:text-white w-20 text-right">
																	{currencySymbol}{(item.price * item.quantity).toFixed(2)}
																</span>
																<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
																	onClick={() => removeFromCart(item.id)}>
																	<Trash2 className="w-3.5 h-3.5" />
																</Button>
															</div>
														</div>
													))}
												</div>
											)}
										</CardContent>
									</Card>
								</div>

								{/* Right Panel: Order Summary */}
								<div className="space-y-6">
									<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-200 sticky top-24">
										<CardContent className="p-6">
											<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
												<Receipt className="w-4 h-4 text-indigo-600" />Order Summary
											</h3>

											<div className="space-y-3 mb-6">
												<div className="flex justify-between text-sm">
													<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
													<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{subtotal.toFixed(2)}</span>
												</div>
												{taxRate > 0 && (
													<div className="flex justify-between text-sm">
														<span className="text-slate-500 dark:text-slate-400">Tax ({taxRate}%)</span>
														<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{taxAmount.toFixed(2)}</span>
													</div>
												)}
												<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between">
													<span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
													<span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
														{currencySymbol}{grandTotal.toFixed(2)}
													</span>
												</div>
											</div>

											{/* Payment Method */}
											<div className="mb-6">
												<Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Payment Method</Label>
												<div className="grid grid-cols-3 gap-2">
													{[
														{ label: "Cash", icon: Banknote },
														{ label: "Card", icon: CreditCard },
														{ label: "Other", icon: Wallet },
													].map(({ label, icon: Icon }) => (
														<Button
															key={label}
															variant="outline"
															size="sm"
															onClick={() => setPaymentMethod(label)}
															className={cn(
																"rounded-lg transition-all flex flex-col items-center gap-1 h-auto py-2.5",
																paymentMethod === label
																	? "bg-indigo-50 border-indigo-300 text-indigo-700"
																	: "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400",
															)}
														>
															<Icon className="w-4 h-4" />
															<span className="text-xs">{label}</span>
														</Button>
													))}
												</div>
											</div>

											<Button
												onClick={completeSale}
												disabled={cart.length === 0}
												className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:opacity-90"
											>
												<CheckCircle2 className="w-4 h-4 mr-2" />
												Complete Sale
											</Button>
										</CardContent>
									</Card>

									{/* Quick Stats */}
									<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-300">
										<CardContent className="p-4">
											<h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Today&apos;s Summary</h3>
											<div className="grid grid-cols-2 gap-3">
												<div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20">
													<p className="text-xs text-emerald-600 font-medium">Sales</p>
													<p className="text-lg font-bold text-emerald-700">{salesStats.todaySales}</p>
												</div>
												<div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20">
													<p className="text-xs text-indigo-600 font-medium">Revenue</p>
													<p className="text-lg font-bold text-indigo-700">{currencySymbol}{salesStats.todayRevenue.toFixed(2)}</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						)}
					</>
				)}

				{/* ============ SALES HISTORY TAB ============ */}
				{activeTab === "history" && (
					<div className="space-y-6 animate-fade-in-up">
						{/* Sales Stats Cards */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
											<DollarSign className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-slate-500 dark:text-slate-400">Total Revenue</p>
											<p className="text-lg font-bold text-slate-900 dark:text-white">{currencySymbol}{salesStats.totalRevenue.toFixed(2)}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
											<Receipt className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-slate-500 dark:text-slate-400">Total Sales</p>
											<p className="text-lg font-bold text-slate-900 dark:text-white">{salesStats.totalSales}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
											<TrendingUp className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s Revenue</p>
											<p className="text-lg font-bold text-slate-900 dark:text-white">{currencySymbol}{salesStats.todayRevenue.toFixed(2)}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
											<Clock className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s Sales</p>
											<p className="text-lg font-bold text-slate-900 dark:text-white">{salesStats.todaySales}</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Filters */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-4">
								<div className="flex flex-col sm:flex-row gap-3">
									<div className="relative flex-1">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
										<Input
											placeholder="Search by receipt number, item, or payment method..."
											value={historySearch}
											onChange={(e) => setHistorySearch(e.target.value)}
											className="h-10 pl-10 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600"
										/>
									</div>
									<div className="flex gap-1 bg-slate-100/80 dark:bg-slate-700 p-1 rounded-lg">
										{(["all", "today", "week", "month"] as const).map((period) => (
											<button
												key={period}
												onClick={() => setHistoryDateFilter(period)}
												className={cn(
													"px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
													historyDateFilter === period
														? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
														: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
												)}
											>
												{period}
											</button>
										))}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Sales Table */}
						{filteredSales.length === 0 ? (
							<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-12 text-center">
									<Receipt className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
									<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No Sales Found</h3>
									<p className="text-sm text-slate-500 dark:text-slate-400">
										{recentSales.length === 0
											? "Complete your first sale to see it here."
											: "No sales match your current filters."}
									</p>
								</CardContent>
							</Card>
						) : (
							<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-0">
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead>
												<tr className="border-b border-slate-100 dark:border-slate-700">
													<th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Receipt</th>
													<th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Date & Time</th>
													<th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Items</th>
													<th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Payment</th>
													<th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Total</th>
													<th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-5 py-3">Actions</th>
												</tr>
											</thead>
											<tbody>
												{filteredSales.map((sale) => (
													<tr key={sale.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
														<td className="px-5 py-3">
															<span className="text-sm font-semibold text-indigo-600">{sale.receiptNumber}</span>
														</td>
														<td className="px-5 py-3">
															<p className="text-sm text-slate-900 dark:text-white">
																{new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
															</p>
															<p className="text-xs text-slate-400 dark:text-slate-500">
																{new Date(sale.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
															</p>
														</td>
														<td className="px-5 py-3">
															<p className="text-sm text-slate-700 dark:text-slate-300">
																{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
															</p>
															<p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
																{sale.items.map(i => i.name).join(", ")}
															</p>
														</td>
														<td className="px-5 py-3">
															<span className={cn(
																"text-xs font-medium px-2 py-1 rounded-full",
																sale.paymentMethod === "Cash" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" :
																sale.paymentMethod === "Card" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" :
																"bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
															)}>
																{sale.paymentMethod}
															</span>
														</td>
														<td className="px-5 py-3 text-right">
															<span className="text-sm font-bold text-slate-900 dark:text-white">{currencySymbol}{sale.grandTotal.toFixed(2)}</span>
														</td>
														<td className="px-5 py-3 text-right">
															<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewSale(sale)}>
																	<Eye className="w-3.5 h-3.5 text-slate-400" />
																</Button>
																<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintReceipt(sale)}>
																	<Printer className="w-3.5 h-3.5 text-slate-400" />
																</Button>
																<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEditSale(sale)}>
																	<Pencil className="w-3.5 h-3.5 text-indigo-500" />
																</Button>
																<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialogId(sale.id)}>
																	<Trash2 className="w-3.5 h-3.5 text-red-400" />
																</Button>
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				)}
			</main>

			{/* View Sale Detail Dialog */}
			<Dialog open={viewSale !== null} onOpenChange={(open) => { if (!open) setViewSale(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Receipt className="w-5 h-5 text-indigo-600" />
							{viewSale?.receiptNumber}
						</DialogTitle>
						<DialogDescription>
							{viewSale && new Date(viewSale.date).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
						</DialogDescription>
					</DialogHeader>
					{viewSale && (
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								{viewSale.items.map((item) => (
									<div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/80 dark:bg-slate-700/50">
										<div>
											<p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
											<p className="text-xs text-slate-400 dark:text-slate-500">{currencySymbol}{item.price.toFixed(2)} x {item.quantity}</p>
										</div>
										<span className="text-sm font-semibold text-slate-900 dark:text-white">
											{currencySymbol}{(item.price * item.quantity).toFixed(2)}
										</span>
									</div>
								))}
							</div>
							<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
									<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{viewSale.subtotal.toFixed(2)}</span>
								</div>
								{viewSale.taxAmount > 0 && (
									<div className="flex justify-between text-sm">
										<span className="text-slate-500 dark:text-slate-400">Tax</span>
										<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{viewSale.taxAmount.toFixed(2)}</span>
									</div>
								)}
								<div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
									<span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
									<span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
										{currencySymbol}{viewSale.grandTotal.toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between text-sm pt-1">
									<span className="text-slate-500 dark:text-slate-400">Payment</span>
									<span className={cn(
										"text-xs font-medium px-2 py-0.5 rounded-full",
										viewSale.paymentMethod === "Cash" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" :
										viewSale.paymentMethod === "Card" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700" :
										"bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
									)}>
										{viewSale.paymentMethod}
									</span>
								</div>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => { if (viewSale) handlePrintReceipt(viewSale); }} className="rounded-xl">
							<Printer className="w-4 h-4 mr-1" />Print
						</Button>
						<Button onClick={() => setViewSale(null)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Sale Confirmation Dialog */}
			<Dialog open={deleteDialogId !== null} onOpenChange={(open) => { if (!open) setDeleteDialogId(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600">
							<Trash2 className="w-5 h-5" />
							Delete Sale
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete sale <span className="font-semibold text-slate-900 dark:text-white">{deleteSaleName}</span>? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setDeleteDialogId(null)} className="rounded-xl">
							Cancel
						</Button>
						<Button
							onClick={() => deleteDialogId && handleDeleteSale(deleteDialogId)}
							className="rounded-xl bg-red-600 text-white hover:bg-red-700"
						>
							<Trash2 className="w-4 h-4 mr-1" />
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Sale Dialog */}
			<Dialog open={editSale !== null} onOpenChange={(open) => { if (!open) setEditSale(null); }}>
				<DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Pencil className="w-5 h-5 text-indigo-600" />
							Edit Sale {editSale?.receiptNumber}
						</DialogTitle>
						<DialogDescription>
							Update sale items below.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-semibold text-slate-900 dark:text-white">Items</Label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setEditItems((prev) => [...prev, { id: String(Date.now()), name: "", price: "", quantity: "1" }])}
								className="rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs"
							>
								<Plus className="w-3 h-3 mr-1" />Add
							</Button>
						</div>
						<div className="space-y-2">
							{editItems.map((item) => (
								<div key={item.id} className="grid grid-cols-[1fr_70px_90px_70px_32px] gap-2 items-center group">
									<Input
										placeholder="Item name"
										value={item.name}
										onChange={(e) => setEditItems((prev) => prev.map((it) => it.id === item.id ? { ...it, name: e.target.value } : it))}
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
										className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={() => setEditItems((prev) => prev.length > 1 ? prev.filter((it) => it.id !== item.id) : prev)}
										disabled={editItems.length === 1}
									>
										<Trash2 className="w-3 h-3" />
									</Button>
								</div>
							))}
						</div>
						<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-slate-500 dark:text-slate-400">Subtotal</span>
								<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{editSubtotal.toFixed(2)}</span>
							</div>
							{taxRate > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-slate-500 dark:text-slate-400">Tax ({taxRate}%)</span>
									<span className="font-medium text-slate-900 dark:text-white">{currencySymbol}{editTaxAmount.toFixed(2)}</span>
								</div>
							)}
							<div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
								<span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
								<span className="text-base font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
									{currencySymbol}{editGrandTotal.toFixed(2)}
								</span>
							</div>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setEditSale(null)} className="rounded-xl">
							Cancel
						</Button>
						<Button
							onClick={handleSaveEditSale}
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
