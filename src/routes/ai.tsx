import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	Zap,
	Bot,
	LogOut,
	Send,
	Sparkles,
	TrendingUp,
	AlertTriangle,
	CheckCircle2,
	DollarSign,
	Users,
	Info,
	Calendar,
	Copy,
	Mail,
	ArrowLeft,
	Brain,
	BarChart3,
	Shield,
	Heart,
	Loader2,
	FileText,
	Clock,
	Target,
	Activity,
} from "lucide-react";
import {
	type ParseResult,
	type ParsedInvoice,
	type AIInsight,
	type PaymentReminder,
	type RevenueForecast,
	type HealthScore,
	parseNaturalLanguage,
	executeInvoiceFromParsed,
	generateInsights,
	generatePaymentReminders,
	generateRevenueForecast,
	calculateHealthScore,
} from "@/lib/ai-engine";
import { getUserProfile, getCurrencySymbol } from "@/lib/billing-store";

export const Route = createFileRoute("/ai")({
	component: AIPage,
});

// ══════════════════════════════════════════════════
// Main AI Page
// ══════════════════════════════════════════════════

function AIPage() {
	const navigate = useNavigate();
	const [userName, setUserName] = useState("User");

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
	}, [navigate]);

	function handleLogout() {
		localStorage.removeItem("billingo_auth");
		navigate({ to: "/login" });
	}

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
							<Link
								to="/dashboard"
								className="flex items-center gap-2 group"
							>
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
									<Zap className="w-4 h-4 text-white" />
								</div>
								<span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
									Billingo
								</span>
							</Link>
							<span className="hidden sm:inline text-sm text-slate-400 dark:text-slate-500">
								/
							</span>
							<span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
								AI Assistant
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
				{/* Page Header */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-up">
					<div className="flex items-center gap-3">
						<div>
							<div className="flex items-center gap-2">
								<h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
									Billingo AI Assistant
								</h1>
								<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
							</div>
							<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
								AI-powered tools to automate invoicing, gain insights,
								and optimize your business.
							</p>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<Tabs defaultValue="command" className="animate-fade-in-up animation-delay-100">
					<TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1 bg-slate-100 dark:bg-slate-700 rounded-xl mb-8">
						<TabsTrigger
							value="command"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<Bot className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Command
						</TabsTrigger>
						<TabsTrigger
							value="insights"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<Sparkles className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Insights
						</TabsTrigger>
						<TabsTrigger
							value="reminders"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<Mail className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Reminders
						</TabsTrigger>
						<TabsTrigger
							value="forecast"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<BarChart3 className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Forecast
						</TabsTrigger>
						<TabsTrigger
							value="health"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<Heart className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Health
						</TabsTrigger>
						<TabsTrigger
							value="overview"
							className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm"
						>
							<Activity className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
							Overview
						</TabsTrigger>
					</TabsList>

					<TabsContent value="command">
						<AICommandCenter />
					</TabsContent>
					<TabsContent value="insights">
						<AIInsightsPanel />
					</TabsContent>
					<TabsContent value="reminders">
						<PaymentRemindersPanel />
					</TabsContent>
					<TabsContent value="forecast">
						<RevenueForecastPanel />
					</TabsContent>
					<TabsContent value="health">
						<HealthScorePanel />
					</TabsContent>
					<TabsContent value="overview">
						<AIOverview />
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

// ══════════════════════════════════════════════════
// PART 1: AI Command Center
// ══════════════════════════════════════════════════

function AICommandCenter() {
	const [input, setInput] = useState("");
	const [processing, setProcessing] = useState(false);
	const [processingMsg, setProcessingMsg] = useState("");
	const [result, setResult] = useState<ParseResult | null>(null);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [invoiceCreated, setInvoiceCreated] = useState(false);
	const [createdData, setCreatedData] = useState<{
		invoiceNumber: string;
		clientName: string;
		clientCreated: boolean;
		amount: string;
	} | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const profile = getUserProfile();
	const sym = getCurrencySymbol(profile.currency);

	const processingMessages = [
		"Analyzing your request...",
		"Extracting invoice details...",
		"Identifying client information...",
		"Calculating amounts...",
		"Preparing invoice draft...",
	];

	function handleSubmit() {
		if (!input.trim() || processing) return;

		setProcessing(true);
		setResult(null);
		setShowConfirmation(false);
		setInvoiceCreated(false);

		let msgIdx = 0;
		setProcessingMsg(processingMessages[0]);
		const msgInterval = setInterval(() => {
			msgIdx++;
			if (msgIdx < processingMessages.length) {
				setProcessingMsg(processingMessages[msgIdx]);
			}
		}, 400);

		setTimeout(() => {
			clearInterval(msgInterval);
			const parsed = parseNaturalLanguage(input);
			setResult(parsed);
			setProcessing(false);

			if (parsed.success) {
				setShowConfirmation(true);
			}
		}, 2000);
	}

	function handleConfirm() {
		if (!result?.parsed) return;

		const { invoice, clientCreated, client } = executeInvoiceFromParsed(
			result.parsed,
		);
		setCreatedData({
			invoiceNumber: invoice.invoiceNumber,
			clientName: client.name,
			clientCreated,
			amount: `${sym}${invoice.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
		});
		setInvoiceCreated(true);
		setShowConfirmation(false);
	}

	function handleReset() {
		setInput("");
		setResult(null);
		setShowConfirmation(false);
		setInvoiceCreated(false);
		setCreatedData(null);
		inputRef.current?.focus();
	}

	const examples = [
		"Create invoice for Ali - 3 logo designs - 20,000 PKR - due in 7 days",
		"Bill Ahmed for website development - $5,000 - due next month",
		"Invoice Sara - 10 hours consulting - 50,000 Rs - due in 14 days",
		"Create invoice for TechCorp - 1 app development - 200,000 PKR",
	];

	return (
		<div className="space-y-6">
			{/* Command Input */}
			<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
				<div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 p-6 sm:p-8">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
							<Bot className="w-5 h-5 text-white" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-white">
								AI Command Center
							</h2>
							<p className="text-white/70 text-sm">
								Create invoices using natural language
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						<Input
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
							placeholder="Create invoice for Ali - 3 logo designs - 20,000 PKR - due in 7 days"
							className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40"
							disabled={processing}
						/>
						<Button
							onClick={handleSubmit}
							disabled={processing || !input.trim()}
							className="h-12 px-6 rounded-xl bg-white text-indigo-700 font-semibold hover:bg-white/90 shadow-lg"
						>
							{processing ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Send className="w-4 h-4" />
							)}
						</Button>
					</div>

					{/* Example commands */}
					<div className="mt-4 flex flex-wrap gap-2">
						{examples.map((ex) => (
							<button
								key={ex}
								onClick={() => setInput(ex)}
								className="text-xs text-white/60 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 hover:text-white/80 transition-all"
							>
								{ex.length > 45 ? `${ex.slice(0, 45)}...` : ex}
							</button>
						))}
					</div>
				</div>

				<CardContent className="p-6">
					{/* Processing State */}
					{processing && (
						<div className="flex flex-col items-center py-8 animate-fade-in">
							<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 animate-pulse">
								<Brain className="w-8 h-8 text-white" />
							</div>
							<p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
								{processingMsg}
							</p>
							<div className="w-48">
								<Progress
									value={undefined}
									className="h-1.5 bg-slate-100 dark:bg-slate-700 [&>div]:animate-ai-progress [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-cyan-500"
								/>
							</div>
						</div>
					)}

					{/* Error State */}
					{result && !result.success && (
						<div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-slate-700 animate-fade-in-up">
							<AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
							<div>
								<p className="text-sm font-medium text-red-800">
									Could not parse request
								</p>
								<p className="text-sm text-red-600 mt-1">
									{result.error}
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={handleReset}
									className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
								>
									Try Again
								</Button>
							</div>
						</div>
					)}

					{/* Confirmation Modal */}
					{showConfirmation && result?.parsed && (
						<div className="animate-fade-in-up">
							<div className="flex items-center gap-2 mb-4">
								<CheckCircle2 className="w-5 h-5 text-emerald-500" />
								<h3 className="text-base font-semibold text-slate-900 dark:text-white">
									Invoice Draft Preview
								</h3>
							</div>

							<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 mb-4 space-y-3">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
											Client
										</p>
										<p className="text-sm font-medium text-slate-900 dark:text-white">
											{result.parsed.clientName}
										</p>
									</div>
									<div>
										<p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
											Due Date
										</p>
										<p className="text-sm font-medium text-slate-900 dark:text-white">
											{new Date(
												result.parsed.dueDate,
											).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}
										</p>
									</div>
								</div>

								<div className="border-t border-slate-200 dark:border-slate-600 pt-3">
									<p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
										Items
									</p>
									{result.parsed.items.map((item, i) => (
										<div
											key={i}
											className="flex items-center justify-between py-1.5"
										>
											<div className="text-sm text-slate-700 dark:text-slate-300">
												{item.description}{" "}
												<span className="text-slate-400 dark:text-slate-500">
													x{item.quantity}
												</span>
											</div>
											<div className="text-sm font-medium text-slate-900 dark:text-white">
												{sym}
												{(
													item.quantity * item.price
												).toLocaleString("en-US", {
													minimumFractionDigits: 2,
												})}
											</div>
										</div>
									))}
								</div>

								<div className="border-t border-slate-200 dark:border-slate-600 pt-3 flex justify-between">
									<p className="text-sm font-semibold text-slate-900 dark:text-white">
										Total
									</p>
									<p className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
										{sym}
										{result.parsed.totalAmount.toLocaleString(
											"en-US",
											{ minimumFractionDigits: 2 },
										)}
									</p>
								</div>
							</div>

							<div className="flex gap-3">
								<Button
									onClick={handleConfirm}
									className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:opacity-90"
								>
									<CheckCircle2 className="w-4 h-4 mr-2" />
									Confirm & Create
								</Button>
								<Button
									variant="outline"
									onClick={handleReset}
									className="rounded-xl"
								>
									Cancel
								</Button>
							</div>
						</div>
					)}

					{/* Success State */}
					{invoiceCreated && createdData && (
						<div className="text-center py-6 animate-fade-in-up">
							<div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 animate-scale-in">
								<CheckCircle2 className="w-8 h-8 text-white" />
							</div>
							<h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
								Invoice Draft Created Successfully!
							</h3>
							<p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
								{createdData.invoiceNumber} for{" "}
								{createdData.clientName} — {createdData.amount}
							</p>
							{createdData.clientCreated && (
								<p className="text-xs text-indigo-600 mb-4">
									New client profile auto-created for{" "}
									{createdData.clientName}
								</p>
							)}
							<div className="flex justify-center gap-3 mt-4">
								<Link to="/invoices">
									<Button
										variant="outline"
										className="rounded-xl"
									>
										<FileText className="w-4 h-4 mr-2" />
										View Invoices
									</Button>
								</Link>
								<Button
									onClick={handleReset}
									className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white hover:opacity-90"
								>
									<Bot className="w-4 h-4 mr-2" />
									Create Another
								</Button>
							</div>
						</div>
					)}

					{/* Idle State */}
					{!processing && !result && !invoiceCreated && (
						<div className="text-center py-8 text-slate-400 dark:text-slate-500">
							<Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
							<p className="text-sm">
								Type a command above to create invoices with
								natural language
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ══════════════════════════════════════════════════
// PART 3: AI Insights Panel
// ══════════════════════════════════════════════════

function AIInsightsPanel() {
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setInsights(generateInsights());
			setLoading(false);
		}, 800);
		return () => clearTimeout(timer);
	}, []);

	const insightIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
		"trending-up": TrendingUp,
		alert: AlertTriangle,
		info: Info,
		users: Users,
		dollar: DollarSign,
		calendar: Calendar,
	};

	const typeStyles: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
		positive: {
			bg: "bg-emerald-50/80 dark:bg-emerald-900/20",
			border: "border-emerald-100 dark:border-slate-700",
			icon: "text-emerald-500",
			badge: "bg-emerald-100 text-emerald-700",
		},
		warning: {
			bg: "bg-amber-50/80 dark:bg-amber-900/20",
			border: "border-amber-100 dark:border-slate-700",
			icon: "text-amber-500",
			badge: "bg-amber-100 text-amber-700",
		},
		info: {
			bg: "bg-blue-50/80",
			border: "border-blue-100 dark:border-slate-700",
			icon: "text-blue-500",
			badge: "bg-blue-100 text-blue-700",
		},
		action: {
			bg: "bg-purple-50/80",
			border: "border-purple-100 dark:border-slate-700",
			icon: "text-purple-500",
			badge: "bg-purple-100 text-purple-700",
		},
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center py-16 animate-fade-in">
				<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 animate-pulse">
					<Sparkles className="w-7 h-7 text-white" />
				</div>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Generating AI insights...
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
					<Sparkles className="w-4 h-4 text-white" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">
						AI Financial Insights
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Automated analysis of your business data
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{insights.map((insight, i) => {
					const style = typeStyles[insight.type] || typeStyles.info;
					const IconComp = insightIconMap[insight.icon] || Info;
					return (
						<Card
							key={insight.id}
							className={cn(
								"border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up",
								style.border,
							)}
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<CardContent
								className={cn("p-5", style.bg)}
							>
								<div className="flex items-start gap-3">
									<div
										className={cn(
											"w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
											style.badge,
										)}
									>
										<IconComp className="w-5 h-5" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
												{insight.title}
											</h3>
											<span
												className={cn(
													"text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
													style.badge,
												)}
											>
												{insight.type}
											</span>
										</div>
										<p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
											{insight.description}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{insights.length === 0 && (
				<div className="text-center py-12">
					<Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Create invoices to generate business insights
					</p>
				</div>
			)}
		</div>
	);
}

// ══════════════════════════════════════════════════
// PART 4: Payment Reminders Panel
// ══════════════════════════════════════════════════

function PaymentRemindersPanel() {
	const [reminders, setReminders] = useState<PaymentReminder[]>([]);
	const [loading, setLoading] = useState(true);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [sentId, setSentId] = useState<string | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			setReminders(generatePaymentReminders());
			setLoading(false);
		}, 600);
		return () => clearTimeout(timer);
	}, []);

	const handleCopy = useCallback(async (reminder: PaymentReminder) => {
		try {
			await navigator.clipboard.writeText(reminder.message);
			setCopiedId(reminder.invoiceId);
			setTimeout(() => setCopiedId(null), 2000);
		} catch {
			// Fallback copy
			const textarea = document.createElement("textarea");
			textarea.value = reminder.message;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			setCopiedId(reminder.invoiceId);
			setTimeout(() => setCopiedId(null), 2000);
		}
	}, []);

	function handleSendEmail(reminder: PaymentReminder) {
		setSentId(reminder.invoiceId);
		setTimeout(() => setSentId(null), 3000);
	}

	if (loading) {
		return (
			<div className="flex flex-col items-center py-16 animate-fade-in">
				<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 animate-pulse">
					<Mail className="w-7 h-7 text-white" />
				</div>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Generating payment reminders...
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
					<Mail className="w-4 h-4 text-white" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">
						Smart Payment Reminders
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Auto-generated reminders for overdue invoices
					</p>
				</div>
			</div>

			{reminders.length === 0 ? (
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800">
					<CardContent className="p-8 text-center">
						<CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
						<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
							All Caught Up!
						</h3>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							No overdue invoices found. All payments are on track.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{reminders.map((reminder, i) => (
						<Card
							key={reminder.invoiceId}
							className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<CardContent className="p-5">
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
											<Clock className="w-5 h-5 text-red-500" />
										</div>
										<div>
											<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
												{reminder.invoiceNumber} —{" "}
												{reminder.clientName}
											</h3>
											<div className="flex flex-wrap items-center gap-2 mt-1">
												<span className="text-xs text-slate-500 dark:text-slate-400">
													Amount: {reminder.amount}
												</span>
												<span className="text-xs text-slate-300 dark:text-slate-600">
													|
												</span>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													Due: {reminder.dueDate}
												</span>
												<span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 font-medium">
													{reminder.daysOverdue} days
													overdue
												</span>
											</div>
										</div>
									</div>
								</div>

								<div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
									<Textarea
										value={reminder.message}
										readOnly
										className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed resize-none min-h-[120px] p-0 focus-visible:ring-0"
									/>
								</div>

								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleCopy(reminder)}
										className={cn(
											"rounded-lg transition-all",
											copiedId === reminder.invoiceId
												? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
												: "border-slate-200 dark:border-slate-600",
										)}
									>
										{copiedId === reminder.invoiceId ? (
											<>
												<CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
												Copied!
											</>
										) : (
											<>
												<Copy className="w-3.5 h-3.5 mr-1.5" />
												Copy Reminder
											</>
										)}
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handleSendEmail(reminder)
										}
										className={cn(
											"rounded-lg transition-all",
											sentId === reminder.invoiceId
												? "border-blue-300 text-blue-600 bg-blue-50"
												: "border-slate-200 dark:border-slate-600",
										)}
									>
										{sentId === reminder.invoiceId ? (
											<>
												<CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
												Sent!
											</>
										) : (
											<>
												<Mail className="w-3.5 h-3.5 mr-1.5" />
												Send Email (Simulation)
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

// ══════════════════════════════════════════════════
// PART 5: Revenue Forecast Panel
// ══════════════════════════════════════════════════

function RevenueForecastPanel() {
	const [forecast, setForecast] = useState<RevenueForecast | null>(null);
	const [loading, setLoading] = useState(true);

	const profile = getUserProfile();
	const sym = getCurrencySymbol(profile.currency);

	useEffect(() => {
		const timer = setTimeout(() => {
			setForecast(generateRevenueForecast());
			setLoading(false);
		}, 1000);
		return () => clearTimeout(timer);
	}, []);

	if (loading) {
		return (
			<div className="flex flex-col items-center py-16 animate-fade-in">
				<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 animate-pulse">
					<BarChart3 className="w-7 h-7 text-white" />
				</div>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Calculating revenue projections...
				</p>
			</div>
		);
	}

	if (!forecast) return null;

	const maxChartVal = Math.max(
		...forecast.monthlyData.map((d) => Math.max(d.actual, d.projected)),
		1,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
					<BarChart3 className="w-4 h-4 text-white" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">
						Revenue Forecast
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Projected revenue based on historical data
					</p>
				</div>
			</div>

			{/* Projection Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3">
							<DollarSign className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{sym}
							{forecast.last30DaysRevenue.toLocaleString("en-US", {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							})}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Last 30 Days Revenue
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-100">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-3">
							<Target className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{sym}
							{forecast.averageInvoiceValue.toLocaleString(
								"en-US",
								{
									minimumFractionDigits: 0,
									maximumFractionDigits: 0,
								},
							)}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Avg Invoice Value
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-200">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
							<TrendingUp className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
							{sym}
							{forecast.projectedMonthly.toLocaleString("en-US", {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							})}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Projected Monthly
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-300">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-3">
							<BarChart3 className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
							{sym}
							{forecast.projectedAnnual.toLocaleString("en-US", {
								minimumFractionDigits: 0,
								maximumFractionDigits: 0,
							})}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Projected Annual
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Revenue Chart */}
			<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-300">
				<CardContent className="p-6">
					<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
						Revenue Timeline
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
						Actual vs. projected revenue (last 6 months + 3 month forecast)
					</p>

					{/* Legend */}
					<div className="flex items-center gap-4 mb-4">
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-sm bg-gradient-to-r from-indigo-500 to-cyan-500" />
							<span className="text-xs text-slate-500 dark:text-slate-400">
								Actual
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div className="w-3 h-3 rounded-sm bg-gradient-to-r from-purple-400 to-pink-400 opacity-60" />
							<span className="text-xs text-slate-500 dark:text-slate-400">
								Projected
							</span>
						</div>
					</div>

					{/* Bar Chart */}
					<div className="flex items-end gap-2 h-48">
						{forecast.monthlyData.map((d, i) => {
							const actualPct =
								maxChartVal > 0
									? (d.actual / maxChartVal) * 100
									: 0;
							const projectedPct =
								maxChartVal > 0
									? (d.projected / maxChartVal) * 100
									: 0;
							const isProjected = d.projected > 0;

							return (
								<div
									key={`${d.month}-${i}`}
									className="flex-1 flex flex-col items-center gap-1"
								>
									<span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
										{d.actual > 0
											? `${sym}${(d.actual / 1000).toFixed(d.actual >= 1000 ? 0 : 1)}k`
											: d.projected > 0
												? `${sym}${(d.projected / 1000).toFixed(d.projected >= 1000 ? 0 : 1)}k`
												: ""}
									</span>
									<div className="w-full h-36 flex items-end">
										{d.actual > 0 && (
											<div
												className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-cyan-400 transition-all duration-1000 animate-chart-grow"
												style={{
													height: `${Math.max(actualPct, 4)}%`,
													animationDelay: `${i * 80}ms`,
												}}
											/>
										)}
										{d.projected > 0 && (
											<div
												className="w-full rounded-t-md bg-gradient-to-t from-purple-400 to-pink-300 opacity-60 transition-all duration-1000 animate-chart-grow border-2 border-dashed border-purple-300"
												style={{
													height: `${Math.max(projectedPct, 4)}%`,
													animationDelay: `${i * 80}ms`,
												}}
											/>
										)}
										{d.actual === 0 && d.projected === 0 && (
											<div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-700" />
										)}
									</div>
									<span
										className={cn(
											"text-[10px] font-medium",
											isProjected
												? "text-purple-500"
												: "text-slate-500 dark:text-slate-400",
										)}
									>
										{d.month}
									</span>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// ══════════════════════════════════════════════════
// PART 6: Health Score Panel
// ══════════════════════════════════════════════════

function HealthScorePanel() {
	const [health, setHealth] = useState<HealthScore | null>(null);
	const [loading, setLoading] = useState(true);
	const [animatedScore, setAnimatedScore] = useState(0);

	useEffect(() => {
		const timer = setTimeout(() => {
			setHealth(calculateHealthScore());
			setLoading(false);
		}, 800);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!health || loading) return;

		let current = 0;
		const target = health.overall;
		const step = target / 60; // ~60 frames
		const interval = setInterval(() => {
			current += step;
			if (current >= target) {
				current = target;
				clearInterval(interval);
			}
			setAnimatedScore(Math.round(current));
		}, 16);

		return () => clearInterval(interval);
	}, [health, loading]);

	if (loading) {
		return (
			<div className="flex flex-col items-center py-16 animate-fade-in">
				<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 animate-pulse">
					<Shield className="w-7 h-7 text-white" />
				</div>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Calculating business health score...
				</p>
			</div>
		);
	}

	if (!health) return null;

	const gradeColors: Record<string, string> = {
		A: "from-emerald-500 to-teal-500",
		B: "from-blue-500 to-indigo-500",
		C: "from-amber-500 to-orange-500",
		D: "from-orange-500 to-red-500",
		F: "from-red-500 to-rose-600",
	};

	const scoreColor = gradeColors[health.grade] || gradeColors.C;
	const circumference = 2 * Math.PI * 80;
	const dashOffset =
		circumference - (circumference * animatedScore) / 100;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
					<Shield className="w-4 h-4 text-white" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">
						Business Health Score
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						AI-calculated score based on financial metrics
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Circular Score */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up">
					<CardContent className="p-8 flex flex-col items-center">
						<div className="relative w-48 h-48 mb-6">
							<svg
								className="w-48 h-48 transform -rotate-90"
								viewBox="0 0 180 180"
							>
								{/* Background circle */}
								<circle
									cx="90"
									cy="90"
									r="80"
									fill="none"
									stroke="#f1f5f9"
									strokeWidth="12"
								/>
								{/* Score circle */}
								<circle
									cx="90"
									cy="90"
									r="80"
									fill="none"
									strokeWidth="12"
									strokeLinecap="round"
									className={cn(
										"transition-all duration-1000",
									)}
									style={{
										stroke: `url(#scoreGradient)`,
										strokeDasharray: circumference,
										strokeDashoffset: dashOffset,
									}}
								/>
								<defs>
									<linearGradient
										id="scoreGradient"
										x1="0%"
										y1="0%"
										x2="100%"
										y2="100%"
									>
										<stop
											offset="0%"
											className={
												health.grade === "A"
													? "[stop-color:#10b981]"
													: health.grade === "B"
														? "[stop-color:#3b82f6]"
														: health.grade === "C"
															? "[stop-color:#f59e0b]"
															: "[stop-color:#ef4444]"
											}
											style={{
												stopColor:
													health.grade === "A"
														? "#10b981"
														: health.grade === "B"
															? "#3b82f6"
															: health.grade === "C"
																? "#f59e0b"
																: "#ef4444",
											}}
										/>
										<stop
											offset="100%"
											style={{
												stopColor:
													health.grade === "A"
														? "#14b8a6"
														: health.grade === "B"
															? "#6366f1"
															: health.grade === "C"
																? "#f97316"
																: "#e11d48",
											}}
										/>
									</linearGradient>
								</defs>
							</svg>
							{/* Center text */}
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<span className="text-4xl font-bold text-slate-900 dark:text-white">
									{animatedScore}
								</span>
								<span className="text-sm text-slate-500 dark:text-slate-400">
									out of 100
								</span>
							</div>
						</div>

						{/* Grade Badge */}
						<div
							className={cn(
								"inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-lg bg-gradient-to-r",
								scoreColor,
							)}
						>
							<Shield className="w-5 h-5" />
							Grade: {health.grade}
						</div>

						<p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-4 max-w-sm leading-relaxed">
							{health.summary}
						</p>
					</CardContent>
				</Card>

				{/* Factor Breakdown */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-200">
					<CardContent className="p-6">
						<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-5">
							Score Breakdown
						</h3>

						<div className="space-y-5">
							{health.factors.map((factor, i) => (
								<div
									key={factor.label}
									className="animate-fade-in-up"
									style={{
										animationDelay: `${(i + 2) * 150}ms`,
									}}
								>
									<div className="flex items-center justify-between mb-1.5">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-slate-900 dark:text-white">
												{factor.label}
											</span>
											<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
												{factor.weight}% weight
											</span>
										</div>
										<span
											className={cn(
												"text-sm font-bold",
												factor.score >= 70
													? "text-emerald-600"
													: factor.score >= 50
														? "text-amber-600"
														: "text-red-600",
											)}
										>
											{factor.score}
										</span>
									</div>

									<div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
										<div
											className={cn(
												"h-full rounded-full transition-all duration-1000 bg-gradient-to-r",
												factor.score >= 70
													? "from-emerald-500 to-teal-400"
													: factor.score >= 50
														? "from-amber-500 to-orange-400"
														: "from-red-500 to-rose-400",
											)}
											style={{
												width: `${factor.score}%`,
											}}
										/>
									</div>

									<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										{factor.description}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// ══════════════════════════════════════════════════
// Overview Tab — Quick Summary of All AI Features
// ══════════════════════════════════════════════════

function AIOverview() {
	const [health, setHealth] = useState<HealthScore | null>(null);
	const [forecast, setForecast] = useState<RevenueForecast | null>(null);
	const [insights, setInsights] = useState<AIInsight[]>([]);
	const [reminders, setReminders] = useState<PaymentReminder[]>([]);
	const [loading, setLoading] = useState(true);

	const profile = getUserProfile();
	const sym = getCurrencySymbol(profile.currency);

	useEffect(() => {
		const timer = setTimeout(() => {
			setHealth(calculateHealthScore());
			setForecast(generateRevenueForecast());
			setInsights(generateInsights());
			setReminders(generatePaymentReminders());
			setLoading(false);
		}, 600);
		return () => clearTimeout(timer);
	}, []);

	if (loading) {
		return (
			<div className="flex flex-col items-center py-16 animate-fade-in">
				<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-4 animate-pulse">
					<Activity className="w-7 h-7 text-white" />
				</div>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Loading AI overview...
				</p>
			</div>
		);
	}

	const gradeColors: Record<string, string> = {
		A: "from-emerald-500 to-teal-500",
		B: "from-blue-500 to-indigo-500",
		C: "from-amber-500 to-orange-500",
		D: "from-orange-500 to-red-500",
		F: "from-red-500 to-rose-600",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
					<Activity className="w-4 h-4 text-white" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-900 dark:text-white">
						AI Dashboard Overview
					</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Quick summary of all AI-powered metrics
					</p>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Health Score */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up">
					<CardContent className="p-5">
						<div
							className={cn(
								"w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
								health
									? gradeColors[health.grade]
									: "from-slate-400 to-slate-500",
							)}
						>
							<Shield className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{health?.overall ?? 0}
							<span className="text-sm text-slate-400 dark:text-slate-500 ml-1">
								/ 100
							</span>
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Health Score ({health?.grade ?? "N/A"})
						</p>
					</CardContent>
				</Card>

				{/* Projected Monthly */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-100">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
							<TrendingUp className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{sym}
							{(forecast?.projectedMonthly ?? 0).toLocaleString(
								"en-US",
								{ maximumFractionDigits: 0 },
							)}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Projected Monthly
						</p>
					</CardContent>
				</Card>

				{/* Active Insights */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-200">
					<CardContent className="p-5">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-3">
							<Sparkles className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{insights.length}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							Active Insights
						</p>
					</CardContent>
				</Card>

				{/* Pending Reminders */}
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up animation-delay-300">
					<CardContent className="p-5">
						<div
							className={cn(
								"w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
								reminders.length > 0
									? "from-red-500 to-orange-500"
									: "from-emerald-500 to-teal-500",
							)}
						>
							<Mail className="w-5 h-5 text-white" />
						</div>
						<p className="text-2xl font-bold text-slate-900 dark:text-white">
							{reminders.length}
						</p>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
							{reminders.length > 0
								? "Overdue Reminders"
								: "All Caught Up"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Top insights quick view */}
			{insights.length > 0 && (
				<Card className="border-slate-200/60 dark:border-slate-700 dark:bg-slate-800 animate-fade-in-up animation-delay-300">
					<CardContent className="p-6">
						<h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
							Latest Insights
						</h3>
						<div className="space-y-3">
							{insights.slice(0, 3).map((insight) => (
								<div
									key={insight.id}
									className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors"
								>
									<div
										className={cn(
											"w-2 h-2 rounded-full mt-1.5 shrink-0",
											insight.type === "positive"
												? "bg-emerald-500"
												: insight.type === "warning"
													? "bg-amber-500"
													: insight.type === "action"
														? "bg-purple-500"
														: "bg-blue-500",
										)}
									/>
									<div>
										<p className="text-sm font-medium text-slate-900 dark:text-white">
											{insight.title}
										</p>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
											{insight.description}
										</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
