import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Zap, Eye, EyeOff, ArrowRight, Loader2, Mail, ArrowLeft, Sun, Moon } from "lucide-react";
import { firebaseSignIn, firebaseResetPassword } from "@/lib/firebase";
import { createSession } from "@/lib/session";
import { logActivity } from "@/lib/activity-log";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: "", password: "" });
	const [remember, setRemember] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [authError, setAuthError] = useState("");

	// Dark mode state
	const { isDark, toggle: toggleDarkMode } = useTheme();

	// Password reset state
	const [showResetForm, setShowResetForm] = useState(false);
	const [resetEmail, setResetEmail] = useState("");
	const [resetSubmitting, setResetSubmitting] = useState(false);
	const [resetMessage, setResetMessage] = useState("");
	const [resetError, setResetError] = useState("");

	function validate() {
		const errs: Record<string, string> = {};
		if (!form.email.trim()) errs.email = "Email is required";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = "Invalid email address";
		if (!form.password) errs.password = "Password is required";
		return errs;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const errs = validate();
		setErrors(errs);
		setAuthError("");
		if (Object.keys(errs).length > 0) return;

		setSubmitting(true);

		const result = await firebaseSignIn(form.email, form.password);

		if (!result.success) {
			logActivity("login_failed", `Login failed for ${form.email}`);
			setAuthError(result.error || "Sign in failed");
			setSubmitting(false);
			return;
		}

		// Create session and log successful login
		createSession();
		logActivity("login", `User logged in: ${form.email}`);
		// Clear dashboard loaded flag so loading screen shows for this new login
		sessionStorage.removeItem("billingo_dashboard_loaded");

		if (remember) {
			localStorage.setItem("billingo_remember", "true");
		}

		setSubmitting(false);

		const onboarded = localStorage.getItem("billingo_onboarded");
		if (onboarded) {
			navigate({ to: "/dashboard" });
		} else {
			navigate({ to: "/onboarding" });
		}
	}

	async function handleResetPassword(e: React.FormEvent) {
		e.preventDefault();
		setResetError("");
		setResetMessage("");

		if (!resetEmail.trim()) {
			setResetError("Please enter your email address");
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
			setResetError("Please enter a valid email address");
			return;
		}

		setResetSubmitting(true);
		const result = await firebaseResetPassword(resetEmail);
		setResetSubmitting(false);

		if (result.success) {
			setResetMessage("Password reset email sent! Check your inbox.");
		} else {
			setResetError(result.error || "Failed to send reset email");
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
			{/* Day/Night Toggle */}
			<button
				type="button"
				onClick={toggleDarkMode}
				className={cn(
					"absolute top-5 right-5 z-20 w-14 h-7 rounded-full p-0.5 border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
					isDark
						? "bg-indigo-900/60 border-indigo-700"
						: "bg-slate-200 border-slate-300",
				)}
				title={isDark ? "Switch to light mode" : "Switch to dark mode"}
				aria-label="Toggle dark mode"
			>
				<span
					className={cn(
						"flex items-center justify-center w-6 h-6 rounded-full shadow-sm transition-all duration-300",
						isDark
							? "translate-x-6.5 bg-indigo-500 text-white"
							: "translate-x-0 bg-white text-amber-500",
					)}
				>
					{isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
				</span>
			</button>

			{/* Animated background */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-10 right-[15%] w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl animate-float" />
				<div className="absolute bottom-10 left-[10%] w-96 h-96 bg-cyan-200/15 rounded-full blur-3xl animate-float-slow" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-100/10 rounded-full blur-3xl animate-pulse-glow" />
				<div className="absolute top-1/4 left-[25%] w-3 h-3 bg-indigo-400 rounded-full opacity-30 animate-float" />
				<div className="absolute bottom-1/3 right-[20%] w-4 h-4 bg-cyan-400 rounded-full opacity-20 animate-float-slow" />
			</div>

			<div className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
				{/* Logo */}
				<div className="text-center mb-8 animate-fade-in-down">
					<Link to="/" className="inline-flex items-center gap-2 group">
						<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
							<Zap className="w-5 h-5 text-white" />
						</div>
						<span className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-cyan-600 bg-clip-text text-transparent">
							Billingo
						</span>
					</Link>
				</div>

				{/* Card */}
				<div className="animate-fade-in-up animation-delay-200 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 p-8">
					{showResetForm ? (
						<>
							{/* Password Reset Form */}
							<div className="text-center mb-6">
								<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
									<Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
								</div>
								<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
									Reset Password
								</h1>
								<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
									Enter your email and we&apos;ll send you a reset link
								</p>
							</div>

							<form onSubmit={handleResetPassword} className="space-y-4">
								<div className="space-y-1.5">
									<Label htmlFor="reset-email" className="text-slate-700 dark:text-slate-300">
										Email
									</Label>
									<Input
										id="reset-email"
										type="email"
										placeholder="john@company.com"
										value={resetEmail}
										onChange={(e) => setResetEmail(e.target.value)}
										className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 transition-all duration-300"
									/>
								</div>

								{resetError && (
									<div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
										{resetError}
									</div>
								)}

								{resetMessage && (
									<div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600">
										{resetMessage}
									</div>
								)}

								<Button
									type="submit"
									disabled={resetSubmitting}
									className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:opacity-90 transition-all duration-300 text-base font-medium"
								>
									{resetSubmitting ? (
										<span className="flex items-center gap-2">
											<Loader2 className="w-4 h-4 animate-spin" />
											Sending...
										</span>
									) : (
										"Send Reset Link"
									)}
								</Button>
							</form>

							<button
								type="button"
								onClick={() => {
									setShowResetForm(false);
									setResetError("");
									setResetMessage("");
								}}
								className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mx-auto"
							>
								<ArrowLeft className="w-3.5 h-3.5" />
								Back to sign in
							</button>
						</>
					) : (
						<>
							{/* Login Form */}
							<div className="text-center mb-6">
								<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
									Welcome back
								</h1>
								<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
									Sign in to your Billingo account
								</p>
							</div>

							{authError && (
								<div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 animate-fade-in">
									{authError}
								</div>
							)}

							<form onSubmit={handleSubmit} className="space-y-4">
								{/* Email */}
								<div className="space-y-1.5">
									<Label htmlFor="login-email" className="text-slate-700 dark:text-slate-300">
										Email
									</Label>
									<Input
										id="login-email"
										type="email"
										placeholder="john@company.com"
										value={form.email}
										onChange={(e) =>
											setForm({ ...form, email: e.target.value })
										}
										className={cn(
											"h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 transition-all duration-300",
											errors.email && "border-red-400",
										)}
									/>
									{errors.email && (
										<p className="text-xs text-red-500">{errors.email}</p>
									)}
								</div>

								{/* Password */}
								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<Label
											htmlFor="login-password"
											className="text-slate-700 dark:text-slate-300"
										>
											Password
										</Label>
										<button
											type="button"
											onClick={() => {
												setShowResetForm(true);
												setResetEmail(form.email);
											}}
											className="text-xs text-indigo-600 hover:underline"
										>
											Forgot Password?
										</button>
									</div>
									<div className="relative">
										<Input
											id="login-password"
											type={showPassword ? "text" : "password"}
											placeholder="Enter your password"
											value={form.password}
											onChange={(e) =>
												setForm({ ...form, password: e.target.value })
											}
											className={cn(
												"h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 transition-all duration-300 pr-10",
												errors.password && "border-red-400",
											)}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
										>
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
									{errors.password && (
										<p className="text-xs text-red-500">{errors.password}</p>
									)}
								</div>

								{/* Remember me */}
								<div className="flex items-center gap-2">
									<Checkbox
										id="remember"
										checked={remember}
										onCheckedChange={(checked) =>
											setRemember(checked === true)
										}
										className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
									/>
									<Label
										htmlFor="remember"
										className="text-sm text-slate-500 dark:text-slate-400 font-normal cursor-pointer"
									>
										Remember me
									</Label>
								</div>

								{/* Submit */}
								<Button
									type="submit"
									disabled={submitting}
									className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:opacity-90 transition-all duration-300 text-base font-medium mt-2"
								>
									{submitting ? (
										<span className="flex items-center gap-2">
											<Loader2 className="w-4 h-4 animate-spin" />
											Signing in...
										</span>
									) : (
										<span className="flex items-center gap-2">
											Sign In
											<ArrowRight className="w-4 h-4" />
										</span>
									)}
								</Button>
							</form>

							{/* Divider */}
							<div className="flex items-center gap-4 my-6">
								<div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
								<span className="text-xs text-slate-400 dark:text-slate-500">OR</span>
								<div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
							</div>

							{/* Sign up link */}
							<p className="text-center text-sm text-slate-500 dark:text-slate-400">
								Don&apos;t have an account?{" "}
								<Link
									to="/signup"
									className="text-indigo-600 font-medium hover:underline"
								>
									Create one free
								</Link>
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
