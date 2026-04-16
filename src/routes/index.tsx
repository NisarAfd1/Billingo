import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
	Zap,
	CreditCard,
	BarChart3,
	Settings,
	FileText,
	TrendingUp,
	User,
	Store,
	Briefcase,
	Users,
	Package,
	Building2,
	Globe,
	Layers,
	Bot,
	ArrowRight,
	Play,
	CheckCircle2,
	Twitter,
	Linkedin,
	Github,
	Mail,
	Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
	component: App,
});

// Hook for scroll-triggered animations via IntersectionObserver
function useInView(threshold = 0.15) {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.unobserve(el);
				}
			},
			{ threshold },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [threshold]);

	return { ref, inView };
}

// ─── Navigation ───
function Navbar() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<nav
			className={cn(
				"fixed top-0 left-0 right-0 z-50 transition-all duration-500",
				scrolled
					? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50"
					: "bg-transparent",
			)}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16 sm:h-20">
					<a
						href="#hero"
						className="flex items-center gap-2 group"
					>
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
							<Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
						</div>
						<span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
							Billingo
						</span>
					</a>
					<div className="hidden md:flex items-center gap-8">
						<a
							href="#about"
							className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
						>
							About
						</a>
						<a
							href="#how-it-works"
							className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
						>
							How It Works
						</a>
						<a
							href="#business-types"
							className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
						>
							For Businesses
						</a>
						<a
							href="#why-billingo"
							className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
						>
							Why Billingo
						</a>
					</div>
					<div className="flex items-center gap-3">
						<Link to="/login">
							<Button
								variant="ghost"
								className="hidden sm:inline-flex text-sm text-slate-600 hover:text-indigo-600"
							>
								Sign In
							</Button>
						</Link>
						<Link to="/signup">
							<Button className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-md hover:shadow-lg hover:opacity-90 transition-all text-sm px-4 sm:px-5">
								Get Started
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</nav>
	);
}

// ─── Hero Section ───
function HeroSection() {
	return (
		<section
			id="hero"
			className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 pt-20"
		>
			{/* Animated background shapes */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-[10%] w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl animate-float" />
				<div className="absolute top-40 right-[15%] w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl animate-float-slow" />
				<div className="absolute bottom-20 left-[30%] w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse-glow" />
				<div className="absolute top-1/3 right-[5%] w-4 h-4 bg-indigo-400 rounded-full opacity-30 animate-float" />
				<div className="absolute top-1/4 left-[20%] w-3 h-3 bg-cyan-400 rounded-full opacity-40 animate-float-slow" />
				<div className="absolute bottom-1/3 right-[25%] w-5 h-5 bg-purple-400 rounded-full opacity-20 animate-float" />
			</div>

			<div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<div className="animate-fade-in-down">
					<span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
						<Zap className="w-3.5 h-3.5" />
						AI-Powered Billing Platform
					</span>
				</div>

				<h1 className="animate-fade-in-up animation-delay-200 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-slate-900 mt-4">
					The Global AI Billing{" "}
					<span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
						Infrastructure
					</span>{" "}
					for Modern Businesses
				</h1>

				<p className="animate-fade-in-up animation-delay-400 mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
					Automate invoicing, streamline payments, and unlock AI-driven
					business insights — all from one intelligent platform built for
					the global economy.
				</p>

				<div className="animate-fade-in-up animation-delay-600 flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10">
					<Link to="/signup">
						<Button
							size="lg"
							className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 px-8 py-6 text-base rounded-xl hover:opacity-90"
						>
							Get Started Free
							<ArrowRight className="w-4 h-4 ml-1" />
						</Button>
					</Link>
					<Button
						size="lg"
						variant="outline"
						className="w-full sm:w-auto border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300 px-8 py-6 text-base rounded-xl"
					>
						<Play className="w-4 h-4 mr-1" />
						Watch Demo
					</Button>
				</div>

				<div className="animate-fade-in animation-delay-800 mt-12 sm:mt-16 flex items-center justify-center gap-6 sm:gap-8 text-sm text-slate-500">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500" />
						<span>No credit card required</span>
					</div>
					<div className="hidden sm:flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500" />
						<span>14-day free trial</span>
					</div>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-500" />
						<span>Cancel anytime</span>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── What is Billingo ───
function AboutSection() {
	const { ref, inView } = useInView();

	const features = [
		{
			icon: FileText,
			title: "Smart Invoicing",
			description:
				"AI-generated invoices with automatic tax calculations, multi-currency support, and intelligent client management.",
		},
		{
			icon: CreditCard,
			title: "Payment Automation",
			description:
				"Automated payment reminders, recurring billing, and seamless integration with global payment gateways.",
		},
		{
			icon: BarChart3,
			title: "AI Business Insights",
			description:
				"Real-time analytics dashboards, cash flow predictions, and actionable growth recommendations powered by AI.",
		},
	];

	return (
		<section
			id="about"
			ref={ref}
			className="py-20 sm:py-28 bg-white relative"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						"max-w-3xl mx-auto text-center mb-16",
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">
						What is Billingo?
					</span>
					<h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
						Your AI-powered financial assistant
					</h2>
					<p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
						Billingo is more than a billing tool — it&apos;s an intelligent
						financial companion that understands your business, automates
						tedious tasks, and provides data-driven insights to help you
						grow faster and smarter across borders.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
					{features.map((feature, i) => (
						<Card
							key={feature.title}
							className={cn(
								"group border-slate-100 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-100 hover:-translate-y-2 transition-all duration-500 cursor-default",
								inView
									? `animate-fade-in-up animation-delay-${(i + 2) * 100}`
									: "opacity-0",
							)}
						>
							<CardContent className="pt-8 pb-8 px-6 sm:px-8 text-center">
								<div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-indigo-200/50">
									<feature.icon className="w-7 h-7 text-white" />
								</div>
								<h3 className="text-xl font-semibold text-slate-900 mb-3">
									{feature.title}
								</h3>
								<p className="text-slate-600 leading-relaxed text-sm sm:text-base">
									{feature.description}
								</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Our Aim / Mission Section ───
function MissionSection() {
	const { ref, inView } = useInView();

	const points = [
		{
			icon: Globe,
			title: "Global & Multi-Currency",
			description:
				"Operate seamlessly across borders with support for 100+ currencies and localized tax compliance.",
		},
		{
			icon: Layers,
			title: "Modular Architecture",
			description:
				"Pick and choose the features you need. Scale from freelancer to enterprise without switching platforms.",
		},
		{
			icon: Bot,
			title: "AI-Powered Support",
			description:
				"Intelligent automation that learns your business patterns and proactively optimizes your workflows.",
		},
	];

	return (
		<section
			id="mission"
			ref={ref}
			className="py-20 sm:py-28 relative overflow-hidden"
		>
			{/* Subtle background gradient */}
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 pointer-events-none" />
			<div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-100/20 rounded-full blur-3xl pointer-events-none" />

			<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						"max-w-3xl mx-auto text-center mb-16",
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">
						Our Aim
					</span>
					<h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
						Digitizing businesses globally
					</h2>
					<p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
						Our mission is to digitize businesses globally by making
						billing intelligent, automated, and borderless — empowering
						every entrepreneur to focus on what truly matters: growing their
						business.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{points.map((point, i) => (
						<div
							key={point.title}
							className={cn(
								"flex flex-col items-center text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-100 hover:bg-white hover:shadow-lg transition-all duration-500",
								inView
									? `animate-fade-in-up animation-delay-${(i + 2) * 100}`
									: "opacity-0",
							)}
						>
							<div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
								<point.icon className="w-6 h-6 text-indigo-600" />
							</div>
							<h3 className="text-lg font-semibold text-slate-900 mb-2">
								{point.title}
							</h3>
							<p className="text-slate-600 text-sm leading-relaxed">
								{point.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── How It Works ───
function HowItWorksSection() {
	const { ref, inView } = useInView();

	const steps = [
		{
			icon: Settings,
			step: "01",
			title: "Set Up Your Business",
			description:
				"Create your profile, configure your branding, and connect your payment methods in minutes — not days.",
		},
		{
			icon: FileText,
			step: "02",
			title: "Automate Invoices & Payments",
			description:
				"Let Billingo handle invoice generation, payment tracking, reminders, and reconciliation automatically.",
		},
		{
			icon: TrendingUp,
			step: "03",
			title: "Let AI Optimize Your Growth",
			description:
				"Our AI analyzes your financial data to deliver actionable insights, predict cash flow, and identify opportunities.",
		},
	];

	return (
		<section
			id="how-it-works"
			ref={ref}
			className="py-20 sm:py-28 bg-white"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						"max-w-3xl mx-auto text-center mb-16",
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">
						How It Works
					</span>
					<h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
						Three simple steps to smarter billing
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
					{/* Connecting line (desktop) */}
					<div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-cyan-200" />

					{steps.map((step, i) => (
						<div
							key={step.step}
							className={cn(
								"relative flex flex-col items-center text-center group",
								inView
									? `animate-fade-in-up animation-delay-${(i + 1) * 200}`
									: "opacity-0",
							)}
						>
							<div className="relative z-10 mb-6">
								<div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
									<step.icon className="w-9 h-9 text-white" />
								</div>
								<div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-600 shadow-sm">
									{step.step}
								</div>
							</div>
							<h3 className="text-xl font-semibold text-slate-900 mb-3">
								{step.title}
							</h3>
							<p className="text-slate-600 leading-relaxed text-sm sm:text-base max-w-xs">
								{step.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Business Types ───
function BusinessTypesSection() {
	const { ref, inView } = useInView();
	const [selected, setSelected] = useState<string | null>(null);

	const businessTypes = [
		{
			icon: User,
			title: "Freelancer",
			description: "Invoice clients, track time, and manage your solo business effortlessly.",
		},
		{
			icon: Store,
			title: "Retail Store",
			description: "POS integration, inventory billing, and seamless customer management.",
		},
		{
			icon: Briefcase,
			title: "Agency",
			description: "Multi-client billing, project-based invoicing, and team collaboration tools.",
		},
		{
			icon: Users,
			title: "Consultant",
			description: "Proposal-to-invoice workflows, retainer billing, and expense tracking.",
		},
		{
			icon: Package,
			title: "Wholesale",
			description: "Bulk invoicing, tiered pricing, and supply chain payment management.",
		},
		{
			icon: Building2,
			title: "Enterprise",
			description: "Custom workflows, advanced reporting, SSO, and dedicated account management.",
		},
	];

	return (
		<section
			id="business-types"
			ref={ref}
			className="py-20 sm:py-28 relative overflow-hidden"
		>
			<div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 via-white to-white pointer-events-none" />

			<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						"max-w-3xl mx-auto text-center mb-16",
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">
						Built For Every Business
					</span>
					<h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
						One platform, every business type
					</h2>
					<p className="mt-6 text-base sm:text-lg text-slate-600">
						Whether you&apos;re a solo freelancer or a global enterprise,
						Billingo adapts to your workflow.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
					{businessTypes.map((biz, i) => (
						<button
							type="button"
							key={biz.title}
							onClick={() =>
								setSelected(selected === biz.title ? null : biz.title)
							}
							className={cn(
								"group relative flex flex-col items-start p-6 sm:p-8 rounded-2xl border text-left transition-all duration-500 cursor-pointer",
								selected === biz.title
									? "border-indigo-300 bg-gradient-to-br from-indigo-50 to-cyan-50 shadow-lg shadow-indigo-100/50"
									: "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 hover:-translate-y-1",
								inView
									? `animate-fade-in-up animation-delay-${(i + 1) * 100}`
									: "opacity-0",
							)}
						>
							<div
								className={cn(
									"w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300",
									selected === biz.title
										? "bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-md"
										: "bg-indigo-50 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-cyan-500",
								)}
							>
								<biz.icon
									className={cn(
										"w-6 h-6 transition-colors duration-300",
										selected === biz.title
											? "text-white"
											: "text-indigo-600 group-hover:text-white",
									)}
								/>
							</div>
							<h3 className="text-lg font-semibold text-slate-900 mb-2">
								{biz.title}
							</h3>
							<p className="text-sm text-slate-600 leading-relaxed">
								{biz.description}
							</p>
						</button>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Why Billingo is Different ───
function WhyBillingoSection() {
	const { ref, inView } = useInView();

	const differentiators = [
		{
			title: "AI-Driven Dashboard",
			description:
				"Your business command center with predictive analytics, automated alerts, and personalized recommendations that evolve with your business.",
		},
		{
			title: "Multi-Currency Support",
			description:
				"Send invoices in 100+ currencies with real-time exchange rates and automatic conversion — eliminating the complexity of global payments.",
		},
		{
			title: "Global Tax Configuration",
			description:
				"Automated tax calculations for any jurisdiction. Stay compliant across borders without the headache of tracking every regulation.",
		},
		{
			title: "Crypto Compatibility",
			description:
				"Accept and process cryptocurrency payments alongside traditional methods. Future-proof your billing infrastructure today.",
		},
		{
			title: "Intelligent Analytics",
			description:
				"Machine learning algorithms analyze your financial patterns to forecast revenue, identify risks, and surface growth opportunities.",
		},
	];

	return (
		<section
			id="why-billingo"
			ref={ref}
			className="py-20 sm:py-28 bg-white"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
					{/* Left side */}
					<div
						className={cn(
							inView ? "animate-slide-in-left" : "opacity-0",
						)}
					>
						<span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">
							Why Billingo?
						</span>
						<h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
							Built different.{" "}
							<span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
								Built better.
							</span>
						</h2>
						<p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
							Most billing platforms make you adapt to their workflow.
							Billingo adapts to yours. Our AI-first approach means your
							billing infrastructure gets smarter every day, learning from
							your patterns to automate more and deliver deeper insights.
						</p>
						<Button className="mt-8 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:opacity-90 transition-all px-6 py-5 rounded-xl text-base">
							Explore All Features
							<ArrowRight className="w-4 h-4 ml-1" />
						</Button>
					</div>

					{/* Right side */}
					<div className="space-y-4">
						{differentiators.map((item, i) => (
							<div
								key={item.title}
								className={cn(
									"group p-5 sm:p-6 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-400",
									inView
										? `animate-slide-in-right animation-delay-${(i + 1) * 100}`
										: "opacity-0",
								)}
							>
								<div className="flex items-start gap-4">
									<div className="mt-1 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
										<CheckCircle2 className="w-4 h-4 text-white" />
									</div>
									<div>
										<h3 className="text-base font-semibold text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">
											{item.title}
										</h3>
										<p className="text-sm text-slate-600 leading-relaxed">
											{item.description}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── CEO Message ───
function CEOSection() {
	const { ref, inView } = useInView();

	return (
		<section
			id="ceo"
			ref={ref}
			className="py-20 sm:py-28 relative overflow-hidden"
		>
			<div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 pointer-events-none" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

			<div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<div
					className={cn(
						"text-center",
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<Quote className="w-10 h-10 text-indigo-400/60 mx-auto mb-8" />

					<div className="flex flex-col items-center">
						{/* Portrait placeholder */}
						<div
							className={cn(
								"w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20",
								inView
									? "animate-scale-in animation-delay-200"
									: "opacity-0",
							)}
						>
							<span className="text-3xl sm:text-4xl font-bold text-white">
								MN
							</span>
						</div>

						<blockquote
							className={cn(
								"text-lg sm:text-xl md:text-2xl text-slate-200 leading-relaxed max-w-3xl italic",
								inView
									? "animate-fade-in-up animation-delay-300"
									: "opacity-0",
							)}
						>
							&ldquo;We envisioned Billingo as the bridge between
							traditional business operations and the future of
							AI-driven finance. Every entrepreneur deserves access to
							intelligent tools that simplify complexity, transcend
							borders, and unlock growth. That&apos;s not just our
							product — it&apos;s our promise.&rdquo;
						</blockquote>

						<div
							className={cn(
								"mt-8",
								inView
									? "animate-fade-in-up animation-delay-500"
									: "opacity-0",
							)}
						>
							<p className="text-white font-semibold text-lg">
								Muhammad Nisar Khan Afridi
							</p>
							<p className="text-indigo-300 text-sm mt-1">
								Founder & CEO, Billingo
							</p>
							<div className="mt-4 text-indigo-400/80 italic text-sm font-light tracking-wide">
								— Building the future of intelligent billing
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Call to Action ───
function CTASection() {
	const { ref, inView } = useInView();

	return (
		<section ref={ref} className="py-20 sm:py-28 bg-white relative overflow-hidden">
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-100/50 via-purple-100/30 to-cyan-100/50 rounded-full blur-3xl" />
			</div>

			<div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<div
					className={cn(
						inView ? "animate-fade-in-up" : "opacity-0",
					)}
				>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
						Start Building{" "}
						<span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
							Smarter
						</span>{" "}
						Today
					</h2>
					<p className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
						Join thousands of businesses already using Billingo to
						automate their billing and unlock AI-powered growth.
					</p>
				</div>

				<div
					className={cn(
						"flex flex-col sm:flex-row items-center justify-center gap-4 mt-10",
						inView
							? "animate-fade-in-up animation-delay-200"
							: "opacity-0",
					)}
				>
					<Link to="/signup">
						<Button
							size="lg"
							className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:opacity-90 transition-all duration-300 px-8 py-6 text-base rounded-xl"
						>
							Get Started Free
							<ArrowRight className="w-4 h-4 ml-1" />
						</Button>
					</Link>
					<Link to="/signup">
						<Button
							size="lg"
							variant="outline"
							className="w-full sm:w-auto border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300 px-8 py-6 text-base rounded-xl"
						>
							Create Your Business Profile
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}

// ─── Footer ───
function Footer() {
	const footerLinks = {
		Product: ["Features", "Pricing", "Integrations", "API"],
		Company: ["About", "Careers", "Blog", "Press"],
		Resources: ["Documentation", "Help Center", "Community", "Status"],
		Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
	};

	return (
		<footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
					{/* Brand column */}
					<div className="col-span-2 md:col-span-1">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
								<Zap className="w-4 h-4 text-white" />
							</div>
							<span className="text-lg font-bold text-white">
								Billingo
							</span>
						</div>
						<p className="text-sm text-slate-500 leading-relaxed mb-6">
							AI-powered billing infrastructure for modern businesses
							worldwide.
						</p>
						<div className="flex items-center gap-3">
							<a
								href="#"
								className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors duration-300"
								aria-label="Twitter"
							>
								<Twitter className="w-4 h-4 text-slate-400 hover:text-white" />
							</a>
							<a
								href="#"
								className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors duration-300"
								aria-label="LinkedIn"
							>
								<Linkedin className="w-4 h-4 text-slate-400 hover:text-white" />
							</a>
							<a
								href="#"
								className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors duration-300"
								aria-label="GitHub"
							>
								<Github className="w-4 h-4 text-slate-400 hover:text-white" />
							</a>
							<a
								href="#"
								className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-indigo-600 flex items-center justify-center transition-colors duration-300"
								aria-label="Email"
							>
								<Mail className="w-4 h-4 text-slate-400 hover:text-white" />
							</a>
						</div>
					</div>

					{/* Link columns */}
					{Object.entries(footerLinks).map(([category, links]) => (
						<div key={category}>
							<h4 className="text-sm font-semibold text-white mb-4">
								{category}
							</h4>
							<ul className="space-y-3">
								{links.map((link) => (
									<li key={link}>
										<a
											href="#"
											className="text-sm text-slate-500 hover:text-indigo-400 transition-colors duration-300"
										>
											{link}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<Separator className="bg-slate-800" />

				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
					<p className="text-sm text-slate-600">
						&copy; {new Date().getFullYear()} Billingo. All rights reserved.
					</p>
					<div className="flex items-center gap-6">
						<a
							href="#"
							className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
						>
							Privacy Policy
						</a>
						<a
							href="#"
							className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
						>
							Terms
						</a>
						<a
							href="#"
							className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
						>
							Contact
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

// ─── Main App ───
function App() {
	return (
		<div className="min-h-screen bg-white overflow-x-hidden">
			<Navbar />
			<HeroSection />
			<AboutSection />
			<MissionSection />
			<HowItWorksSection />
			<BusinessTypesSection />
			<WhyBillingoSection />
			<CEOSection />
			<CTASection />
			<Footer />
		</div>
	);
}
