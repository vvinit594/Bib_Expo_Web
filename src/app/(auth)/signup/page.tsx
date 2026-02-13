"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export default function SignupPage() {
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    // TODO: Connect Supabase signup (next step)
    router.push("/dashboard");
  }

  return (
    <AuthCard>
      <div>
        <p className="text-sm font-semibold tracking-wide text-[color:var(--muted-foreground)]">
          Volunteer Registration
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Create account</h2>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
          Use your volunteer email to register for expo operations access.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-12 space-y-5">
        <AuthInput name="username" label="Username" placeholder="Your name" autoComplete="name" />
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
          placeholder="Create a password"
          type="password"
          autoComplete="new-password"
          required
        />
        <AuthInput
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter password"
          type="password"
          autoComplete="new-password"
          required
          error={error ?? undefined}
        />

        <PrimaryButton type="submit">Create Account</PrimaryButton>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-[color:var(--muted-foreground)]">
              Already registered?
            </span>
          </div>
        </div>

        <p className="text-center text-sm text-[color:var(--muted-foreground)]">
          <Link
            href="/login"
            className="font-semibold text-[color:var(--primary)] hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

