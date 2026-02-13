"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type AuthInputProps = React.ComponentPropsWithoutRef<"input"> & {
  label: string;
  error?: string;
};

export function AuthInput({ className, label, error, id, ...props }: AuthInputProps) {
  const fallbackId = React.useId();
  const inputId = id ?? fallbackId;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[color:var(--foreground)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full rounded-lg border border-border bg-white px-4 text-[color:var(--foreground)] shadow-sm transition",
          "placeholder:text-[color:var(--muted-foreground)]",
          "hover:border-black/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-0 focus-visible:border-[color:var(--primary)]",
          error ? "border-red-500 focus-visible:border-red-500" : "",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

