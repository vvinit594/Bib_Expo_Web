"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScrollAwareHeader } from "@/components/ui/ScrollAwareHeader";

type Volunteer = {
  id: string;
  name: string;
  email: string;
  counterName: string;
  createdAt: string;
  status: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [counterName, setCounterName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = React.useState(false);
  const [volunteers, setVolunteers] = React.useState<Volunteer[]>([]);
  const [volunteersLoading, setVolunteersLoading] = React.useState(true);
  const [deleteConfirmFor, setDeleteConfirmFor] = React.useState<Volunteer | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchVolunteers = React.useCallback(() => {
    setVolunteersLoading(true);
    fetch("/api/admin/volunteers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.volunteers && setVolunteers(data.volunteers))
      .catch(() => setVolunteers([]))
      .finally(() => setVolunteersLoading(false));
  }, []);

  React.useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password,
          counterName: counterName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setShowSuccessPopup(true);
      setName("");
      setEmail("");
      setPassword("");
      setCounterName("");
      fetchVolunteers();
      setTimeout(() => setShowSuccessPopup(false), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmFor) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/volunteers/${deleteConfirmFor.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setVolunteers((prev) => prev.filter((v) => v.id !== deleteConfirmFor.id));
        setDeleteConfirmFor(null);
      } else {
        setError(data.error ?? "Failed to delete volunteer");
      }
    } catch {
      setError("Failed to delete volunteer.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <ScrollAwareHeader>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#4C1D95] to-[#E11D48] text-xs font-semibold text-white shadow-sm">
              B
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Bib Expo</span>
              <span className="text-[0.7rem] text-slate-500">Admin Panel</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                router.refresh();
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </ScrollAwareHeader>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Create Volunteer Account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add a new volunteer. Set their credentials for first login.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Volunteer full name"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteer@example.com"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="counterName" className="block text-sm font-medium text-slate-700">
                Counter No./Name
              </label>
              <input
                id="counterName"
                value={counterName}
                onChange={(e) => setCounterName(e.target.value)}
                placeholder="e.g. Counter 4 – 10K"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#E11D48] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Volunteer"}
            </button>
          </form>
        </div>

        {/* Volunteer list */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Manage Volunteers</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            All created volunteers. Deleting removes access immediately.
          </p>

          {volunteersLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading volunteers...</p>
          ) : volunteers.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No volunteers yet. Create one above.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="pb-3 pr-4 font-medium">Username</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Counter No./Name</th>
                      <th className="pb-3 pr-4 font-medium">Created</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map((v) => (
                      <tr key={v.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-900">{v.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{v.email}</td>
                        <td className="py-3 pr-4 text-slate-600">{v.counterName}</td>
                        <td className="py-3 pr-4 text-slate-500">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setDeleteConfirmFor(v);
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="mt-6 space-y-3 md:hidden">
                {volunteers.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{v.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{v.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {v.counterName} · {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          {v.status}
                        </span>
                      </div>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setDeleteConfirmFor(v);
                          }}
                        className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <p className="text-center font-semibold text-emerald-700">
                Volunteer Account Created Successfully ✅
              </p>
              <p className="mt-1 text-center text-sm text-slate-500">
                The volunteer list has been updated.
              </p>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteConfirmFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <p className="text-center font-medium text-slate-900">
                Are you sure you want to delete this volunteer?
              </p>
              <p className="mt-1 text-center text-sm text-slate-500">
                {deleteConfirmFor.name} ({deleteConfirmFor.email}) will lose access immediately.
              </p>
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmFor(null);
                    setError(null);
                  }}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
