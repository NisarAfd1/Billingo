// ─────────────────────────────────────────────────
// Billingo Products & Services Store
// ─────────────────────────────────────────────────

import { logActivity } from "@/lib/activity-log";
import { getInvoices } from "@/lib/billing-store";

// ── Data Models ──

export type ProductType = "Product" | "Service";

export interface Product {
	id: string;
	name: string;
	description: string;
	category: string;
	type: ProductType;
	sku: string;
	basePrice: number;
	currency: string;
	taxRate: number;
	inventoryEnabled: boolean;
	stockQuantity: number;
	createdAt: string;
}

export interface Category {
	id: string;
	name: string;
	description: string;
}

export interface InventorySummary {
	totalProducts: number;
	lowStockItems: number;
	outOfStockItems: number;
}

export interface ProductAnalytics {
	topSelling: { productId: string; name: string; quantity: number; revenue: number }[];
	revenueByProduct: { productId: string; name: string; revenue: number }[];
	mostUsedServices: { productId: string; name: string; usageCount: number }[];
	inventoryTurnoverRate: number;
}

// ── Storage Keys ──

const KEYS = {
	products: "billingo_products",
	categories: "billingo_categories",
	productCounter: "billingo_product_counter",
} as const;

// ── Generic Helpers ──

function readList<T>(key: string): T[] {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function writeList<T>(key: string, data: T[]): void {
	localStorage.setItem(key, JSON.stringify(data));
}

// ── SKU Generation ──

function getNextSKU(type: ProductType): string {
	const raw = localStorage.getItem(KEYS.productCounter);
	const counter = raw ? parseInt(raw, 10) + 1 : 1;
	localStorage.setItem(KEYS.productCounter, String(counter));
	const prefix = type === "Product" ? "PRD" : "SVC";
	return `BIL-${prefix}-${String(counter).padStart(4, "0")}`;
}

// ── Low Stock Threshold ──

const LOW_STOCK_THRESHOLD = 5;

// ── Category CRUD ──

export function getCategories(): Category[] {
	return readList<Category>(KEYS.categories);
}

export function getCategoryById(id: string): Category | undefined {
	return getCategories().find((c) => c.id === id);
}

export function saveCategory(data: Omit<Category, "id">): Category {
	const categories = getCategories();
	const newCat: Category = {
		...data,
		id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
	};
	categories.push(newCat);
	writeList(KEYS.categories, categories);
	logActivity("product_created", `Category "${newCat.name}" created`);
	return newCat;
}

export function updateCategory(id: string, updates: Partial<Category>): void {
	const categories = getCategories();
	const idx = categories.findIndex((c) => c.id === id);
	if (idx !== -1) {
		categories[idx] = { ...categories[idx], ...updates };
		writeList(KEYS.categories, categories);
	}
}

export function deleteCategory(id: string): void {
	const categories = getCategories();
	writeList(KEYS.categories, categories.filter((c) => c.id !== id));
}

// ── Product CRUD ──

export function getProducts(): Product[] {
	return readList<Product>(KEYS.products);
}

export function getProductById(id: string): Product | undefined {
	return getProducts().find((p) => p.id === id);
}

export function saveProduct(data: Omit<Product, "id" | "sku" | "createdAt">): Product {
	const products = getProducts();
	const newProduct: Product = {
		...data,
		id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		sku: getNextSKU(data.type),
		createdAt: new Date().toISOString(),
	};
	products.push(newProduct);
	writeList(KEYS.products, products);
	logActivity("product_created", `${data.type} "${newProduct.name}" created (SKU: ${newProduct.sku})`);
	return newProduct;
}

export function updateProduct(id: string, updates: Partial<Omit<Product, "id" | "sku" | "createdAt">>): void {
	const products = getProducts();
	const idx = products.findIndex((p) => p.id === id);
	if (idx !== -1) {
		products[idx] = { ...products[idx], ...updates };
		writeList(KEYS.products, products);
		logActivity("product_updated", `Product "${products[idx].name}" updated`);
	}
}

export function deleteProduct(id: string): void {
	const products = getProducts();
	const product = products.find((p) => p.id === id);
	if (!product) return;
	writeList(KEYS.products, products.filter((p) => p.id !== id));
	logActivity("product_deleted", `Product "${product.name}" deleted`);
}

// ── Inventory Management ──

export function reduceStock(productId: string, quantity: number): void {
	const products = getProducts();
	const idx = products.findIndex((p) => p.id === productId);
	if (idx !== -1 && products[idx].inventoryEnabled) {
		products[idx].stockQuantity = Math.max(0, products[idx].stockQuantity - quantity);
		writeList(KEYS.products, products);
	}
}

export function getInventorySummary(): InventorySummary {
	const products = getProducts().filter((p) => p.inventoryEnabled);
	return {
		totalProducts: products.length,
		lowStockItems: products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= LOW_STOCK_THRESHOLD).length,
		outOfStockItems: products.filter((p) => p.stockQuantity === 0).length,
	};
}

export function getLowStockProducts(): Product[] {
	return getProducts().filter(
		(p) => p.inventoryEnabled && p.stockQuantity <= LOW_STOCK_THRESHOLD,
	);
}

// ── Product Analytics ──

export function getProductAnalytics(): ProductAnalytics {
	const products = getProducts();
	const invoices = getInvoices();

	// Build a map: product name -> usage stats
	const usageMap = new Map<string, { productId: string; name: string; quantity: number; revenue: number; type: ProductType }>();

	for (const inv of invoices) {
		if (inv.status === "Paid" || inv.status === "Unpaid") {
			for (const item of inv.items) {
				// Try to match by description to a product
				const matched = products.find(
					(p) => p.name.toLowerCase() === item.description.toLowerCase(),
				);
				if (matched) {
					const existing = usageMap.get(matched.id) || {
						productId: matched.id,
						name: matched.name,
						quantity: 0,
						revenue: 0,
						type: matched.type,
					};
					existing.quantity += item.quantity;
					existing.revenue += item.total;
					usageMap.set(matched.id, existing);
				}
			}
		}
	}

	const allUsage = Array.from(usageMap.values());

	const topSelling = [...allUsage]
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5)
		.map(({ productId, name, quantity, revenue }) => ({ productId, name, quantity, revenue }));

	const revenueByProduct = [...allUsage]
		.sort((a, b) => b.revenue - a.revenue)
		.slice(0, 5)
		.map(({ productId, name, revenue }) => ({ productId, name, revenue }));

	const mostUsedServices = allUsage
		.filter((u) => u.type === "Service")
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5)
		.map(({ productId, name, quantity }) => ({ productId, name, usageCount: quantity }));

	// Inventory turnover = total units sold / average inventory
	const totalUnitsSold = allUsage.reduce((sum, u) => sum + u.quantity, 0);
	const inventoryProducts = products.filter((p) => p.inventoryEnabled);
	const avgInventory = inventoryProducts.length > 0
		? inventoryProducts.reduce((sum, p) => sum + p.stockQuantity, 0) / inventoryProducts.length
		: 0;
	const inventoryTurnoverRate = avgInventory > 0 ? totalUnitsSold / avgInventory : 0;

	return {
		topSelling,
		revenueByProduct,
		mostUsedServices,
		inventoryTurnoverRate,
	};
}

// ── Bulk Import / Export ──

export function exportProductsCSV(): string {
	const products = getProducts();
	const headers = ["SKU", "Name", "Description", "Category", "Type", "Base Price", "Currency", "Tax Rate", "Inventory Enabled", "Stock Quantity", "Created At"];
	const rows = products.map((p) => [
		p.sku,
		`"${p.name.replace(/"/g, '""')}"`,
		`"${p.description.replace(/"/g, '""')}"`,
		`"${p.category.replace(/"/g, '""')}"`,
		p.type,
		p.basePrice.toFixed(2),
		p.currency,
		p.taxRate.toString(),
		p.inventoryEnabled ? "Yes" : "No",
		p.stockQuantity.toString(),
		p.createdAt,
	]);
	return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export interface ImportResult {
	imported: number;
	skipped: number;
	errors: string[];
}

export function importProductsCSV(csvContent: string): ImportResult {
	const lines = csvContent.split("\n").filter((l) => l.trim());
	if (lines.length < 2) return { imported: 0, skipped: 0, errors: ["No data rows found"] };

	const existingProducts = getProducts();
	const existingSKUs = new Set(existingProducts.map((p) => p.sku));

	let imported = 0;
	let skipped = 0;
	const errors: string[] = [];

	// Skip header row
	for (let i = 1; i < lines.length; i++) {
		try {
			const cols = parseCSVLine(lines[i]);
			if (cols.length < 6) {
				errors.push(`Row ${i + 1}: insufficient columns`);
				skipped++;
				continue;
			}

			const sku = cols[0]?.trim();
			if (sku && existingSKUs.has(sku)) {
				errors.push(`Row ${i + 1}: duplicate SKU "${sku}"`);
				skipped++;
				continue;
			}

			const name = cols[1]?.trim();
			if (!name) {
				errors.push(`Row ${i + 1}: missing name`);
				skipped++;
				continue;
			}

			const type = (cols[4]?.trim() || "Product") as ProductType;
			if (type !== "Product" && type !== "Service") {
				errors.push(`Row ${i + 1}: invalid type "${cols[4]}"`);
				skipped++;
				continue;
			}

			const product: Product = {
				id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
				name,
				description: cols[2]?.trim() || "",
				category: cols[3]?.trim() || "General",
				type,
				sku: sku || getNextSKU(type),
				basePrice: parseFloat(cols[5]) || 0,
				currency: cols[6]?.trim() || "USD",
				taxRate: parseFloat(cols[7]) || 0,
				inventoryEnabled: (cols[8]?.trim().toLowerCase() === "yes"),
				stockQuantity: parseInt(cols[9]) || 0,
				createdAt: cols[10]?.trim() || new Date().toISOString(),
			};

			existingProducts.push(product);
			existingSKUs.add(product.sku);
			imported++;
		} catch {
			errors.push(`Row ${i + 1}: parse error`);
			skipped++;
		}
	}

	writeList(KEYS.products, existingProducts);
	if (imported > 0) {
		logActivity("product_created", `Imported ${imported} products from CSV`);
	}

	return { imported, skipped, errors };
}

function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			result.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	result.push(current);
	return result;
}
