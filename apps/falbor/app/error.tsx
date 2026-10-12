"use client";

import { useEffect } from "react";
import { Button } from "~/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      className="dark min-h-[100dvh] w-full flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: "url('/background/auth.png')" }}
    >
      <div className="w-full max-w-md bg-black/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="flex justify-center">
          <img src="/logo-dark-styled.png" alt="Falbor" className="w-28" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
          <p className="text-sm text-zinc-400">
            An unexpected error occurred while processing your request. Please try again.
          </p>
        </div>
        <div className="pt-2 flex gap-3">
          <Button variant="outline" className="w-full" onClick={() => reset()}>
            Try again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = "/")}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
