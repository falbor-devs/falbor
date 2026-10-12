"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/Card";
import { TextShimmer } from "~/components/ui/text-shimmer";
import { ThemeHandler } from "~/components/landing/ThemeHandler";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [step, setStep] = useState<"email" | "code" | "password" | "success">("email");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const paramEmail = searchParams.get("email");
        if (paramEmail) {
            setEmail(paramEmail);
        }
    }, [searchParams]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                setError(data.error || "Failed to send verification code.");
                return;
            }

            setMessage(`A 6-digit code has been sent to ${email}. Please check your inbox.`);
            setStep("code");
        } catch (err) {
            setLoading(false);
            setError("Something went wrong. Please try again.");
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                setError(data.error || "Invalid verification code.");
                return;
            }

            setStep("password");
        } catch (err) {
            setLoading(false);
            setError("Something went wrong. Please try again.");
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, password: newPassword }),
            });
            const data = await res.json();
            setLoading(false);

            if (!res.ok) {
                setError(data.error || "Failed to reset password.");
                return;
            }

            setStep("success");
        } catch (err) {
            setLoading(false);
            setError("Something went wrong. Please try again.");
        }
    };

    return (
        <Card className="w-full md:w-[400px] mx-0 md:mx-4 mt-auto md:mt-0 relative z-10 bg-black/50 backdrop-blur-md border-0 border-t md:border border-zinc-800 rounded-none rounded-t-[32px] md:rounded-xl overflow-y-auto max-h-[100dvh] pb-8 md:pb-0">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <img src="/logo-light-styled.png" alt="Falbor" className="w-24 inline-block dark:hidden" />
                    <img src="/logo-dark-styled.png" alt="Falbor" className="w-24 inline-block hidden dark:block" />
                </div>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                    <TextShimmer>
                        {step === "email" && "Enter your email to receive a verification code"}
                        {step === "code" && "Enter the 6-digit code sent to your email"}
                        {step === "password" && "Enter and confirm your new password"}
                        {step === "success" && "Your password has been reset successfully"}
                    </TextShimmer>
                </CardDescription>
            </CardHeader>

            {step === "email" && (
                <form onSubmit={handleSendCode} autoComplete="off">
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
                                autoComplete="off"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3 mt-4">
                        <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                            {loading ? "Sending code..." : "Send code"}
                        </Button>
                        <p className="text-sm text-falbor-elements-textSecondary mt-2">
                            Remember your password?{" "}
                            <Link href="/login" className="text-accent-500 hover:underline">
                                Log in
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            )}

            {step === "code" && (
                <form onSubmit={handleVerifyCode} autoComplete="off">
                    <CardContent className="space-y-4">
                        {message && (
                            <div className="text-sm text-green-400 bg-green-500/10 rounded-md px-3 py-2">{message}</div>
                        )}
                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">6-Digit Verification Code</label>
                            <Input
                                type="text"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value.trim())}
                                maxLength={6}
                                required
                                autoFocus
                                className="tracking-widest text-center text-lg font-mono"
                                autoComplete="off"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3 mt-4">
                        <Button type="submit" variant="outline" className="w-full" disabled={loading || code.length < 6}>
                            {loading ? "Verifying..." : "Verify code"}
                        </Button>
                        <div className="flex justify-between w-full text-xs text-falbor-elements-textSecondary mt-2">
                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="hover:underline text-gray-400"
                            >
                                Change email
                            </button>
                            <button
                                type="button"
                                onClick={handleSendCode}
                                className="text-accent-500 hover:underline"
                            >
                                Resend code
                            </button>
                        </div>
                    </CardFooter>
                </form>
            )}

            {step === "password" && (
                <form onSubmit={handleResetPassword} autoComplete="off">
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                    autoComplete="off"
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
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">Confirm New Password</label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                    autoComplete="off"
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
                    </CardContent>
                    <CardFooter className="flex-col gap-3 mt-4">
                        <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                            {loading ? "Saving password..." : "Reset password"}
                        </Button>
                    </CardFooter>
                </form>
            )}

            {step === "success" && (
                <CardContent className="space-y-4 text-center">
                    <div className="text-sm text-green-400 bg-green-500/10 rounded-md px-3 py-3">
                        Your password has been changed successfully.
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => router.push("/login")}
                    >
                        Log in with new password
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div
            className="dark min-h-[100dvh] w-full flex flex-col justify-end md:justify-center items-center bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/background/auth.png')" }}
        >
            <ThemeHandler force="dark" />
            <Suspense fallback={null}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
