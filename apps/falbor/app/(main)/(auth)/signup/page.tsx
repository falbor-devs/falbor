"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/Card";
import BackgroundRays from "~/components/ui/BackgroundRays";
import { TextShimmer } from "~/components/ui/text-shimmer";
import { GoogleLogin } from "@react-oauth/google";
import { ThemeHandler } from "~/components/landing/ThemeHandler";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loginUri, setLoginUri] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get("role");
        const baseUri = window.location.origin + "/api/auth/google";
        setLoginUri(role ? `${baseUri}?role=${role}` : baseUri);
    }, []);

    const { register, loginWithGoogle } = useAuth();
    const router = useRouter();

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!acceptTerms) {
            setError("You must accept the Terms of Service and Privacy Policy");
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            setError("Please enter a valid email address (e.g. name@domain.com)");
            return;
        }

        if (!isPasswordValid) {
            setError("Password does not meet the security requirements");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setSubmitting(true);
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get("role") || undefined;
        const result = await register(email, password, roleParam);
        setSubmitting(false);

        if (result.error) {
            setError(result.error);
        } else if (result.requiresVerification) {
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get("role");
            const verifiedUrl = role === "marketer"
                ? `/verified?email=${encodeURIComponent(email)}&role=marketer`
                : `/verified?email=${encodeURIComponent(email)}`;
            router.push(verifiedUrl);
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get("role");
            router.push(role === "marketer" ? "/marketer-onboarding" : "/welcome");
        }
    };

    return (
        <div
            className="dark min-h-[100dvh] w-full flex flex-col justify-end md:justify-center items-center bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/background/auth.png')" }}
        >
            <ThemeHandler force="dark" />
            <Card className="w-full md:w-[400px] mx-0 md:mx-4 mt-auto md:mt-0 relative z-10 bg-black/50 backdrop-blur-md border-0 border-t md:border border-zinc-800 rounded-none rounded-t-[32px] md:rounded-xl overflow-y-auto max-h-[100dvh] pb-8 md:pb-0">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-light-styled.png" alt="Falbor" className="w-24 inline-block dark:hidden" />
                        <img src="/logo-dark-styled.png" alt="Falbor" className="w-24 inline-block hidden dark:block" />
                    </div>
                    <CardTitle>Create your account</CardTitle>
                    <CardDescription><TextShimmer>Sign up to start building with Falbor</TextShimmer></CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">Email</label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {showPassword ? (
                                        <span className="i-ph:eye-slash block h-4 w-4" />
                                    ) : (
                                        <span className="i-ph:eye block h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <div className="space-y-1 mt-2 text-xs">
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Password requirements:</p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                    <span className={hasMinLength ? "text-green-500 flex items-center gap-1" : "text-red-500/70 dark:text-gray-500 flex items-center gap-1"}>
                                        <span>{hasMinLength ? "✓" : "✗"}</span> Min 8 characters
                                    </span>
                                    <span className={hasUppercase ? "text-green-500 flex items-center gap-1" : "text-red-500/70 dark:text-gray-500 flex items-center gap-1"}>
                                        <span>{hasUppercase ? "✓" : "✗"}</span> 1 uppercase letter
                                    </span>
                                    <span className={hasLowercase ? "text-green-500 flex items-center gap-1" : "text-red-500/70 dark:text-gray-500 flex items-center gap-1"}>
                                        <span>{hasLowercase ? "✓" : "✗"}</span> 1 lowercase letter
                                    </span>
                                    <span className={hasNumber ? "text-green-500 flex items-center gap-1" : "text-red-500/70 dark:text-gray-500 flex items-center gap-1"}>
                                        <span>{hasNumber ? "✓" : "✗"}</span> 1 number
                                    </span>
                                    <span className={hasSpecialChar ? "text-green-500 flex items-center gap-1" : "text-red-500/70 dark:text-gray-500 flex items-center gap-1"}>
                                        <span>{hasSpecialChar ? "✓" : "✗"}</span> 1 special char
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">Confirm password</label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Repeat your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {showConfirmPassword ? (
                                        <span className="i-ph:eye-slash block h-4 w-4" />
                                    ) : (
                                        <span className="i-ph:eye block h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pt-2">
                            <input
                                id="accept-terms"
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-800 text-purple-600 focus:ring-purple-500/50 cursor-pointer"
                                required
                            />
                            <label htmlFor="accept-terms" className="text-xs text-falbor-elements-textSecondary select-none cursor-pointer">
                                I agree to the{" "}
                                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                                    Privacy Policy
                                </a>
                            </label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
                            {submitting ? "Creating account..." : "Create account"}
                        </Button>
                        <div className="relative w-full py-2 flex items-center justify-center">
                            <div className="border-t border-falbor-elements-border flex-grow"></div>
                            <span className="bg-falbor-elements-background-depth-1 px-3 text-xs text-falbor-elements-textSecondary">OR</span>
                            <div className="border-t border-falbor-elements-border flex-grow"></div>
                        </div>
                        <div className="w-full flex justify-center h-[40px]">
                            {loginUri && (
                                <GoogleLogin
                                    ux_mode="redirect"
                                    login_uri={loginUri}
                                    useOneTap
                                    onSuccess={() => { }}
                                    theme="outline"
                                    shape="rectangular"
                                    size="large"
                                    text="continue_with"
                                    width="352"
                                />
                            )}
                        </div>
                        <p className="text-sm text-falbor-elements-textSecondary mt-2">
                            Already have an account?{" "}
                            <Link href="/login" className="text-accent-500 hover:underline">
                                Log in
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
