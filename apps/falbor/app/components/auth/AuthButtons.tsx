"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/Button";
import { useAuth } from "~/hooks/useAuth";

export function AuthButtons() {
  const { user } = useAuth();
  const router = useRouter();

  if (user) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
        Log in
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => router.push("/signup")}
        className="bg-accent-500 text-white hover:bg-accent-600"
      >
        Sign up
      </Button>
    </div>
  );
}
