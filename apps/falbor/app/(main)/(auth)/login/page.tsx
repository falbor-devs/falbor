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

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loginUri, setLoginUri] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get("role");
        const baseUri = window.location.origin + "/api/auth/google";
        setLoginUri(role ? `${baseUri}?role=${role}` : baseUri);
    }, []);

    const { login, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        const result = await login(email, password);
        setSubmitting(false);
        if (result.requiresVerification) {
            router.push(`/verified?email=${encodeURIComponent(email)}`);
        } else if (result.error) {
            setError(result.error);
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get("role");
            const redirectUrl = urlParams.get("redirect");
            if (role === "marketer") {
                router.push("/marketer-onboarding");
            } else if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                router.push("/");
            }
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
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription><TextShimmer>Log in to your account to continue</TextShimmer></CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit} autoComplete="off">
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
                                readOnly
                                onFocus={(e) => e.target.removeAttribute('readonly')}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm text-falbor-elements-textSecondary">Password</label>
                                <Link
                                    href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                                    className="text-xs text-accent-500 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                    autoComplete="off"
                                    readOnly
                                    onFocus={(e) => e.target.removeAttribute('readonly')}
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
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
                            {submitting ? "Logging in..." : "Log in"}
                        </Button>
                        <div className="relative w-full py-2 flex items-center justify-center">
                            <div className="border-t dark:border-[#2B2A33] border-falbor-elements-border flex-grow"></div>
                            <span className="bg-falbor-elements-background-depth-1 px-3 text-xs text-falbor-elements-textSecondary">OR</span>
                            <div className="border-t dark:border-[#2B2A33] border-falbor-elements-border flex-grow"></div>
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
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="text-accent-500 hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
