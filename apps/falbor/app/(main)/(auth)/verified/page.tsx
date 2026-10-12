"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "~/hooks/useAuth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/Card";
import BackgroundRays from "~/components/ui/BackgroundRays";
import { TextShimmer } from "~/components/ui/text-shimmer";

import { Suspense } from "react";

function VerifiedForm() {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { refresh } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const role = searchParams.get("role");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();
            if (res.ok) {
                await refresh();
                router.push(role === "marketer" ? "/marketer-onboarding" : "/welcome");
                router.refresh();
            } else {
                setError(data.error || "Verification failed");
            }
        } catch {
            setError("Network error, please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <BackgroundRays />
            <Card className="w-[400px] mx-4 relative z-10">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-light-styled.png" alt="Falbor" className="w-24 inline-block dark:hidden" />
                        <img src="/logo-dark-styled.png" alt="Falbor" className="w-24 inline-block hidden dark:block" />
                    </div>
                    <CardTitle>Verify your Email</CardTitle>
                    <CardDescription>
                        <TextShimmer>We sent a 6-digit code to {email}</TextShimmer>
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm text-falbor-elements-textSecondary">Verification Code</label>
                            <Input
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                maxLength={6}
                                className="text-center text-lg tracking-widest font-semibold"
                                autoFocus
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-3">
                        <Button type="submit" variant="outline" className="w-full" disabled={submitting || code.length !== 6}>
                            {submitting ? "Verifying..." : "Verify Account"}
                        </Button>
                        <p className="text-sm text-falbor-elements-textSecondary mt-2">
                            Didn't receive the email? Check your spam folder or console logs.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
export default function VerifiedPage() { return <Suspense fallback={null}><VerifiedForm /></Suspense>; }
