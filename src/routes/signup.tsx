import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	Zap,
	Eye,
	EyeOff,
	Check,
	X,
	ArrowRight,
	Loader2,
} from "lucide-react";
import { firebaseSignUp } from "@/lib/firebase";

export const Route = createFileRoute("/signup")({
	component: SignUpPage,
});

function getPasswordStrength(password: string) {
	let score = 0;
	if (password.length >= 8) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[a-z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;
	return score;
}

function getStrengthLabel(score: number) {
	if (score <= 1) return { label: "Weak", color: "bg-red-500", text: "text-red-500" };
	if (score <= 2) return { label: "Fair", color: "bg-orange-500", text: "text-orange-500" };
	if (score <= 3) return { label: "Good", color: "bg-yellow-500", text: "text-yellow-500" };
	if (score <= 4) return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
	return { label: "Very Strong", color: "bg-emerald-600", text: "text-emerald-600" };
}

function SignUpPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [agreed, setAgreed] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [authError, setAuthError] = useState("");

	const passwordStrength = getPasswordStrength(form.password);
	const strengthInfo = getStrengthLabel(passwordStrength);

	const passwordChecks = [
		{ label: "At least 8 characters", met: form.password.length >= 8 },
		{ label: "Contains uppercase", met: /[A-Z]/.test(form.password) },
		{ label: "Contains lowercase", met: /[a-z]/.test(form.password) },
		{ label: "Contains number", met: /[0-9]/.test(form.password) },
		{ label: "Contains special character", met: /[^A-Za-z0-9]/.test(form.password) },
	];

	function validate() {
		const errs: Record<string, string> = {};
		if (!form.email.trim()) errs.email = "Email is required";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = "Invalid email address";
		if (!form.password) errs.password = "Password is required";
		else if (form.password.length < 8)
			errs.password = "Password must be at least 8 characters";
		if (form.password !== form.confirmPassword)
			errs.confirmPassword = "Passwords do not match";
		if (!agreed) errs.agreed = "You must agree to the terms";
		return errs;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const errs = validate();
		setErrors(errs);
		setAuthError("");
		if (Object.keys(errs).length > 0) return;

		setSubmitting(true);

		const result = await firebaseSignUp(form.email, form.password, "");

		if (!result.success) {
			setAuthError(result.error || "Registration failed");
			setSubmitting(false);
			return;
		}

		setSubmitting(false);
		navigate({ to: "/onboarding" });
	}

	return (
		<div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
			{/* Animated background */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-20 left-[10%] w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl animate-float" />
				<div className="absolute bottom-20 right-[10%] w-96 h-96 bg-cyan-200/15 rounded-full blur-3xl animate-float-slow" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-100/10 rounded-full blur-3xl animate-pulse-glow" />
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
					<div className="text-center mb-6">
						<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
							Create your account
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
							Start your 14-day free trial. No credit card required.
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
							<Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
								Email
							</Label>
							<Input
								id="email"
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
							<Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
								Password
							</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="Create a strong password"
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
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
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

							{/* Password strength */}
							{form.password && (
								<div className="animate-fade-in space-y-2 mt-2">
									<div className="flex items-center gap-2">
										<div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
											{[1, 2, 3, 4, 5].map((i) => (
												<div
													key={i}
													className={cn(
														"flex-1 h-full rounded-full transition-all duration-500",
														i <= passwordStrength
															? strengthInfo.color
															: "bg-slate-100 dark:bg-slate-700",
													)}
												/>
											))}
										</div>
										<span
											className={cn(
												"text-xs font-medium",
												strengthInfo.text,
											)}
										>
											{strengthInfo.label}
										</span>
									</div>
									<div className="grid grid-cols-2 gap-1">
										{passwordChecks.map((check) => (
											<div
												key={check.label}
												className="flex items-center gap-1.5"
											>
												{check.met ? (
													<Check className="w-3 h-3 text-emerald-500" />
												) : (
													<X className="w-3 h-3 text-slate-300 dark:text-slate-600" />
												)}
												<span
													className={cn(
														"text-xs",
														check.met
															? "text-emerald-600"
															: "text-slate-400 dark:text-slate-500",
													)}
												>
													{check.label}
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Confirm Password */}
						<div className="space-y-1.5">
							<Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
								Confirm Password
							</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									placeholder="Confirm your password"
									value={form.confirmPassword}
									onChange={(e) =>
										setForm({
											...form,
											confirmPassword: e.target.value,
										})
									}
									className={cn(
										"h-11 rounded-xl bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 transition-all duration-300 pr-10",
										errors.confirmPassword && "border-red-400",
									)}
								/>
								<button
									type="button"
									onClick={() =>
										setShowConfirmPassword(!showConfirmPassword)
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
								>
									{showConfirmPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
							{errors.confirmPassword && (
								<p className="text-xs text-red-500">
									{errors.confirmPassword}
								</p>
							)}
						</div>

						{/* Terms */}
						<div className="flex items-start gap-2 pt-1">
							<Checkbox
								id="terms"
								checked={agreed}
								onCheckedChange={(checked) =>
									setAgreed(checked === true)
								}
								className="mt-0.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
							/>
							<Label
								htmlFor="terms"
								className={cn(
									"text-sm text-slate-500 dark:text-slate-400 font-normal leading-snug cursor-pointer",
									errors.agreed && "text-red-500",
								)}
							>
								I agree to the{" "}
								<span className="text-indigo-600 hover:underline cursor-pointer">
									Terms of Service
								</span>{" "}
								and{" "}
								<span className="text-indigo-600 hover:underline cursor-pointer">
									Privacy Policy
								</span>
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
									Creating Account...
								</span>
							) : (
								<span className="flex items-center gap-2">
									Create Account
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

					{/* Login link */}
					<p className="text-center text-sm text-slate-500 dark:text-slate-400">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-indigo-600 font-medium hover:underline"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
