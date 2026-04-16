import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	Zap,
	LogOut,
	Plus,
	Pencil,
	Trash2,
	Package,
	Wrench,
	Search,
	Upload,
	Download,
	BarChart3,
	AlertTriangle,
	PackageX,
	Archive,
	Tag,
	TrendingUp,
	FolderOpen,
	ArrowLeft,
} from "lucide-react";
import {
	type Product,
	type Category,
	type ProductType,
	getProducts,
	saveProduct,
	updateProduct,
	deleteProduct,
	getCategories,
	saveCategory,
	updateCategory,
	deleteCategory,
	getInventorySummary,
	getProductAnalytics,
	exportProductsCSV,
	importProductsCSV,
} from "@/lib/product-store";
import { getUserProfile } from "@/lib/billing-store";

export const Route = createFileRoute("/products")({
	component: ProductsPage,
});

type TabValue = "all" | "products" | "services" | "categories" | "analytics";

const emptyProductForm = {
	name: "",
	description: "",
	category: "",
	type: "Product" as ProductType,
	basePrice: "",
	currency: "USD",
	taxRate: "",
	inventoryEnabled: false,
	stockQuantity: "",
};

const emptyCategoryForm = {
	name: "",
	description: "",
};

function ProductsPage() {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<TabValue>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [filterCategory, setFilterCategory] = useState("all");
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [showProductDialog, setShowProductDialog] = useState(false);
	const [showCategoryDialog, setShowCategoryDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showDeleteCatDialog, setShowDeleteCatDialog] = useState(false);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
	const [productForm, setProductForm] = useState(emptyProductForm);
	const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
	const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const profile = getUserProfile();

	const reload = useCallback(() => {
		setProducts(getProducts());
		setCategories(getCategories());
	}, []);

	useEffect(() => {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) {
			navigate({ to: "/login" });
			return;
		}
		reload();
	}, [navigate, reload]);

	// ── Filtering ──

	const filteredProducts = products.filter((p) => {
		if (activeTab === "products" && p.type !== "Product") return false;
		if (activeTab === "services" && p.type !== "Service") return false;
		if (filterCategory !== "all" && p.category !== filterCategory) return false;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			return (
				p.name.toLowerCase().includes(q) ||
				p.sku.toLowerCase().includes(q) ||
				p.description.toLowerCase().includes(q)
			);
		}
		return true;
	});

	const productCount = products.filter((p) => p.type === "Product").length;
	const serviceCount = products.filter((p) => p.type === "Service").length;
	const inventory = getInventorySummary();

	// ── Product CRUD ──

	function openAddProduct() {
		setEditingProduct(null);
		setProductForm(emptyProductForm);
		setShowProductDialog(true);
	}

	function openEditProduct(product: Product) {
		setEditingProduct(product);
		setProductForm({
			name: product.name,
			description: product.description,
			category: product.category,
			type: product.type,
			basePrice: String(product.basePrice),
			currency: product.currency,
			taxRate: String(product.taxRate),
			inventoryEnabled: product.inventoryEnabled,
			stockQuantity: String(product.stockQuantity),
		});
		setShowProductDialog(true);
	}

	function handleSaveProduct() {
		if (!productForm.name.trim()) return;
		const data = {
			name: productForm.name.trim(),
			description: productForm.description.trim(),
			category: productForm.category || "General",
			type: productForm.type,
			basePrice: parseFloat(productForm.basePrice) || 0,
			currency: productForm.currency,
			taxRate: parseFloat(productForm.taxRate) || 0,
			inventoryEnabled: productForm.inventoryEnabled,
			stockQuantity: productForm.inventoryEnabled ? (parseInt(productForm.stockQuantity) || 0) : 0,
		};

		if (editingProduct) {
			updateProduct(editingProduct.id, data);
		} else {
			saveProduct(data);
		}
		setShowProductDialog(false);
		reload();
	}

	function handleDeleteProduct() {
		if (deletingProduct) {
			deleteProduct(deletingProduct.id);
			setDeletingProduct(null);
			setShowDeleteDialog(false);
			reload();
		}
	}

	// ── Category CRUD ──

	function openAddCategory() {
		setEditingCategory(null);
		setCategoryForm(emptyCategoryForm);
		setShowCategoryDialog(true);
	}

	function openEditCategory(cat: Category) {
		setEditingCategory(cat);
		setCategoryForm({ name: cat.name, description: cat.description });
		setShowCategoryDialog(true);
	}

	function handleSaveCategory() {
		if (!categoryForm.name.trim()) return;
		if (editingCategory) {
			updateCategory(editingCategory.id, {
				name: categoryForm.name.trim(),
				description: categoryForm.description.trim(),
			});
		} else {
			saveCategory({
				name: categoryForm.name.trim(),
				description: categoryForm.description.trim(),
			});
		}
		setShowCategoryDialog(false);
		reload();
	}

	function handleDeleteCategory() {
		if (deletingCategory) {
			deleteCategory(deletingCategory.id);
			setDeletingCategory(null);
			setShowDeleteCatDialog(false);
			reload();
		}
	}

	// ── Import / Export ──

	function handleExport() {
		const csv = exportProductsCSV();
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `billingo-products-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const content = evt.target?.result as string;
			const result = importProductsCSV(content);
			setImportResult(result);
			reload();
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	// ── Analytics ──

	const analytics = getProductAnalytics();

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
								Products & Services
							</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">{profile.name}</span>
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
								{profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
							</div>
							<Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 dark:text-slate-400 hover:text-red-600">
								<LogOut className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page Title */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
							<Package className="w-7 h-7 text-indigo-600" />
							Products & Services
						</h1>
						<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
							Manage your product catalog, services, and inventory.
						</p>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400" onClick={() => { setShowImportDialog(true); setImportResult(null); }}>
							<Upload className="w-3.5 h-3.5 mr-1.5" />
							Import
						</Button>
						<Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400" onClick={handleExport}>
							<Download className="w-3.5 h-3.5 mr-1.5" />
							Export
						</Button>
						<Button size="sm" className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity" onClick={openAddProduct}>
							<Plus className="w-3.5 h-3.5 mr-1.5" />
							Add Product
						</Button>
					</div>
				</div>

				{/* Inventory Summary Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up animation-delay-100">
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
						<CardContent className="p-5">
							<div className="flex items-start justify-between mb-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
									<Package className="w-5 h-5 text-white" />
								</div>
							</div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white">{products.length}</p>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Items</p>
						</CardContent>
					</Card>
					<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
						<CardContent className="p-5">
							<div className="flex items-start justify-between mb-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
									<Archive className="w-5 h-5 text-white" />
								</div>
							</div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white">{inventory.totalProducts}</p>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tracked Inventory</p>
						</CardContent>
					</Card>
					<Card className={cn("border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300", inventory.lowStockItems > 0 && "border-amber-200")}>
						<CardContent className="p-5">
							<div className="flex items-start justify-between mb-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
									<AlertTriangle className="w-5 h-5 text-white" />
								</div>
							</div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white">{inventory.lowStockItems}</p>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Low Stock</p>
						</CardContent>
					</Card>
					<Card className={cn("border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300", inventory.outOfStockItems > 0 && "border-red-200")}>
						<CardContent className="p-5">
							<div className="flex items-start justify-between mb-3">
								<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
									<PackageX className="w-5 h-5 text-white" />
								</div>
							</div>
							<p className="text-2xl font-bold text-slate-900 dark:text-white">{inventory.outOfStockItems}</p>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Out of Stock</p>
						</CardContent>
					</Card>
				</div>

				{/* Tabs */}
				<div className="mb-6 animate-fade-in-up animation-delay-200">
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
						<TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-1 h-auto flex-wrap">
							<TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-4 py-2 text-sm">
								All <Badge variant="secondary" className="ml-1.5 text-xs">{products.length}</Badge>
							</TabsTrigger>
							<TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-4 py-2 text-sm">
								Products <Badge variant="secondary" className="ml-1.5 text-xs">{productCount}</Badge>
							</TabsTrigger>
							<TabsTrigger value="services" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-4 py-2 text-sm">
								Services <Badge variant="secondary" className="ml-1.5 text-xs">{serviceCount}</Badge>
							</TabsTrigger>
							<TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-4 py-2 text-sm">
								Categories <Badge variant="secondary" className="ml-1.5 text-xs">{categories.length}</Badge>
							</TabsTrigger>
							<TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-4 py-2 text-sm">
								Analytics
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Search & Filter (not on categories/analytics tab) */}
				{(activeTab === "all" || activeTab === "products" || activeTab === "services") && (
					<div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in-up animation-delay-300">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
							<Input
								placeholder="Search by name, SKU, or description..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400"
							/>
						</div>
						<Select value={filterCategory} onValueChange={setFilterCategory}>
							<SelectTrigger className="h-11 w-full sm:w-48 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
								<SelectValue placeholder="All Categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								{categories.map((cat) => (
									<SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{/* Product Grid */}
				{(activeTab === "all" || activeTab === "products" || activeTab === "services") && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up animation-delay-300">
						{filteredProducts.length === 0 ? (
							<div className="col-span-full text-center py-16">
								<Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
								<p className="text-slate-500 dark:text-slate-400 font-medium">No {activeTab === "all" ? "items" : activeTab} found</p>
								<p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Add your first product or service to get started.</p>
								<Button size="sm" className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white" onClick={openAddProduct}>
									<Plus className="w-3.5 h-3.5 mr-1.5" />
									Add Product
								</Button>
							</div>
						) : (
							filteredProducts.map((product) => (
								<Card key={product.id} className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
									<CardContent className="p-5">
										<div className="flex items-start justify-between mb-3">
											<div className="flex items-center gap-2">
												<div className={cn(
													"w-9 h-9 rounded-lg flex items-center justify-center",
													product.type === "Product"
														? "bg-gradient-to-br from-indigo-500 to-purple-500"
														: "bg-gradient-to-br from-emerald-500 to-teal-500",
												)}>
													{product.type === "Product" ? (
														<Package className="w-4 h-4 text-white" />
													) : (
														<Wrench className="w-4 h-4 text-white" />
													)}
												</div>
												<div>
													<h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{product.name}</h3>
													<p className="text-xs text-slate-400 dark:text-slate-500">{product.sku}</p>
												</div>
											</div>
											<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-indigo-600" onClick={() => openEditProduct(product)}>
													<Pencil className="w-3.5 h-3.5" />
												</Button>
												<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => { setDeletingProduct(product); setShowDeleteDialog(true); }}>
													<Trash2 className="w-3.5 h-3.5" />
												</Button>
											</div>
										</div>
										{product.description && (
											<p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{product.description}</p>
										)}
										<div className="flex items-center justify-between">
											<div>
												<p className="text-lg font-bold text-slate-900 dark:text-white">
													{product.currency === "USD" ? "$" : product.currency}{" "}
													{product.basePrice.toFixed(2)}
												</p>
												{product.taxRate > 0 && (
													<p className="text-xs text-slate-400 dark:text-slate-500">+{product.taxRate}% tax</p>
												)}
											</div>
											<div className="flex flex-col items-end gap-1">
												<Badge variant="outline" className={cn(
													"text-xs",
													product.type === "Product" ? "border-indigo-200 text-indigo-700" : "border-emerald-200 text-emerald-700",
												)}>
													{product.type}
												</Badge>
												{product.inventoryEnabled && (
													<Badge variant="outline" className={cn(
														"text-xs",
														product.stockQuantity === 0
															? "border-red-200 text-red-600 bg-red-50"
															: product.stockQuantity <= 5
																? "border-amber-200 text-amber-600 bg-amber-50"
																: "border-slate-200 text-slate-600",
													)}>
														{product.stockQuantity === 0 ? "Out of stock" : `${product.stockQuantity} in stock`}
													</Badge>
												)}
											</div>
										</div>
										{product.category && (
											<div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
												<span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
													<Tag className="w-3 h-3" />
													{product.category}
												</span>
											</div>
										)}
									</CardContent>
								</Card>
							))
						)}
					</div>
				)}

				{/* Categories Tab */}
				{activeTab === "categories" && (
					<div className="animate-fade-in-up animation-delay-300">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
								<FolderOpen className="w-4 h-4 text-indigo-600" />
								Categories
							</h3>
							<Button size="sm" variant="outline" className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={openAddCategory}>
								<Plus className="w-3.5 h-3.5 mr-1.5" />
								Add Category
							</Button>
						</div>
						{categories.length === 0 ? (
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-12 text-center">
									<FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
									<p className="text-slate-500 dark:text-slate-400 font-medium">No categories yet</p>
									<p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Create categories to organize your products.</p>
									<Button size="sm" className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white" onClick={openAddCategory}>
										<Plus className="w-3.5 h-3.5 mr-1.5" />
										Add Category
									</Button>
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{categories.map((cat) => {
									const count = products.filter((p) => p.category === cat.name).length;
									return (
										<Card key={cat.id} className="border-slate-100 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
											<CardContent className="p-5">
												<div className="flex items-start justify-between mb-2">
													<div className="flex items-center gap-2">
														<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
															<FolderOpen className="w-4 h-4 text-white" />
														</div>
														<div>
															<h3 className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</h3>
															<p className="text-xs text-slate-400 dark:text-slate-500">{count} item{count !== 1 ? "s" : ""}</p>
														</div>
													</div>
													<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-indigo-600" onClick={() => openEditCategory(cat)}>
															<Pencil className="w-3.5 h-3.5" />
														</Button>
														<Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500" onClick={() => { setDeletingCategory(cat); setShowDeleteCatDialog(true); }}>
															<Trash2 className="w-3.5 h-3.5" />
														</Button>
													</div>
												</div>
												{cat.description && (
													<p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{cat.description}</p>
												)}
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Analytics Tab */}
				{activeTab === "analytics" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-300">
						{/* Inventory Turnover */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-5">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
											<TrendingUp className="w-4 h-4 text-white" />
										</div>
										<h3 className="text-sm font-semibold text-slate-900 dark:text-white">Inventory Turnover</h3>
									</div>
									<p className="text-2xl font-bold text-slate-900 dark:text-white">{analytics.inventoryTurnoverRate.toFixed(2)}x</p>
									<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Units sold / avg inventory</p>
								</CardContent>
							</Card>
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-5">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
											<Package className="w-4 h-4 text-white" />
										</div>
										<h3 className="text-sm font-semibold text-slate-900 dark:text-white">Products</h3>
									</div>
									<p className="text-2xl font-bold text-slate-900 dark:text-white">{productCount}</p>
									<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Physical products</p>
								</CardContent>
							</Card>
							<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
								<CardContent className="p-5">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
											<Wrench className="w-4 h-4 text-white" />
										</div>
										<h3 className="text-sm font-semibold text-slate-900 dark:text-white">Services</h3>
									</div>
									<p className="text-2xl font-bold text-slate-900 dark:text-white">{serviceCount}</p>
									<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Service offerings</p>
								</CardContent>
							</Card>
						</div>

						{/* Top Selling */}
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
										<BarChart3 className="w-4 h-4 text-white" />
									</div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Selling Products</h3>
								</div>
								{analytics.topSelling.length === 0 ? (
									<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No sales data yet. Create invoices with products to see analytics.</p>
								) : (
									<div className="space-y-3">
										{analytics.topSelling.map((item) => {
											const maxQty = Math.max(...analytics.topSelling.map((i) => i.quantity), 1);
											return (
												<div key={item.productId}>
													<div className="flex items-center justify-between mb-1">
														<span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
														<span className="text-sm font-medium text-slate-900 dark:text-white">{item.quantity} sold</span>
													</div>
													<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
														<div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000" style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Revenue by Product */}
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
										<TrendingUp className="w-4 h-4 text-white" />
									</div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue by Product</h3>
								</div>
								{analytics.revenueByProduct.length === 0 ? (
									<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No revenue data yet.</p>
								) : (
									<div className="space-y-3">
										{analytics.revenueByProduct.map((item) => {
											const maxRev = Math.max(...analytics.revenueByProduct.map((i) => i.revenue), 1);
											return (
												<div key={item.productId}>
													<div className="flex items-center justify-between mb-1">
														<span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
														<span className="text-sm font-medium text-slate-900 dark:text-white">${item.revenue.toFixed(2)}</span>
													</div>
													<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
														<div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: `${(item.revenue / maxRev) * 100}%` }} />
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Most Used Services */}
						<Card className="border-slate-100 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
										<Wrench className="w-4 h-4 text-white" />
									</div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-white">Most Used Services</h3>
								</div>
								{analytics.mostUsedServices.length === 0 ? (
									<p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No service usage data yet.</p>
								) : (
									<div className="space-y-3">
										{analytics.mostUsedServices.map((item) => {
											const maxUsage = Math.max(...analytics.mostUsedServices.map((i) => i.usageCount), 1);
											return (
												<div key={item.productId}>
													<div className="flex items-center justify-between mb-1">
														<span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
														<span className="text-sm font-medium text-slate-900 dark:text-white">{item.usageCount} uses</span>
													</div>
													<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
														<div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000" style={{ width: `${(item.usageCount / maxUsage) * 100}%` }} />
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</main>

			{/* ── Add/Edit Product Dialog ── */}
			<Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
				<DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Package className="w-5 h-5 text-indigo-600" />
							{editingProduct ? "Edit Product" : "Add Product / Service"}
						</DialogTitle>
						<DialogDescription>
							{editingProduct ? "Update product details." : "Fill in the details to add a new item."}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name *</Label>
							<Input placeholder="Product or service name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
							<Textarea placeholder="Brief description" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} className="rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 min-h-[80px]" />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</Label>
								<Select value={productForm.type} onValueChange={(v) => setProductForm((p) => ({ ...p, type: v as ProductType }))}>
									<SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Product">Product</SelectItem>
										<SelectItem value="Service">Service</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</Label>
								<Select value={productForm.category || "General"} onValueChange={(v) => setProductForm((p) => ({ ...p, category: v }))}>
									<SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="General">General</SelectItem>
										{categories.map((cat) => (
											<SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Base Price</Label>
								<Input type="number" min="0" step="0.01" placeholder="0.00" value={productForm.basePrice} onChange={(e) => setProductForm((p) => ({ ...p, basePrice: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</Label>
								<Select value={productForm.currency} onValueChange={(v) => setProductForm((p) => ({ ...p, currency: v }))}>
									<SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="USD">USD</SelectItem>
										<SelectItem value="EUR">EUR</SelectItem>
										<SelectItem value="GBP">GBP</SelectItem>
										<SelectItem value="INR">INR</SelectItem>
										<SelectItem value="CAD">CAD</SelectItem>
										<SelectItem value="AUD">AUD</SelectItem>
										<SelectItem value="JPY">JPY</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Rate Override (%)</Label>
							<Input type="number" min="0" max="100" step="0.1" placeholder="0" value={productForm.taxRate} onChange={(e) => setProductForm((p) => ({ ...p, taxRate: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
							<div>
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Inventory</Label>
								<p className="text-xs text-slate-400 dark:text-slate-500">Track stock for this item</p>
							</div>
							<Switch checked={productForm.inventoryEnabled} onCheckedChange={(v) => setProductForm((p) => ({ ...p, inventoryEnabled: v }))} />
						</div>
						{productForm.inventoryEnabled && (
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stock Quantity</Label>
								<Input type="number" min="0" placeholder="0" value={productForm.stockQuantity} onChange={(e) => setProductForm((p) => ({ ...p, stockQuantity: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowProductDialog(false)} className="rounded-xl">Cancel</Button>
						<Button onClick={handleSaveProduct} disabled={!productForm.name.trim()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							{editingProduct ? "Update" : "Add"} {productForm.type}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Add/Edit Category Dialog ── */}
			<Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FolderOpen className="w-5 h-5 text-indigo-600" />
							{editingCategory ? "Edit Category" : "Add Category"}
						</DialogTitle>
						<DialogDescription>
							{editingCategory ? "Update category details." : "Create a new category."}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name *</Label>
							<Input placeholder="Category name" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
							<Textarea placeholder="Optional description" value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} className="rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCategoryDialog(false)} className="rounded-xl">Cancel</Button>
						<Button onClick={handleSaveCategory} disabled={!categoryForm.name.trim()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							{editingCategory ? "Update" : "Add"} Category
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Delete Product Confirm ── */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {deletingProduct?.type}?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete &quot;{deletingProduct?.name}&quot;? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteProduct} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Delete Category Confirm ── */}
			<AlertDialog open={showDeleteCatDialog} onOpenChange={setShowDeleteCatDialog}>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Category?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete &quot;{deletingCategory?.name}&quot;? Products in this category will not be deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteCategory} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Import Dialog ── */}
			<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Upload className="w-5 h-5 text-indigo-600" />
							Import Products
						</DialogTitle>
						<DialogDescription>
							Upload a CSV file with columns: SKU, Name, Description, Category, Type, Base Price, Currency, Tax Rate, Inventory Enabled, Stock Quantity
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportFile} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
						{importResult && (
							<div className="space-y-2">
								<div className="flex gap-3">
									<Badge variant="outline" className="border-emerald-200 text-emerald-700">
										{importResult.imported} imported
									</Badge>
									{importResult.skipped > 0 && (
										<Badge variant="outline" className="border-amber-200 text-amber-700">
											{importResult.skipped} skipped
										</Badge>
									)}
								</div>
								{importResult.errors.length > 0 && (
									<div className="max-h-32 overflow-y-auto text-xs text-red-600 space-y-1 bg-red-50 rounded-lg p-3">
										{importResult.errors.map((err, i) => (
											<p key={i}>{err}</p>
										))}
									</div>
								)}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowImportDialog(false)} className="rounded-xl">Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
