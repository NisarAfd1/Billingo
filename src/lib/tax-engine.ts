// ─────────────────────────────────────────────────
// Country-Based Tax Engine
// ─────────────────────────────────────────────────

export interface TaxPreset {
	country: string;
	taxName: string;
	defaultRate: number;
	taxType: "GST" | "VAT" | "Sales Tax" | "Custom";
}

// Country → Tax Presets
export const TAX_PRESETS: Record<string, TaxPreset> = {
	Pakistan: { country: "Pakistan", taxName: "GST", defaultRate: 18, taxType: "GST" },
	India: { country: "India", taxName: "GST", defaultRate: 18, taxType: "GST" },
	"United States": { country: "United States", taxName: "Sales Tax", defaultRate: 8, taxType: "Sales Tax" },
	"United Kingdom": { country: "United Kingdom", taxName: "VAT", defaultRate: 20, taxType: "VAT" },
	UAE: { country: "UAE", taxName: "VAT", defaultRate: 5, taxType: "VAT" },
	"Saudi Arabia": { country: "Saudi Arabia", taxName: "VAT", defaultRate: 15, taxType: "VAT" },
	Germany: { country: "Germany", taxName: "VAT", defaultRate: 19, taxType: "VAT" },
	France: { country: "France", taxName: "VAT", defaultRate: 20, taxType: "VAT" },
	Canada: { country: "Canada", taxName: "GST", defaultRate: 5, taxType: "GST" },
	Australia: { country: "Australia", taxName: "GST", defaultRate: 10, taxType: "GST" },
	Japan: { country: "Japan", taxName: "Consumption Tax", defaultRate: 10, taxType: "VAT" },
	China: { country: "China", taxName: "VAT", defaultRate: 13, taxType: "VAT" },
	Brazil: { country: "Brazil", taxName: "ICMS", defaultRate: 18, taxType: "VAT" },
	Mexico: { country: "Mexico", taxName: "IVA", defaultRate: 16, taxType: "VAT" },
	Singapore: { country: "Singapore", taxName: "GST", defaultRate: 9, taxType: "GST" },
	"South Korea": { country: "South Korea", taxName: "VAT", defaultRate: 10, taxType: "VAT" },
	Italy: { country: "Italy", taxName: "IVA", defaultRate: 22, taxType: "VAT" },
	Spain: { country: "Spain", taxName: "IVA", defaultRate: 21, taxType: "VAT" },
	Netherlands: { country: "Netherlands", taxName: "BTW", defaultRate: 21, taxType: "VAT" },
	Switzerland: { country: "Switzerland", taxName: "VAT", defaultRate: 8.1, taxType: "VAT" },
	Turkey: { country: "Turkey", taxName: "KDV", defaultRate: 20, taxType: "VAT" },
	"South Africa": { country: "South Africa", taxName: "VAT", defaultRate: 15, taxType: "VAT" },
	Nigeria: { country: "Nigeria", taxName: "VAT", defaultRate: 7.5, taxType: "VAT" },
	Egypt: { country: "Egypt", taxName: "VAT", defaultRate: 14, taxType: "VAT" },
	Kenya: { country: "Kenya", taxName: "VAT", defaultRate: 16, taxType: "VAT" },
	Malaysia: { country: "Malaysia", taxName: "SST", defaultRate: 10, taxType: "VAT" },
	Thailand: { country: "Thailand", taxName: "VAT", defaultRate: 7, taxType: "VAT" },
	Indonesia: { country: "Indonesia", taxName: "PPN", defaultRate: 11, taxType: "VAT" },
	Philippines: { country: "Philippines", taxName: "VAT", defaultRate: 12, taxType: "VAT" },
	Bangladesh: { country: "Bangladesh", taxName: "VAT", defaultRate: 15, taxType: "VAT" },
	Russia: { country: "Russia", taxName: "NDS", defaultRate: 20, taxType: "VAT" },
	Poland: { country: "Poland", taxName: "VAT", defaultRate: 23, taxType: "VAT" },
	Sweden: { country: "Sweden", taxName: "Moms", defaultRate: 25, taxType: "VAT" },
	Norway: { country: "Norway", taxName: "MVA", defaultRate: 25, taxType: "VAT" },
	Denmark: { country: "Denmark", taxName: "Moms", defaultRate: 25, taxType: "VAT" },
	"New Zealand": { country: "New Zealand", taxName: "GST", defaultRate: 15, taxType: "GST" },
	Ireland: { country: "Ireland", taxName: "VAT", defaultRate: 23, taxType: "VAT" },
	Belgium: { country: "Belgium", taxName: "BTW", defaultRate: 21, taxType: "VAT" },
	Austria: { country: "Austria", taxName: "USt", defaultRate: 20, taxType: "VAT" },
	Portugal: { country: "Portugal", taxName: "IVA", defaultRate: 23, taxType: "VAT" },
	Greece: { country: "Greece", taxName: "FPA", defaultRate: 24, taxType: "VAT" },
	"Czech Republic": { country: "Czech Republic", taxName: "DPH", defaultRate: 21, taxType: "VAT" },
	Romania: { country: "Romania", taxName: "TVA", defaultRate: 19, taxType: "VAT" },
	Hungary: { country: "Hungary", taxName: "AFA", defaultRate: 27, taxType: "VAT" },
};

// ── Tax Configuration (per business) ──

export interface TaxConfig {
	enabled: boolean;
	taxName: string;
	taxRate: number;
	taxType: string;
	country: string;
}

const TAX_CONFIG_KEY = "billingo_tax_config";

export function getTaxConfig(): TaxConfig {
	try {
		const raw = localStorage.getItem(TAX_CONFIG_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore
	}
	// Fall back to onboarding data
	try {
		const onboarding = localStorage.getItem("billingo_onboarding");
		if (onboarding) {
			const data = JSON.parse(onboarding);
			const country = data.country || "";
			const preset = TAX_PRESETS[country];
			return {
				enabled: data.chargesTax === true,
				taxName: preset?.taxName || "Tax",
				taxRate: data.chargesTax ? parseFloat(data.taxPercentage) || preset?.defaultRate || 0 : 0,
				taxType: preset?.taxType || "Custom",
				country,
			};
		}
	} catch {
		// ignore
	}
	return {
		enabled: false,
		taxName: "Tax",
		taxRate: 0,
		taxType: "Custom",
		country: "",
	};
}

export function saveTaxConfig(config: TaxConfig): void {
	localStorage.setItem(TAX_CONFIG_KEY, JSON.stringify(config));
}

export function getTaxPresetForCountry(country: string): TaxPreset | undefined {
	return TAX_PRESETS[country];
}

// ── Tax Calculation ──

export function calculateTax(subtotal: number, config: TaxConfig): number {
	if (!config.enabled || config.taxRate <= 0) return 0;
	return subtotal * (config.taxRate / 100);
}

export function getTaxLabel(config: TaxConfig): string {
	if (!config.enabled) return "";
	return `${config.taxName} (${config.taxRate}%)`;
}
