// ─────────────────────────────────────────────────
// Multi-Currency System with Exchange Rate Support
// ─────────────────────────────────────────────────

export interface CurrencyConfig {
	code: string;
	symbol: string;
	name: string;
	decimals: number;
}

// Core currency registry
export const CURRENCIES: Record<string, CurrencyConfig> = {
	USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
	PKR: { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", decimals: 2 },
	EUR: { code: "EUR", symbol: "\u20AC", name: "Euro", decimals: 2 },
	GBP: { code: "GBP", symbol: "\u00A3", name: "British Pound", decimals: 2 },
	AED: { code: "AED", symbol: "\u062F.\u0625", name: "UAE Dirham", decimals: 2 },
	INR: { code: "INR", symbol: "\u20B9", name: "Indian Rupee", decimals: 2 },
	JPY: { code: "JPY", symbol: "\u00A5", name: "Japanese Yen", decimals: 0 },
	CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2 },
	AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2 },
	CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimals: 2 },
	CNY: { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan", decimals: 2 },
	SAR: { code: "SAR", symbol: "SAR", name: "Saudi Riyal", decimals: 2 },
	BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2 },
	MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso", decimals: 2 },
	SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2 },
	HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", decimals: 2 },
	KRW: { code: "KRW", symbol: "\u20A9", name: "South Korean Won", decimals: 0 },
	THB: { code: "THB", symbol: "\u0E3F", name: "Thai Baht", decimals: 2 },
	MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", decimals: 2 },
	IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", decimals: 0 },
	PHP: { code: "PHP", symbol: "\u20B1", name: "Philippine Peso", decimals: 2 },
	NGN: { code: "NGN", symbol: "\u20A6", name: "Nigerian Naira", decimals: 2 },
	ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", decimals: 2 },
	EGP: { code: "EGP", symbol: "E\u00A3", name: "Egyptian Pound", decimals: 2 },
	TRY: { code: "TRY", symbol: "\u20BA", name: "Turkish Lira", decimals: 2 },
	SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", decimals: 2 },
	NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", decimals: 2 },
	NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", decimals: 2 },
	QAR: { code: "QAR", symbol: "QR", name: "Qatari Riyal", decimals: 2 },
	KWD: { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar", decimals: 3 },
	BHD: { code: "BHD", symbol: "BD", name: "Bahraini Dinar", decimals: 3 },
	RUB: { code: "RUB", symbol: "\u20BD", name: "Russian Ruble", decimals: 2 },
};

// Placeholder exchange rates (USD base)
// In production, replace with real API (e.g., Open Exchange Rates, Fixer.io)
const PLACEHOLDER_RATES: Record<string, number> = {
	USD: 1,
	PKR: 278.5,
	EUR: 0.92,
	GBP: 0.79,
	AED: 3.67,
	INR: 83.12,
	JPY: 149.5,
	CAD: 1.36,
	AUD: 1.53,
	CHF: 0.88,
	CNY: 7.24,
	SAR: 3.75,
	BRL: 4.97,
	MXN: 17.15,
	SGD: 1.34,
	HKD: 7.82,
	KRW: 1320,
	THB: 35.5,
	MYR: 4.72,
	IDR: 15650,
	PHP: 56.2,
	NGN: 1550,
	ZAR: 18.6,
	EGP: 30.9,
	TRY: 30.2,
	SEK: 10.45,
	NOK: 10.6,
	NZD: 1.64,
	QAR: 3.64,
	KWD: 0.31,
	BHD: 0.377,
	RUB: 92.5,
};

const STORAGE_KEY = "billingo_exchange_rates";
const BUSINESS_CURRENCY_KEY = "billingo_business_currency";

// ── Exchange Rate Management ──

export interface ExchangeRates {
	base: string;
	rates: Record<string, number>;
	lastUpdated: string;
}

export function getExchangeRates(): ExchangeRates {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore
	}
	// Return placeholder rates
	const rates: ExchangeRates = {
		base: "USD",
		rates: { ...PLACEHOLDER_RATES },
		lastUpdated: new Date().toISOString(),
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
	return rates;
}

export function updateExchangeRates(rates: Record<string, number>): void {
	const data: ExchangeRates = {
		base: "USD",
		rates,
		lastUpdated: new Date().toISOString(),
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Currency Conversion ──

export function convertCurrency(
	amount: number,
	from: string,
	to: string,
): number {
	if (from === to) return amount;
	const { rates } = getExchangeRates();
	const fromRate = rates[from] || 1;
	const toRate = rates[to] || 1;
	// Convert: amount in "from" → USD → "to"
	const usdAmount = amount / fromRate;
	return usdAmount * toRate;
}

export function getConversionRate(from: string, to: string): number {
	if (from === to) return 1;
	const { rates } = getExchangeRates();
	const fromRate = rates[from] || 1;
	const toRate = rates[to] || 1;
	return toRate / fromRate;
}

// ── Currency Display ──

export function formatCurrency(
	amount: number,
	currencyCode: string,
): string {
	const config = CURRENCIES[currencyCode];
	const symbol = config?.symbol || currencyCode;
	const decimals = config?.decimals ?? 2;
	const formatted = amount.toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
	return `${symbol}${formatted}`;
}

export function getCurrencyByCode(code: string): CurrencyConfig | undefined {
	return CURRENCIES[code];
}

export function getAllCurrencyCodes(): string[] {
	return Object.keys(CURRENCIES);
}

// ── Business Currency ──

export function getBusinessCurrency(): string {
	try {
		const raw = localStorage.getItem(BUSINESS_CURRENCY_KEY);
		if (raw) return raw;
		// Fall back to onboarding data
		const onboarding = localStorage.getItem("billingo_onboarding");
		if (onboarding) {
			const data = JSON.parse(onboarding);
			const currency = data.currency || "USD - US Dollar";
			const code = currency.split(" ")[0] || "USD";
			return code;
		}
	} catch {
		// ignore
	}
	return "USD";
}

export function setBusinessCurrency(code: string): void {
	localStorage.setItem(BUSINESS_CURRENCY_KEY, code);
}

// ── Utility: Extract code from legacy format ──

export function extractCurrencyCode(legacyCurrency: string): string {
	if (CURRENCIES[legacyCurrency]) return legacyCurrency;
	const code = legacyCurrency.split(" ")[0] || "USD";
	if (CURRENCIES[code]) return code;
	return "USD";
}
