"use client";

import Link from "next/link";

export default function AdminImportPage() {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#4C1D95] to-[#E11D48] text-xs font-semibold text-white shadow-sm">
              B
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Bib Expo</span>
              <span className="text-[0.7rem] text-slate-500">Import Excel</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Create Volunteer
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Excel Import</h1>
          <p className="mt-2 text-sm text-slate-500">
            Upload participant data from Excel. This feature will be implemented next.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#E11D48] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#BE123C]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
