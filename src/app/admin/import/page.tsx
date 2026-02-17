"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScrollAwareHeader } from "@/components/ui/ScrollAwareHeader";

type ImportResult = {
  success: boolean;
  totalRows?: number;
  imported?: number;
  failed?: number;
  failedDetails?: { row: number; reason: string }[];
  bibRange?: { start: number; end: number };
  error?: string;
};

export default function AdminImportPage() {
  const router = useRouter();
  const [eventName, setEventName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [participantCount, setParticipantCount] = React.useState<number | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/participants/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data != null && setParticipantCount(data.count))
      .catch(() => {});
  }, [result]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setResult(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f);
      setResult(null);
      setError(null);
    } else {
      setError("Please upload an Excel file (.xlsx or .xls)");
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!eventName.trim()) {
      setError("Event name is required");
      return;
    }
    if (!file) {
      setError("Please select an Excel file");
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("eventName", eventName.trim());
      formData.append("file", file);

      const res = await fetch("/api/admin/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setResult(data);
        return;
      }

      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export-excel");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bib-expo-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-event-data", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Delete failed");
        return;
      }
      setShowDeleteConfirm(false);
      setResult(null);
      setParticipantCount(0);
      router.refresh();
    } catch {
      setError("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const hasParticipants = (participantCount ?? 0) > 0;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <ScrollAwareHeader>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
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
      </ScrollAwareHeader>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Upload section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Excel Import</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload participant data. Bib numbers start from 5001. Supported columns: Name (or First Name + Last Name), Email ID, Phone #, Event Category, Group, Age, Gender, T-Shirt Size, Payment Status.
          </p>

          <form onSubmit={handleUpload} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label htmlFor="eventName" className="block text-sm font-medium text-slate-700">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                id="eventName"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Run For Hope"
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 transition hover:border-slate-300"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-slate-600">
                {file ? file.name : "Drag & drop Excel file or click to browse"}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm font-medium text-[#E11D48] hover:underline"
              >
                {file ? "Change file" : "Select file"}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {result && result.success && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <p className="font-medium">
                  Imported {result.imported} participant(s). Bib range: {result.bibRange?.start} – {result.bibRange?.end}
                </p>
                {result.failed && result.failed > 0 && (
                  <p className="mt-1 text-xs">
                    {result.failed} row(s) failed. {result.failedDetails?.slice(0, 3).map((d) => `Row ${d.row}: ${d.reason}`).join("; ")}
                  </p>
                )}
              </div>
            )}

            {result && !result.success && result.failedDetails && result.failedDetails.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-medium">Validation issues:</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {result.failedDetails.slice(0, 5).map((d, i) => (
                    <li key={i}>Row {d.row}: {d.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !eventName.trim() || !file}
              className="h-11 w-full rounded-xl bg-[#E11D48] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
            >
              {uploading ? "Importing..." : "Import Excel"}
            </button>
          </form>
        </div>

        {/* Export & Delete section */}
        {hasParticipants && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold">Event Data Management</h2>
              <p className="mt-1 text-sm text-slate-500">
                Export full participant data with collection details, or delete all event data to prepare for the next event.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {exporting ? "Exporting..." : "📥 Export Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100 disabled:opacity-60"
                >
                  🧨 Delete Event Data
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete Event Data?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete all participants and collection records. The system will be reset for the next event. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
