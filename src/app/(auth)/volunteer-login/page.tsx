"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

function VolunteerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/volunteer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div>
        <p className="text-sm font-semibold tracking-wide text-[color:var(--muted-foreground)]">
          Volunteer Access
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Login</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Sign in to search participants and mark kit collection status.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-12 space-y-5">
        <AuthInput
          name="email"
          label="Email"
          placeholder="name@company.com"
          type="email"
          autoComplete="email"
          required
        />
        <AuthInput
          name="password"
          label="Password"
          placeholder="Your password"
          type="password"
          autoComplete="current-password"
          required
          error={error ?? undefined}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[color:var(--muted-foreground)]">
            Forgot password? (coming soon)
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold text-[color:var(--primary)] hover:underline"
          >
            Admin login
          </Link>
        </div>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}

export default function VolunteerLoginPage() {
  return (
    <React.Suspense fallback={<AuthCard><div className="animate-pulse h-64" /></AuthCard>}>
      <VolunteerLoginForm />
    </React.Suspense>
  );
}
