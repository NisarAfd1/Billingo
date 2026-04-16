import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
	ArrowLeft,
	Settings,
	Globe,
	DollarSign,
	Receipt,
	Building2,
	Plus,
	Trash2,
	Pencil,
	Save,
	CheckCircle2,
	MapPin,
	User,
	Languages,
	Shield,
	Activity,
	Download,
	FileJson,
	FileSpreadsheet,
	AlertTriangle,
	Clock,
	XCircle,
	Moon,
	Sun,
	Monitor,
} from "lucide-react";
import { CURRENCIES, getBusinessCurrency, setBusinessCurrency, formatCurrency } from "@/lib/currency";
import { type TaxConfig, getTaxConfig, saveTaxConfig, getTaxPresetForCountry, TAX_PRESETS } from "@/lib/tax-engine";
import { type Locale, getLocale, setLocale, LOCALE_OPTIONS } from "@/lib/i18n";
import { type Branch, getBranches, saveBranch, updateBranch, deleteBranch } from "@/lib/branch-store";
import { type ActivityLogEntry, getActivityLogs, getActionLabel, getActionColor, clearActivityLogs } from "@/lib/activity-log";
import { type SecurityAlert, getActiveAlerts, dismissAlert, dismissAllAlerts, runAllFraudChecks } from "@/lib/fraud-engine";
import { exportFullBackupJSON, exportInvoicesCSV, exportClientsCSV, getBackupHistory, type BackupRecord } from "@/lib/backup";
import { type Theme, getTheme, setTheme } from "@/lib/dark-mode";
import { type UserRole, getUserRole, setUserRole } from "@/lib/security";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

type TabId = "currency" | "tax" | "language" | "branches" | "security" | "logs" | "backup" | "appearance";

function SettingsPage() {
	const navigate = useNavigate();
	const [userName, setUserName] = useState("User");
	const [activeTab, setActiveTab] = useState<TabId>("currency");

	// Currency state
	const [businessCurrency, setBusinessCurrencyState] = useState(getBusinessCurrency());

	// Tax state
	const [taxConfig, setTaxConfig] = useState<TaxConfig>(getTaxConfig());
	const [taxSaved, setTaxSaved] = useState(false);

	// Language state
	const [locale, setLocaleState] = useState<Locale>(getLocale());

	// Branch state
	const [branches, setBranches] = useState<Branch[]>(getBranches());
	const [showAddBranch, setShowAddBranch] = useState(false);
	const [editBranch, setEditBranch] = useState<Branch | null>(null);
	const [branchForm, setBranchForm] = useState({ branchName: "", location: "", manager: "" });
	const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);

	// Activity log state
	const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

	// Security alerts state
	const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

	// Backup state
	const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);

	// Appearance state
	const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme());

	// Role state
	const [currentRole, setCurrentRole] = useState<UserRole>(getUserRole());

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

		// Load data for new tabs
		setActivityLogs(getActivityLogs());
		runAllFraudChecks();
		setAlerts(getActiveAlerts());
		setBackupHistory(getBackupHistory());
	}, [navigate]);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

	// ── Currency Handlers ──
	function handleCurrencyChange(code: string) {
		setBusinessCurrencyState(code);
		setBusinessCurrency(code);
	}

	// ── Tax Handlers ──
	function handleCountryChange(country: string) {
		const preset = getTaxPresetForCountry(country);
		if (preset) {
			setTaxConfig((prev) => ({
				...prev,
				country,
				taxName: preset.taxName,
				taxRate: preset.defaultRate,
				taxType: preset.taxType,
			}));
		} else {
			setTaxConfig((prev) => ({ ...prev, country }));
		}
	}

	function handleSaveTax() {
		saveTaxConfig(taxConfig);
		try {
			const onboarding = localStorage.getItem("billingo_onboarding");
			if (onboarding) {
				const data = JSON.parse(onboarding);
				data.chargesTax = taxConfig.enabled;
				data.taxPercentage = String(taxConfig.taxRate);
				data.country = taxConfig.country;
				localStorage.setItem("billingo_onboarding", JSON.stringify(data));
			}
		} catch {
			// ignore
		}
		setTaxSaved(true);
		setTimeout(() => setTaxSaved(false), 2000);
	}

	// ── Language Handlers ──
	function handleLocaleChange(loc: Locale) {
		setLocaleState(loc);
		setLocale(loc);
	}

	// ── Branch Handlers ──
	function handleAddBranch() {
		if (!branchForm.branchName.trim()) return;
		saveBranch({
			branchName: branchForm.branchName.trim(),
			location: branchForm.location.trim(),
			manager: branchForm.manager.trim(),
		});
		setBranches(getBranches());
		setBranchForm({ branchName: "", location: "", manager: "" });
		setShowAddBranch(false);
	}

	function handleStartEditBranch(branch: Branch) {
		setEditBranch(branch);
		setBranchForm({
			branchName: branch.branchName,
			location: branch.location,
			manager: branch.manager,
		});
	}

	function handleSaveEditBranch() {
		if (!editBranch || !branchForm.branchName.trim()) return;
		updateBranch(editBranch.branchId, {
			branchName: branchForm.branchName.trim(),
			location: branchForm.location.trim(),
			manager: branchForm.manager.trim(),
		});
		setBranches(getBranches());
		setEditBranch(null);
		setBranchForm({ branchName: "", location: "", manager: "" });
	}

	function handleDeleteBranch(branchId: string) {
		deleteBranch(branchId);
		setBranches(getBranches());
		setDeleteBranchId(null);
	}

	// ── Theme Handlers ──
	function handleThemeChange(theme: Theme) {
		setCurrentTheme(theme);
		setTheme(theme);
	}

	// ── Role Handlers ──
	function handleRoleChange(role: UserRole) {
		setCurrentRole(role);
		setUserRole(role);
	}

	const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
		{ id: "currency", label: "Currency", icon: DollarSign },
		{ id: "tax", label: "Tax", icon: Receipt },
		{ id: "language", label: "Language", icon: Languages },
		{ id: "branches", label: "Branches", icon: Building2 },
		{ id: "security", label: "Security", icon: Shield },
		{ id: "logs", label: "Activity Logs", icon: Activity },
		{ id: "backup", label: "Backup", icon: Download },
		{ id: "appearance", label: "Appearance", icon: Moon },
	];

	const currencyEntries = Object.values(CURRENCIES);

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
								className="rounded-lg border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 gap-1.5"
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
								Settings
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

			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Page heading */}
				<div className="flex items-center gap-3 mb-8 animate-fade-in-up">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
							<Settings className="w-7 h-7 text-indigo-600" />
							Settings
						</h1>
						<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
							Configure your global billing infrastructure.
						</p>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up animation-delay-100">
					{tabs.map((tab) => (
						<Button
							key={tab.id}
							variant={activeTab === tab.id ? "default" : "outline"}
							size="sm"
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"rounded-full transition-all duration-300",
								activeTab === tab.id
									? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/25"
									: "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
							)}
						>
							<tab.icon className="w-3.5 h-3.5 mr-1.5" />
							{tab.label}
						</Button>
					))}
				</div>

				{/* Currency Tab */}
				{activeTab === "currency" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
										<DollarSign className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Business Currency</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Default currency for your invoices</p>
									</div>
								</div>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Currency</Label>
										<Select value={businessCurrency} onValueChange={handleCurrencyChange}>
											<SelectTrigger className="h-11 w-full max-w-md rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
												<SelectValue placeholder="Select currency" />
											</SelectTrigger>
											<SelectContent>
												{currencyEntries.map((c) => (
													<SelectItem key={c.code} value={c.code}>
														{c.symbol} {c.code} - {c.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
										<p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Preview</p>
										<p className="text-2xl font-bold text-slate-900 dark:text-white">
											{formatCurrency(25000, businessCurrency)}
										</p>
									</div>
									<div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
										<p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-1">Exchange Rates</p>
										<p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
											Placeholder rates are loaded. Connect a real exchange rate API for live conversion.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Tax Tab */}
				{activeTab === "tax" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
										<Receipt className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Tax Configuration</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Set up country-based tax rules</p>
									</div>
								</div>
								<div className="space-y-5">
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
											<Globe className="w-3.5 h-3.5 inline mr-1" />
											Country
										</Label>
										<Select value={taxConfig.country} onValueChange={handleCountryChange}>
											<SelectTrigger className="h-11 w-full max-w-md rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
												<SelectValue placeholder="Select country" />
											</SelectTrigger>
											<SelectContent>
												{Object.keys(TAX_PRESETS).sort().map((country) => (
													<SelectItem key={country} value={country}>{country}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
										<div className="flex-1">
											<p className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Tax</p>
											<p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Apply tax to invoices</p>
										</div>
										<div className="flex gap-2">
											<button type="button" onClick={() => setTaxConfig((prev) => ({ ...prev, enabled: true }))} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", taxConfig.enabled ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-indigo-300")}>Yes</button>
											<button type="button" onClick={() => setTaxConfig((prev) => ({ ...prev, enabled: false }))} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", !taxConfig.enabled ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-indigo-300")}>No</button>
										</div>
									</div>
									{taxConfig.enabled && (
										<div className="space-y-4 animate-fade-in">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Name</Label>
													<Input value={taxConfig.taxName} onChange={(e) => setTaxConfig((prev) => ({ ...prev, taxName: e.target.value }))} placeholder="e.g. GST, VAT, Sales Tax" className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
												</div>
												<div className="space-y-2">
													<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Rate (%)</Label>
													<Input type="number" value={String(taxConfig.taxRate)} onChange={(e) => setTaxConfig((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 18" className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
												</div>
											</div>
											<div className="space-y-2">
												<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Type</Label>
												<Select value={taxConfig.taxType} onValueChange={(v) => setTaxConfig((prev) => ({ ...prev, taxType: v }))}>
													<SelectTrigger className="h-11 w-full max-w-md rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600"><SelectValue /></SelectTrigger>
													<SelectContent>
														<SelectItem value="GST">GST</SelectItem>
														<SelectItem value="VAT">VAT</SelectItem>
														<SelectItem value="Sales Tax">Sales Tax</SelectItem>
														<SelectItem value="Custom">Custom</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
									)}
									<div className="flex items-center gap-3">
										<Button onClick={handleSaveTax} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90">
											<Save className="w-4 h-4 mr-1.5" />
											Save Tax Settings
										</Button>
										{taxSaved && (
											<span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
												<CheckCircle2 className="w-4 h-4" />Saved
											</span>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Language Tab */}
				{activeTab === "language" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
										<Languages className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Language</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Select your preferred interface language</p>
									</div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									{LOCALE_OPTIONS.map((opt) => (
										<button key={opt.value} type="button" onClick={() => handleLocaleChange(opt.value)} className={cn("flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer text-center", locale === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md shadow-indigo-100 dark:shadow-none" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5")}>
											<div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300", locale === opt.value ? "bg-gradient-to-br from-indigo-500 to-cyan-500 scale-110" : "bg-slate-100 dark:bg-slate-700")}>
												<Globe className={cn("w-6 h-6 transition-colors", locale === opt.value ? "text-white" : "text-slate-500 dark:text-slate-400")} />
											</div>
											<span className={cn("text-sm font-medium", locale === opt.value ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>{opt.label}</span>
											<span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.nativeLabel}</span>
											{locale === opt.value && <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-2" />}
										</button>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Branches Tab */}
				{activeTab === "branches" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-5">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
											<Building2 className="w-4 h-4 text-white" />
										</div>
										<div>
											<h3 className="text-base font-semibold text-slate-900 dark:text-white">Branch Management</h3>
											<p className="text-xs text-slate-500 dark:text-slate-400">Manage your business branches</p>
										</div>
									</div>
									<Button onClick={() => { setBranchForm({ branchName: "", location: "", manager: "" }); setShowAddBranch(true); }} size="sm" className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-semibold shadow-md shadow-indigo-500/25 hover:opacity-90">
										<Plus className="w-3.5 h-3.5 mr-1" />Add Branch
									</Button>
								</div>
								{branches.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-12 text-center">
										<div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
											<Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500" />
										</div>
										<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No branches yet</h3>
										<p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create branches to organize your business locations.</p>
										<Button onClick={() => setShowAddBranch(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
											<Plus className="w-4 h-4 mr-2" />Add First Branch
										</Button>
									</div>
								) : (
									<div className="space-y-3">
										{branches.map((branch) => (
											<div key={branch.branchId} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-300 group">
												<div className="flex items-center gap-4">
													<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
														<Building2 className="w-5 h-5 text-white" />
													</div>
													<div>
														<p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.branchName}</p>
														<div className="flex items-center gap-3 mt-0.5">
															{branch.location && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{branch.location}</span>}
															{branch.manager && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><User className="w-3 h-3" />{branch.manager}</span>}
														</div>
													</div>
												</div>
												<div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
													<Button variant="outline" size="sm" onClick={() => handleStartEditBranch(branch)} className="rounded-lg border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs">
														<Pencil className="w-3 h-3 mr-1" />Edit
													</Button>
													<Button variant="outline" size="sm" onClick={() => setDeleteBranchId(branch.branchId)} className="rounded-lg border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 text-xs">
														<Trash2 className="w-3 h-3 mr-1" />Delete
													</Button>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Security Tab */}
				{activeTab === "security" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						{/* Role Management */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
										<Shield className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Role-Based Access</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Manage user role and permissions</p>
									</div>
								</div>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Role</Label>
										<Select value={currentRole} onValueChange={(v) => handleRoleChange(v as UserRole)}>
											<SelectTrigger className="h-11 w-full max-w-md rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="owner">Owner - Full access</SelectItem>
												<SelectItem value="manager">Manager - Limited admin</SelectItem>
												<SelectItem value="staff">Staff - Basic access</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
										<p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">Permissions for {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}</p>
										<div className="grid grid-cols-2 gap-2">
											{[
												{ label: "Manage Users", key: currentRole === "owner" },
												{ label: "Manage Settings", key: currentRole !== "staff" },
												{ label: "Delete Invoices", key: currentRole !== "staff" },
												{ label: "View Analytics", key: currentRole !== "staff" },
												{ label: "Export Data", key: currentRole !== "staff" },
												{ label: "Upgrade Plan", key: currentRole === "owner" },
											].map((perm) => (
												<div key={perm.label} className="flex items-center gap-2 text-xs">
													{perm.key ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
													<span className={perm.key ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"}>{perm.label}</span>
												</div>
											))}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Security Alerts */}
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-5">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
											<AlertTriangle className="w-4 h-4 text-white" />
										</div>
										<div>
											<h3 className="text-base font-semibold text-slate-900 dark:text-white">Security Alerts</h3>
											<p className="text-xs text-slate-500 dark:text-slate-400">{alerts.length} active alert{alerts.length !== 1 ? "s" : ""}</p>
										</div>
									</div>
									{alerts.length > 0 && (
										<Button variant="outline" size="sm" onClick={() => { dismissAllAlerts(); setAlerts([]); }} className="rounded-lg text-xs border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
											Dismiss All
										</Button>
									)}
								</div>
								{alerts.length === 0 ? (
									<div className="text-center py-8">
										<CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
										<p className="text-sm font-medium text-slate-700 dark:text-slate-300">All Clear</p>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No active security alerts detected.</p>
									</div>
								) : (
									<div className="space-y-3">
										{alerts.slice(0, 10).map((alert) => (
											<div key={alert.id} className={cn("flex items-start justify-between p-3 rounded-xl border", alert.severity === "critical" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : alert.severity === "warning" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800")}>
												<div className="flex items-start gap-3 flex-1 min-w-0">
													<AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", alert.severity === "critical" ? "text-red-500" : alert.severity === "warning" ? "text-amber-500" : "text-blue-500")} />
													<div className="min-w-0">
														<p className="text-sm font-medium text-slate-900 dark:text-white">{alert.title}</p>
														<p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{alert.description}</p>
														<p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
													</div>
												</div>
												<Button variant="ghost" size="sm" onClick={() => { dismissAlert(alert.id); setAlerts(getActiveAlerts()); }} className="shrink-0 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
													Dismiss
												</Button>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Activity Logs Tab */}
				{activeTab === "logs" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-5">
									<div className="flex items-center gap-3">
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
											<Activity className="w-4 h-4 text-white" />
										</div>
										<div>
											<h3 className="text-base font-semibold text-slate-900 dark:text-white">Activity Logs</h3>
											<p className="text-xs text-slate-500 dark:text-slate-400">{activityLogs.length} total entries</p>
										</div>
									</div>
									{activityLogs.length > 0 && (
										<Button variant="outline" size="sm" onClick={() => { clearActivityLogs(); setActivityLogs([]); }} className="rounded-lg text-xs border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
											<Trash2 className="w-3 h-3 mr-1" />Clear Logs
										</Button>
									)}
								</div>
								{activityLogs.length === 0 ? (
									<div className="text-center py-8">
										<Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
										<p className="text-sm font-medium text-slate-700 dark:text-slate-300">No Activity Yet</p>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Actions will be logged here automatically.</p>
									</div>
								) : (
									<div className="space-y-2 max-h-[500px] overflow-y-auto">
										{activityLogs.slice(0, 50).map((log) => (
											<div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/80 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
												<div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", getActionColor(log.actionType).replace("text-", "bg-"))} />
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{getActionLabel(log.actionType)}</span>
														<span className="text-xs text-slate-400 dark:text-slate-500">
															<Clock className="w-3 h-3 inline mr-0.5" />
															{new Date(log.timestamp).toLocaleString()}
														</span>
													</div>
													<p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{log.description}</p>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Backup Tab */}
				{activeTab === "backup" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
										<Download className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Data Backup & Export</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Export your data for backup or migration</p>
									</div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
									<button type="button" onClick={() => { exportFullBackupJSON(); setBackupHistory(getBackupHistory()); }} className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
											<FileJson className="w-6 h-6 text-white" />
										</div>
										<div className="text-center">
											<p className="text-sm font-semibold text-slate-900 dark:text-white">Full Backup (JSON)</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All data including settings</p>
										</div>
									</button>
									<button type="button" onClick={() => { exportInvoicesCSV(); setBackupHistory(getBackupHistory()); }} className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
											<FileSpreadsheet className="w-6 h-6 text-white" />
										</div>
										<div className="text-center">
											<p className="text-sm font-semibold text-slate-900 dark:text-white">Invoices (CSV)</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Export invoices spreadsheet</p>
										</div>
									</button>
									<button type="button" onClick={() => { exportClientsCSV(); setBackupHistory(getBackupHistory()); }} className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
											<FileSpreadsheet className="w-6 h-6 text-white" />
										</div>
										<div className="text-center">
											<p className="text-sm font-semibold text-slate-900 dark:text-white">Clients (CSV)</p>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Export clients spreadsheet</p>
										</div>
									</button>
								</div>
								{/* Backup History */}
								{backupHistory.length > 0 && (
									<div>
										<p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Recent Backups</p>
										<div className="space-y-2">
											{backupHistory.slice(0, 10).map((bkp) => (
												<div key={bkp.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
													<div className="flex items-center gap-3">
														{bkp.format === "json" ? <FileJson className="w-4 h-4 text-indigo-500" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
														<div>
															<p className="text-sm font-medium text-slate-700 dark:text-slate-300">{bkp.type === "full" ? "Full Backup" : bkp.type === "invoices" ? "Invoices Export" : "Clients Export"} ({bkp.format.toUpperCase()})</p>
															<p className="text-xs text-slate-400 dark:text-slate-500">{bkp.recordCount} records</p>
														</div>
													</div>
													<p className="text-xs text-slate-400 dark:text-slate-500">{new Date(bkp.timestamp).toLocaleString()}</p>
												</div>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Appearance Tab */}
				{activeTab === "appearance" && (
					<div className="space-y-6 animate-fade-in-up animation-delay-200">
						<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
							<CardContent className="p-6">
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
										<Moon className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 dark:text-white">Theme</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred appearance</p>
									</div>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									{([
										{ value: "light" as Theme, label: "Light", icon: Sun, desc: "Light background" },
										{ value: "dark" as Theme, label: "Dark", icon: Moon, desc: "Dark background" },
										{ value: "system" as Theme, label: "System", icon: Monitor, desc: "Match OS setting" },
									]).map((opt) => (
										<button key={opt.value} type="button" onClick={() => handleThemeChange(opt.value)} className={cn("flex flex-col items-center p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer text-center", currentTheme === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md shadow-indigo-100 dark:shadow-none" : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5")}>
											<div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-300", currentTheme === opt.value ? "bg-gradient-to-br from-indigo-500 to-cyan-500 scale-110" : "bg-slate-100 dark:bg-slate-700")}>
												<opt.icon className={cn("w-6 h-6 transition-colors", currentTheme === opt.value ? "text-white" : "text-slate-500 dark:text-slate-400")} />
											</div>
											<span className={cn("text-sm font-medium", currentTheme === opt.value ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300")}>{opt.label}</span>
											<span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</span>
											{currentTheme === opt.value && <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-2" />}
										</button>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</main>

			{/* Add Branch Dialog */}
			<Dialog open={showAddBranch} onOpenChange={setShowAddBranch}>
				<DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
							<Building2 className="w-5 h-5 text-indigo-600" />
							Add New Branch
						</DialogTitle>
						<DialogDescription className="text-slate-500 dark:text-slate-400">Create a new branch for your business.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch Name *</Label>
							<Input placeholder="e.g. Main Office" value={branchForm.branchName} onChange={(e) => setBranchForm((prev) => ({ ...prev, branchName: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</Label>
							<Input placeholder="e.g. 123 Business Ave, City" value={branchForm.location} onChange={(e) => setBranchForm((prev) => ({ ...prev, location: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Manager</Label>
							<Input placeholder="e.g. John Doe" value={branchForm.manager} onChange={(e) => setBranchForm((prev) => ({ ...prev, manager: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowAddBranch(false)} className="rounded-xl border-slate-200 dark:border-slate-600">Cancel</Button>
						<Button onClick={handleAddBranch} disabled={!branchForm.branchName.trim()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							<Plus className="w-4 h-4 mr-1" />Add Branch
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Branch Dialog */}
			<Dialog open={editBranch !== null} onOpenChange={(open) => { if (!open) setEditBranch(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
							<Pencil className="w-5 h-5 text-indigo-600" />
							Edit Branch
						</DialogTitle>
						<DialogDescription className="text-slate-500 dark:text-slate-400">Update branch details.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Branch Name *</Label>
							<Input value={branchForm.branchName} onChange={(e) => setBranchForm((prev) => ({ ...prev, branchName: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location</Label>
							<Input value={branchForm.location} onChange={(e) => setBranchForm((prev) => ({ ...prev, location: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Manager</Label>
							<Input value={branchForm.manager} onChange={(e) => setBranchForm((prev) => ({ ...prev, manager: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-600" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditBranch(null)} className="rounded-xl border-slate-200 dark:border-slate-600">Cancel</Button>
						<Button onClick={handleSaveEditBranch} disabled={!branchForm.branchName.trim()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90">
							<Save className="w-4 h-4 mr-1" />Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Branch Confirmation */}
			<Dialog open={deleteBranchId !== null} onOpenChange={(open) => { if (!open) setDeleteBranchId(null); }}>
				<DialogContent className="sm:max-w-md rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
							<Trash2 className="w-5 h-5" />
							Delete Branch
						</DialogTitle>
						<DialogDescription className="text-slate-500 dark:text-slate-400">Are you sure you want to delete this branch? This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setDeleteBranchId(null)} className="rounded-xl border-slate-200 dark:border-slate-600">Cancel</Button>
						<Button onClick={() => deleteBranchId && handleDeleteBranch(deleteBranchId)} className="rounded-xl bg-red-600 text-white hover:bg-red-700">
							<Trash2 className="w-4 h-4 mr-1" />Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
