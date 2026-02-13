"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    void fd;

    // TODO: Connect Supabase login (next step)
    router.push("/dashboard");
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
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-[color:var(--muted-foreground)]">
            Forgot password? (coming soon)
          </span>
          <Link
            href="/signup"
            className="text-xs font-semibold text-[color:var(--primary)] hover:underline"
          >
            Create account
          </Link>
        </div>

        <PrimaryButton type="submit">Login</PrimaryButton>
      </form>
    </AuthCard>
  );
}

