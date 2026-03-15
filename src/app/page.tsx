import Link from "next/link";
import Image from "next/image";

import { Navbar } from "@/components/marketing/Navbar";

export default function Home() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#4C1D95_0%,#E11D48_45%,#7F1D1D_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
        {/* Hero (single, centered section) */}
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="w-full rounded-3xl bg-white/95 px-6 py-8 shadow-2xl shadow-slate-900/25 ring-1 ring-white/60 backdrop-blur-md sm:px-10 sm:py-10">
            <p className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 shadow-sm ring-1 ring-rose-100">
              Built for Marathon Expo Operations
            </p>
            <div className="mt-4 space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                Smart Bib Distribution Made Simple
              </h1>
              <p className="text-sm leading-6 text-slate-600 sm:text-base">
                Replace manual Excel sheets with real-time participant verification, instant status
                updates, and smooth expo floor operations. Give every volunteer a system that feels
                as organized as your race.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href="/admin-login"
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-800 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                Admin Login
              </Link>
              <Link
                href="/organizer-login"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#E11D48] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#BE123C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              >
                Organizer Login
              </Link>
              <Link
                href="/volunteer-login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                Volunteer Login
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-6 text-xs text-slate-600">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">Expo-ready</p>
                <p>Built for high-volume race day bib distribution.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">Operational clarity</p>
                <p>Live view of what’s collected and what’s pending.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-4 border-t border-white/20 pt-6 pb-8 text-[0.75rem] text-slate-100">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="font-medium text-white">Bib Expo</p>
              <p className="text-slate-100/80">
                Operational toolkit for real-time bib distribution.
              </p>
            </div>
            <p className="text-slate-100/80">© 2026 Bib Expo Management.</p>
          </div>

          {/* Branding section */}
          <div className="mx-auto flex max-w-[1000px] flex-col items-stretch gap-[30px] border-t border-white/10 pt-6 text-center sm:flex-row sm:justify-between sm:items-center sm:gap-[120px]">
            {/* Left: Powered by Fitskol */}
            <div className="flex flex-1 flex-col items-center">
              <p className="mb-[10px] text-[14px] font-semibold tracking-[0.5px] text-slate-100 opacity-90">
                Powered by Fitskol
              </p>
              <a
                href="https://www.fitskol.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex h-[120px] w-[260px] shrink-0 cursor-pointer items-center justify-center"
              >
                <Image
                  src="/brand_logo.jpeg"
                  alt="Fitskol"
                  width={260}
                  height={120}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 ease-in-out hover:scale-105"
                  loading="lazy"
                  fetchPriority="low"
                />
              </a>
            </div>

            {/* Vertical divider - hidden on mobile */}
            <div className="hidden h-20 w-px shrink-0 self-center bg-white/20 sm:block" aria-hidden />

            {/* Right: Supported by BookMyRun */}
            <div className="flex flex-1 flex-col items-center">
              <p className="mb-[10px] text-[14px] font-semibold tracking-[0.5px] text-slate-100 opacity-90">
                Supported by BookMyRun
              </p>
              <a
                href="https://bookmyrun.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex h-[120px] w-[260px] shrink-0 cursor-pointer items-center justify-center"
              >
                <Image
                  src="/bookmyrunlogo.jpeg"
                  alt="BookMyRun"
                  width={260}
                  height={120}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 ease-in-out hover:scale-105"
                  loading="lazy"
                  fetchPriority="low"
                />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
