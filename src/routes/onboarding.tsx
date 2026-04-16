import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Zap,
	User,
	Building2,
	Store,
	Truck,
	Users,
	Package,
	Briefcase,
	FileText,
	CreditCard,
	TrendingUp,
	BarChart3,
	ShoppingCart,
	Bot,
	Receipt,
	CheckCircle2,
	ArrowRight,
	ArrowLeft,
	Upload,
	Globe,
	Phone,
	Mail,
	Loader2,
	Info,
} from "lucide-react";
import { getTaxPresetForCountry, saveTaxConfig } from "@/lib/tax-engine";
import { setBusinessCurrency, extractCurrencyCode } from "@/lib/currency";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

interface OnboardingData {
	businessType: string;
	services: string[];
	businessName: string;
	logoFile: string | null;
	country: string;
	currency: string;
	phone: string;
	businessEmail: string;
	chargesTax: boolean;
	taxPercentage: string;
}

const INITIAL_DATA: OnboardingData = {
	businessType: "",
	services: [],
	businessName: "",
	logoFile: null,
	country: "",
	currency: "",
	phone: "",
	businessEmail: "",
	chargesTax: false,
	taxPercentage: "",
};

const businessTypes = [
	{ id: "freelancer", label: "Freelancer", icon: User, desc: "Solo professional" },
	{ id: "company", label: "Company", icon: Building2, desc: "Registered business" },
	{ id: "shopkeeper", label: "Shopkeeper", icon: Store, desc: "Retail business" },
	{ id: "vendor", label: "Vendor", icon: Truck, desc: "Supplier / Distributor" },
	{ id: "agency", label: "Agency", icon: Users, desc: "Service agency" },
	{ id: "wholesale", label: "Wholesale", icon: Package, desc: "Bulk distributor" },
	{ id: "enterprise", label: "Enterprise", icon: Briefcase, desc: "Large organization" },
];

const serviceOptions = [
	{ id: "invoicing", label: "Invoicing", icon: FileText },
	{ id: "estimates", label: "Estimates / Quotations", icon: Receipt },
	{ id: "payment-tracking", label: "Payment Tracking", icon: CreditCard },
	{ id: "expense-tracking", label: "Expense Tracking", icon: TrendingUp },
	{ id: "inventory", label: "Inventory", icon: ShoppingCart },
	{ id: "subscription-billing", label: "Subscription Billing", icon: BarChart3 },
	{ id: "ai-insights", label: "AI Financial Insights", icon: Bot },
];

const countries = [
	"Afghanistan", "Albania", "Algeria", "Argentina", "Australia",
	"Austria", "Bahrain", "Bangladesh", "Belgium", "Brazil",
	"Canada", "Chile", "China", "Colombia", "Czech Republic",
	"Denmark", "Egypt", "Ethiopia", "Finland", "France",
	"Germany", "Ghana", "Greece", "Hong Kong", "Hungary",
	"India", "Indonesia", "Iran", "Iraq", "Ireland",
	"Israel", "Italy", "Japan", "Jordan", "Kazakhstan",
	"Kenya", "Kuwait", "Lebanon", "Libya", "Malaysia",
	"Mexico", "Morocco", "Nepal", "Netherlands", "New Zealand",
	"Nigeria", "Norway", "Oman", "Pakistan", "Peru",
	"Philippines", "Poland", "Portugal", "Qatar", "Romania",
	"Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea",
	"Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan",
	"Tanzania", "Thailand", "Tunisia", "Turkey", "UAE",
	"Uganda", "Ukraine", "United Kingdom", "United States", "Vietnam",
];

const currencies = [
	"USD - US Dollar", "EUR - Euro", "GBP - British Pound",
	"CAD - Canadian Dollar", "AUD - Australian Dollar",
	"INR - Indian Rupee", "PKR - Pakistani Rupee",
	"AED - UAE Dirham", "SAR - Saudi Riyal", "JPY - Japanese Yen",
	"BRL - Brazilian Real", "MXN - Mexican Peso", "SGD - Singapore Dollar",
	"CHF - Swiss Franc", "CNY - Chinese Yuan", "HKD - Hong Kong Dollar",
	"KRW - South Korean Won", "THB - Thai Baht", "MYR - Malaysian Ringgit",
	"IDR - Indonesian Rupiah", "PHP - Philippine Peso", "VND - Vietnamese Dong",
	"NGN - Nigerian Naira", "ZAR - South African Rand", "EGP - Egyptian Pound",
	"KES - Kenyan Shilling", "GHS - Ghanaian Cedi", "TRY - Turkish Lira",
	"SEK - Swedish Krona", "NOK - Norwegian Krone", "DKK - Danish Krone",
	"PLN - Polish Zloty", "CZK - Czech Koruna", "HUF - Hungarian Forint",
	"RON - Romanian Leu", "NZD - New Zealand Dollar", "CLP - Chilean Peso",
	"COP - Colombian Peso", "PEN - Peruvian Sol", "ARS - Argentine Peso",
	"QAR - Qatari Riyal", "BHD - Bahraini Dinar", "KWD - Kuwaiti Dinar",
	"OMR - Omani Rial", "JOD - Jordanian Dinar", "LBP - Lebanese Pound",
	"BDT - Bangladeshi Taka", "LKR - Sri Lankan Rupee", "NPR - Nepalese Rupee",
	"RUB - Russian Ruble", "UAH - Ukrainian Hryvnia", "ILS - Israeli Shekel",
];


function OnboardingPage() {
	const navigate = useNavigate();
	const [step, setStep] = useState(1);
	const [direction, setDirection] = useState<"forward" | "back">("forward");
	const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
	const totalSteps = 5;
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const auth = localStorage.getItem("billingo_auth");
		if (!auth) {
			navigate({ to: "/login" });
		}
	}, [navigate]);

	function goNext() {
		if (step < totalSteps) {
			setDirection("forward");
			setStep(step + 1);
		}
	}

	function goBack() {
		if (step > 1) {
			setDirection("back");
			setStep(step - 1);
		}
	}

	function toggleService(id: string) {
		setData((prev) => ({
			...prev,
			services: prev.services.includes(id)
				? prev.services.filter((s) => s !== id)
				: [...prev.services, id],
		}));
	}

	function handleFinish() {
		localStorage.setItem("billingo_onboarding", JSON.stringify(data));
		localStorage.setItem("billingo_onboarded", "true");

		// Save tax config from onboarding data
		const preset = getTaxPresetForCountry(data.country);
		saveTaxConfig({
			enabled: data.chargesTax,
			taxName: preset?.taxName || "Tax",
			taxRate: data.chargesTax ? parseFloat(data.taxPercentage) || preset?.defaultRate || 0 : 0,
			taxType: preset?.taxType || "Custom",
			country: data.country,
		});

		// Save business currency
		const currencyCode = extractCurrencyCode(data.currency);
		setBusinessCurrency(currencyCode);

		navigate({ to: "/dashboard" });
	}

	const stepProgress = (step / totalSteps) * 100;

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 relative overflow-hidden">
			{/* Background */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-10 left-[5%] w-72 h-72 bg-indigo-200/15 rounded-full blur-3xl animate-float" />
				<div className="absolute bottom-10 right-[5%] w-80 h-80 bg-cyan-200/10 rounded-full blur-3xl animate-float-slow" />
			</div>

			<div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center gap-2 mb-4">
						<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
							<Zap className="w-5 h-5 text-white" />
						</div>
						<span className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
							Billingo
						</span>
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
						Set up your workspace
					</h1>
					<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
						Step {step} of {totalSteps}
					</p>
				</div>

				{/* Progress bar */}
				<div className="mb-8">
					<div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full transition-all duration-700 ease-out"
							style={{ width: `${stepProgress}%` }}
						/>
					</div>
					<div className="flex justify-between mt-2">
						{["Identity", "Services", "Details", "Tax", "Confirm"].map(
							(label, i) => (
								<span
									key={label}
									className={cn(
										"text-xs font-medium transition-colors",
										i + 1 <= step
											? "text-indigo-600"
											: "text-slate-400 dark:text-slate-500",
									)}
								>
									{label}
								</span>
							),
						)}
					</div>
				</div>

				{/* Step container */}
				<div
					ref={containerRef}
					className="bg-white/80 dark:bg-slate-800 backdrop-blur-xl border border-slate-200/60 dark:border-slate-600 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 p-6 sm:p-8 min-h-[420px]"
				>
					<div
						key={step}
						className={cn(
							direction === "forward"
								? "animate-slide-in-step"
								: "animate-slide-in-step-back",
						)}
					>
						{step === 1 && (
							<Step1BusinessType
								selected={data.businessType}
								onSelect={(t) => setData({ ...data, businessType: t })}
							/>
						)}
						{step === 2 && (
							<Step2Services
								selected={data.services}
								onToggle={toggleService}
							/>
						)}
						{step === 3 && (
							<Step3Details data={data} setData={setData} />
						)}
						{step === 4 && (
							<Step4Tax data={data} setData={setData} />
						)}
						{step === 5 && <Step5Confirm data={data} />}
					</div>
				</div>

				{/* Navigation buttons */}
				<div className="flex items-center justify-between mt-6">
					<Button
						variant="outline"
						onClick={goBack}
						disabled={step === 1}
						className="rounded-xl border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
					>
						<ArrowLeft className="w-4 h-4 mr-1" />
						Back
					</Button>

					{step < totalSteps ? (
						<Button
							onClick={goNext}
							disabled={
								(step === 1 && !data.businessType) ||
								(step === 2 && data.services.length === 0)
							}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:opacity-90 transition-all"
						>
							Continue
							<ArrowRight className="w-4 h-4 ml-1" />
						</Button>
					) : (
						<Button
							onClick={handleFinish}
							className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:opacity-90 transition-all px-6"
						>
							<Bot className="w-4 h-4 mr-1" />
							Generate My Smart Dashboard
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Step 1: Business Identity ───
function Step1BusinessType({
	selected,
	onSelect,
}: {
	selected: string;
	onSelect: (type: string) => void;
}) {
	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
				What are you?
			</h2>
			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
				Select the type that best describes your business.
			</p>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{businessTypes.map((bt) => (
					<button
						key={bt.id}
						type="button"
						onClick={() => onSelect(bt.id)}
						className={cn(
							"group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-center",
							selected === bt.id
								? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
								: "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5",
						)}
					>
						<div
							className={cn(
								"w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300",
								selected === bt.id
									? "bg-gradient-to-br from-indigo-500 to-cyan-500 scale-110"
									: "bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100",
							)}
						>
							<bt.icon
								className={cn(
									"w-6 h-6 transition-colors",
									selected === bt.id
										? "text-white"
										: "text-slate-500 group-hover:text-indigo-600",
								)}
							/>
						</div>
						<span
							className={cn(
								"text-sm font-medium transition-colors",
								selected === bt.id
									? "text-indigo-700"
									: "text-slate-700 dark:text-slate-300",
							)}
						>
							{bt.label}
						</span>
						<span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
							{bt.desc}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Step 2: Services ───
function Step2Services({
	selected,
	onToggle,
}: {
	selected: string[];
	onToggle: (id: string) => void;
}) {
	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
				What services do you need?
			</h2>
			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
				Select all the features you want in your workspace.
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{serviceOptions.map((svc) => {
					const active = selected.includes(svc.id);
					return (
						<button
							key={svc.id}
							type="button"
							onClick={() => onToggle(svc.id)}
							className={cn(
								"group flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left",
								active
									? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
									: "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-700/50 hover:border-indigo-200 hover:shadow-md",
							)}
						>
							<div
								className={cn(
									"w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
									active
										? "bg-gradient-to-br from-indigo-500 to-cyan-500"
										: "bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100",
								)}
							>
								<svc.icon
									className={cn(
										"w-5 h-5 transition-colors",
										active
											? "text-white"
											: "text-slate-500 group-hover:text-indigo-600",
									)}
								/>
							</div>
							<span
								className={cn(
									"text-sm font-medium transition-colors",
									active ? "text-indigo-700" : "text-slate-700 dark:text-slate-300",
								)}
							>
								{svc.label}
							</span>
							{active && (
								<CheckCircle2 className="w-5 h-5 text-indigo-500 ml-auto shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Step 3: Business Details ───
function Step3Details({
	data,
	setData,
}: {
	data: OnboardingData;
	setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
	const [logoName, setLogoName] = useState<string | null>(null);

	function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			setLogoName(file.name);
			setData((prev) => ({ ...prev, logoFile: file.name }));
		}
	}

	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
				Business Details
			</h2>
			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
				Tell us about your business so we can personalize your experience.
			</p>
			<div className="space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Business Name */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">Business Name</Label>
						<Input
							placeholder="Acme Inc."
							value={data.businessName}
							onChange={(e) =>
								setData((prev) => ({
									...prev,
									businessName: e.target.value,
								}))
							}
							className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
						/>
					</div>

					{/* Logo Upload */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">Upload Logo</Label>
						<label className="flex items-center gap-3 h-11 px-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-indigo-300 transition-colors">
							<Upload className="w-4 h-4 text-slate-400 dark:text-slate-500" />
							<span className="text-sm text-slate-500 dark:text-slate-400 truncate">
								{logoName || "Choose file..."}
							</span>
							<input
								type="file"
								accept="image/*"
								onChange={handleLogoChange}
								className="hidden"
							/>
						</label>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Country */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">
							<Globe className="w-3.5 h-3.5 inline mr-1" />
							Country
						</Label>
						<Select
							value={data.country}
							onValueChange={(v) =>
								setData((prev) => ({ ...prev, country: v }))
							}
						>
							<SelectTrigger className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
								<SelectValue placeholder="Select country" />
							</SelectTrigger>
							<SelectContent>
								{countries.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Currency */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">Default Currency</Label>
						<Select
							value={data.currency}
							onValueChange={(v) =>
								setData((prev) => ({ ...prev, currency: v }))
							}
						>
							<SelectTrigger className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
								<SelectValue placeholder="Select currency" />
							</SelectTrigger>
							<SelectContent>
								{currencies.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{/* Phone */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">
							<Phone className="w-3.5 h-3.5 inline mr-1" />
							Phone Number
						</Label>
						<Input
							placeholder="+1 234 567 8900"
							value={data.phone}
							onChange={(e) =>
								setData((prev) => ({
									...prev,
									phone: e.target.value,
								}))
							}
							className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
						/>
					</div>

					{/* Business Email */}
					<div className="space-y-1.5">
						<Label className="text-slate-700 dark:text-slate-300">
							<Mail className="w-3.5 h-3.5 inline mr-1" />
							Business Email
						</Label>
						<Input
							type="email"
							placeholder="hello@acme.com"
							value={data.businessEmail}
							onChange={(e) =>
								setData((prev) => ({
									...prev,
									businessEmail: e.target.value,
								}))
							}
							className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Step 4: Tax & Preferences ───
function Step4Tax({
	data,
	setData,
}: {
	data: OnboardingData;
	setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}) {
	const preset = getTaxPresetForCountry(data.country);

	function handleEnableTax() {
		if (preset) {
			setData((prev) => ({
				...prev,
				chargesTax: true,
				taxPercentage: String(preset.defaultRate),
			}));
		} else {
			setData((prev) => ({ ...prev, chargesTax: true }));
		}
	}

	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
				Tax & Preferences
			</h2>
			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
				Configure your tax and localization settings.
			</p>
			<div className="space-y-5">
				{/* Country Tax Preset Info */}
				{preset && (
					<div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 animate-fade-in">
						<Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
						<div>
							<p className="text-sm font-medium text-indigo-700">
								{data.country} Tax Preset Detected
							</p>
							<p className="text-xs text-indigo-600/70 mt-0.5">
								{preset.taxName} ({preset.taxType}) at {preset.defaultRate}% default rate. You can customize below.
							</p>
						</div>
					</div>
				)}

				{/* Tax toggle */}
				<div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
					<div className="flex-1">
						<p className="text-sm font-medium text-slate-700 dark:text-slate-300">
							Do you charge tax?
						</p>
						<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
							{preset ? `${preset.taxName} will be applied to invoices` : "Enable to configure tax settings on invoices"}
						</p>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleEnableTax}
							className={cn(
								"px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
								data.chargesTax
									? "bg-indigo-600 text-white shadow-md"
									: "bg-white dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-indigo-300",
							)}
						>
							Yes
						</button>
						<button
							type="button"
							onClick={() =>
								setData((prev) => ({
									...prev,
									chargesTax: false,
									taxPercentage: "",
								}))
							}
							className={cn(
								"px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
								!data.chargesTax
									? "bg-indigo-600 text-white shadow-md"
									: "bg-white dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:border-indigo-300",
							)}
						>
							No
						</button>
					</div>
				</div>

				{data.chargesTax && (
					<div className="space-y-1.5 animate-fade-in">
						<Label className="text-slate-700 dark:text-slate-300">
							{preset ? `${preset.taxName} Rate (%)` : "Tax Percentage (%)"}
						</Label>
						<Input
							type="number"
							placeholder="e.g. 15"
							value={data.taxPercentage}
							onChange={(e) =>
								setData((prev) => ({
									...prev,
									taxPercentage: e.target.value,
								}))
							}
							className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 max-w-xs"
						/>
					</div>
				)}

			</div>
		</div>
	);
}

// ─── Step 5: Confirmation ───
function Step5Confirm({ data }: { data: OnboardingData }) {
	const btLabel =
		businessTypes.find((b) => b.id === data.businessType)?.label || "—";
	const serviceLabels = data.services
		.map((s) => serviceOptions.find((o) => o.id === s)?.label)
		.filter(Boolean);

	const rows = [
		{ label: "Business Type", value: btLabel },
		{ label: "Services", value: serviceLabels.join(", ") || "—" },
		{ label: "Business Name", value: data.businessName || "—" },
		{ label: "Country", value: data.country || "—" },
		{ label: "Currency", value: data.currency || "—" },
		{ label: "Phone", value: data.phone || "—" },
		{ label: "Business Email", value: data.businessEmail || "—" },
		{
			label: "Tax",
			value: data.chargesTax
				? `Yes — ${data.taxPercentage || "0"}%`
				: "No",
		},
	];

	return (
		<div>
			<h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
				Confirm your setup
			</h2>
			<p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
				Review your information before generating your smart dashboard.
			</p>
			<div className="space-y-3">
				{rows.map((row) => (
					<div
						key={row.label}
						className="flex items-start justify-between py-2.5 px-4 rounded-lg bg-slate-50/60 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700"
					>
						<span className="text-sm font-medium text-slate-500 dark:text-slate-400">
							{row.label}
						</span>
						<span className="text-sm text-slate-800 dark:text-slate-300 text-right max-w-[60%]">
							{row.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
