"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ParticipantStatus = "pending" | "collected" | "collected-by-behalf" | "on-spot";

type Participant = {
  id: string;
  name: string;
  bib: string;
  bibNumber?: number;
  category: string;
  status: ParticipantStatus;
  group?: string;
  registeredOn: string;
  emailVerified: boolean;
  paymentStatus: "paid" | "pending";
  collectedAt?: string;
  collectedBy?: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  counterName: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [query, setQuery] = React.useState("");
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showBehalfModalFor, setShowBehalfModalFor] = React.useState<Participant | null>(null);
  const [showOnSpotModal, setShowOnSpotModal] = React.useState(false);
  const [collectingId, setCollectingId] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{
    total: number;
    collected: number;
    pending: number;
    onSpot: number;
  } | null>(null);
  const [behalfForm, setBehalfForm] = React.useState({
    name: "",
    contact: "",
    relation: "",
  });

  const isAdmin = user?.role === "ADMIN";
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  async function fetchParticipants() {
    setLoading(true);
    try {
      const q = query.trim() ? `?q=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/participants${q}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      } else {
        setParticipants([]);
      }
    } catch {
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => fetchParticipants(), 300);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    fetch("/api/participants/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, [participants]);

  async function handleMarkCollected(p: Participant, type: "self" | "behalf", extra?: { name: string; contact: string; relation: string }) {
    if (collectingId) return;
    setCollectingId(p.id);
    try {
      const res = await fetch(`/api/participants/${p.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "self"
            ? { type: "self" }
            : { type: "behalf", behalfName: extra?.name, behalfContact: extra?.contact, behalfRelation: extra?.relation }
        ),
      });
      if (res.ok) {
        setShowBehalfModalFor(null);
        setBehalfForm({ name: "", contact: "", relation: "" });
        fetchParticipants();
      }
    } finally {
      setCollectingId(null);
    }
  }

  const filtered = participants;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#4C1D95] to-[#E11D48] text-xs font-semibold text-white shadow-sm">
              B
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Bib Expo</span>
              <span className="text-[0.7rem] text-slate-500">
                {isAdmin ? "Admin Dashboard" : "Volunteer Dashboard"}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Mumbai Marathon 2026</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop: inline admin controls + user info */}
            {isAdmin && (
              <>
                <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-[0.7rem] font-semibold text-amber-800 md:inline-flex">
                  Admin
                </span>
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
                >
                  Create Volunteer
                </Link>
                <Link
                  href="/admin/import"
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
                >
                  Import Excel
                </Link>
              </>
            )}
            <div className="hidden items-end gap-2 text-xs md:flex">
              <div className="flex flex-col items-end">
                <span className="font-medium text-slate-900">
                  {user?.counterName ?? "Counter 4 – 10K"}
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  {isAdmin ? "Admin" : "Volunteer"}: {user?.name ?? "—"}
                </span>
              </div>
              <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {user?.name?.charAt(0)?.toUpperCase() ?? "—"}
              </span>
            </div>

            {/* Mobile/tablet: menu toggle + dropdown */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-xs font-medium text-slate-900">
                        {user?.counterName ?? "Counter 4 – 10K"}
                      </p>
                      <p className="text-[0.7rem] text-slate-500">
                        {isAdmin ? "Admin" : "Volunteer"}: {user?.name ?? "—"}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="border-b border-slate-100 px-2 py-2">
                        <span className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[0.7rem] font-semibold text-amber-800">
                          Admin
                        </span>
                        <div className="mt-2 flex flex-col gap-1">
                          <Link
                            href="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Create Volunteer
                          </Link>
                          <Link
                            href="/admin/import"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Import Excel
                          </Link>
                        </div>
                      </div>
                    )}
                    <div className="px-2 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setMobileMenuOpen(false);
                          await fetch("/api/auth/logout", { method: "POST" });
                          router.push("/login");
                          router.refresh();
                        }}
                        className="flex h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
              className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Live status strip */}
        <div className="border-t border-slate-200 bg-slate-50/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-[0.75rem] text-slate-600 sm:px-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[0.7rem] font-medium text-emerald-700 ring-1 ring-emerald-100">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                System Status: Online · Synced
              </span>
              <span>Active Volunteers: 12</span>
              <span>Expo Day: Day 1</span>
              <span>Counter: 10K Distribution</span>
            </div>
            <div className="flex items-center gap-2 text-[0.7rem] text-slate-500">
              <span className="relative inline-flex size-2.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Auto sync · Last synced 2 sec ago</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row">
        <section className="flex-1 space-y-6">
          {/* Search section */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Participant Search
                </h1>
                <p className="text-[0.75rem] text-slate-500">
                  Search by bib number, name, phone, or email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnSpotModal(true)}
                className="hidden items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex"
              >
                <span>➕</span>
                <span>New On-Spot Registration</span>
              </button>
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by bib number or name..."
                className="h-11 w-full flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
              />
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#E11D48] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#BE123C] sm:w-auto"
              >
                🔍 Search
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowOnSpotModal(true)}
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:hidden"
            >
              ➕ New On-Spot Registration
            </button>
          </div>

          {/* Results */}
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 sm:p-5">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
                matches
              </span>
              <button className="hidden text-[0.7rem] font-medium text-slate-600 underline-offset-2 hover:underline sm:inline">
                Advanced filters (coming soon)
              </button>
            </div>

            <div className="space-y-3">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm sm:px-4 sm:py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-900">{p.name}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.7rem] font-medium text-slate-700">
                          {p.bib}
                        </span>
                        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-sky-700">
                          {p.category}
                        </span>
                      </div>
                      {p.group ? (
                        <p className="mt-1 text-[0.7rem] text-slate-500">Group: {p.group}</p>
                      ) : null}
                    </div>
                    <span
                      className={
                        p.status === "pending"
                          ? "inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[0.7rem] font-semibold text-amber-700 ring-1 ring-amber-100"
                          : p.status === "collected" || p.status === "collected-by-behalf"
                            ? "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                            : "inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-[0.7rem] font-semibold text-sky-700 ring-1 ring-sky-100"
                      }
                    >
                      {p.status === "pending"
                        ? "Pending"
                        : p.status === "collected-by-behalf"
                          ? "Collected (Behalf)"
                          : p.status === "collected"
                            ? "Collected"
                            : "On-spot"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[0.7rem] text-slate-500">
                    <span>
                      Registered:{" "}
                      <span className="font-medium text-slate-700">{p.registeredOn}</span>
                    </span>
                    <span>
                      Email:{" "}
                      <span className="font-medium text-emerald-600">
                        {p.emailVerified ? "Verified" : "Not verified"}
                      </span>
                    </span>
                    <span>
                      Payment:{" "}
                      <span className="font-medium text-emerald-600">
                        {p.paymentStatus === "paid" ? "Paid" : "Pending"}
                      </span>
                    </span>
                    {p.collectedAt && p.collectedBy ? (
                      <span>
                        Collected at {p.collectedAt} ·{" "}
                        <span className="font-medium text-slate-700">{p.collectedBy}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 pt-1 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between">
                    {p.group ? (
                      <button className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm transition hover:bg-slate-800">
                        📦 Collect Entire Group
                      </button>
                    ) : (
                      <span className="text-[0.7rem] text-slate-500">
                        Single participant record
                      </span>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {p.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkCollected(p, "self")}
                            disabled={collectingId === p.id}
                            className="inline-flex items-center justify-center rounded-full bg-[#E11D48] px-3.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
                          >
                            {collectingId === p.id ? "..." : "Mark as Collected"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBehalfModalFor(p)}
                            disabled={!!collectingId}
                            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Collected on Behalf
                          </button>
                        </>
                      )}
                      {(p.status === "collected" || p.status === "collected-by-behalf") && (
                        <button
                          disabled
                          className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                        >
                          ✅ Already Collected
                        </button>
                      )}
                      {p.status === "on-spot" && (
                        <button
                          disabled
                          className="inline-flex items-center justify-center rounded-full bg-sky-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-sky-700 ring-1 ring-sky-100"
                        >
                          On-Spot Registration
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {loading && (
                <p className="py-6 text-center text-sm text-slate-500">Loading...</p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  {participants.length === 0
                    ? "No participants yet. Upload Excel from Admin Import to get started."
                    : "No participants match this search."}
                </p>
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 sm:p-5">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <span className="text-[0.7rem] text-slate-500">Last 20 actions</span>
            </div>
            <ul className="divide-y divide-slate-100 text-[0.75rem]">
              {participants
                .filter((p) => p.status !== "pending")
                .slice(0, 20)
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span className="text-slate-700">
                      {p.name} – {p.status === "collected" ? "Collected" : "Collected (Behalf)"} – {p.category || "—"}
                    </span>
                    <span className="text-slate-400">{p.collectedAt ?? "—"}</span>
                  </li>
                ))}
              {participants.filter((p) => p.status !== "pending").length === 0 && (
                <li className="py-4 text-center text-slate-500">No collection activity yet</li>
              )}
            </ul>
          </div>
        </section>

        {/* Right stats panel (desktop) */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-2xl bg-slate-900 px-4 py-4 text-xs text-slate-100 shadow-lg shadow-slate-900/30 sm:px-5 sm:py-5">
            <h2 className="text-sm font-semibold">Live Expo Stats</h2>
            <p className="mt-1 text-[0.7rem] text-slate-300">
              Updated automatically as volunteers mark collections.
            </p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Total Participants</dt>
                <dd className="text-sm font-semibold text-white">{stats?.total ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Collected</dt>
                <dd className="text-sm font-semibold text-emerald-400">{stats?.collected ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Pending</dt>
                <dd className="text-sm font-semibold text-amber-300">{stats?.pending ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">On-spot</dt>
                <dd className="text-sm font-semibold text-sky-300">{stats?.onSpot ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="hidden rounded-2xl bg-white p-4 text-[0.75rem] text-slate-600 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 lg:block">
            <p className="font-semibold text-slate-900">Expo Operations Tips</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Confirm ID before marking collected.</li>
              <li>• Use “Collected on Behalf” for team pickups.</li>
              <li>• Keep search history clear between groups.</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Collected on behalf modal */}
      {showBehalfModalFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">Collected on Behalf</h2>
            <p className="mt-1 text-xs text-slate-500">
              Record who is collecting the kit for{" "}
              <span className="font-medium text-slate-800">{showBehalfModalFor.name}</span>.
            </p>
            <form
              className="mt-4 space-y-3 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                handleMarkCollected(showBehalfModalFor, "behalf", behalfForm);
              }}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Collector name</label>
                <input
                  required
                  value={behalfForm.name}
                  onChange={(e) => setBehalfForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="Full name of collector"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Contact number</label>
                <input
                  value={behalfForm.contact}
                  onChange={(e) => setBehalfForm((f) => ({ ...f, contact: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Relation</label>
                <input
                  value={behalfForm.relation}
                  onChange={(e) => setBehalfForm((f) => ({ ...f, relation: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="Friend, family, coach..."
                />
              </div>
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowBehalfModalFor(null);
                    setBehalfForm({ name: "", contact: "", relation: "" });
                  }}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectingId === showBehalfModalFor.id || !behalfForm.name.trim()}
                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#E11D48] px-4 font-semibold text-white shadow-sm hover:bg-[#BE123C] disabled:opacity-60"
                >
                  {collectingId === showBehalfModalFor.id ? "Saving..." : "Confirm Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-spot registration modal */}
      {showOnSpotModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">New On-Spot Registration</h2>
            <p className="mt-1 text-xs text-slate-500">
              Capture walk-in participant details and auto-generate a bib.
            </p>
            <form className="mt-4 space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Full name</label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="Participant name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Category</label>
                <select className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200">
                  <option>10K</option>
                  <option>Half Marathon</option>
                  <option>Full Marathon</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Phone</label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Payment mode</label>
                <select className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200">
                  <option>UPI</option>
                  <option>Cash</option>
                  <option>Card</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Auto-generated Bib</label>
                <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <span>Will be assigned on submit</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                    #TEMP-XXXX
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowOnSpotModal(false)}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnSpotModal(false)}
                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#E11D48] px-4 font-semibold text-white shadow-sm hover:bg-[#BE123C]"
                >
                  Save & Mark On-Spot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

