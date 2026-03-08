"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScrollAwareHeader } from "@/components/ui/ScrollAwareHeader";

type ParticipantStatus = "pending" | "partially-collected" | "collected" | "collected-by-behalf" | "on-spot";

type Participant = {
  id: string;
  name: string;
  bib: string;
  bibNumber?: number;
  email: string;
  phone: string;
  age: string;
  category: string;
  gender: string;
  tShirtSize: string;
  status: ParticipantStatus;
  collectionStatus: "Pending" | "Collected" | "Collected_By_Behalf";
  group?: string;
  bulkTeam?: string;
  registeredOn: string;
  emailVerified: boolean;
  paymentStatus: "paid" | "pending";
  collectedAt?: string;
  collectedBy?: string;
  bibCollected?: boolean;
  tshirtCollected?: boolean;
  goodiesCollected?: boolean;
  tshirtSizeCategory?: string;
};

type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: string;
  counterName: string | null;
  eventId: string | null;
};

type ActivityItem = {
  id: string;
  text: string;
  time: string;
};

type EventItem = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [query, setQuery] = React.useState("");
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showBehalfModalFor, setShowBehalfModalFor] = React.useState<Participant | null>(null);
  const [showKitModalFor, setShowKitModalFor] = React.useState<Participant | null>(null);
  const [collectionFlow, setCollectionFlow] = React.useState<"mark" | "behalf" | "bulk" | null>("mark");
  const [behalfKitForm, setBehalfKitForm] = React.useState({ bib: false, tshirt: false, goodies: false });
  const [showBulkKitModal, setShowBulkKitModal] = React.useState(false);
  const [bulkKitForm, setBulkKitForm] = React.useState({ bib: false, tshirt: false, goodies: false });
  const [kitForm, setKitForm] = React.useState({ bib: false, tshirt: false, goodies: false });
  const [showOnSpotModal, setShowOnSpotModal] = React.useState(false);
  const [collectingId, setCollectingId] = React.useState<string | null>(null);
  const [undoingId, setUndoingId] = React.useState<string | null>(null);
  const [undoConfirmFor, setUndoConfirmFor] = React.useState<Participant | null>(null);
  const [stats, setStats] = React.useState<{
    total: number;
    collected: number;
    pending: number;
    onSpot: number;
    bulkTotal?: number;
    bulkCollected?: number;
    bulkPending?: number;
    bulkTeams?: { name: string; total: number; collected: number; pending: number; status: "collected" | "pending" | "partially-collected" }[];
    individualTotal?: number;
    individualCollected?: number;
    individualPending?: number;
    tshirtInventory?: Record<string, number> | null;
  } | null>(null);
  const [behalfForm, setBehalfForm] = React.useState({
    name: "",
    contact: "",
    relation: "",
  });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null);
  const [bulkTeamDropdownOpen, setBulkTeamDropdownOpen] = React.useState(false);
  const [behalfRelationOpen, setBehalfRelationOpen] = React.useState(false);
  const [bulkRelationOpen, setBulkRelationOpen] = React.useState(false);
  const [bulkForm, setBulkForm] = React.useState({
    name: "",
    contact: "",
    relation: "",
    idProof: "",
  });
  const [bulkCollecting, setBulkCollecting] = React.useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = React.useState<string | null>(null);
  const [eventName, setEventName] = React.useState<string | null>(null);
  const [eventDate, setEventDate] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [activeEventId, setActiveEventId] = React.useState<string>("");
  const [switchingEvent, setSwitchingEvent] = React.useState(false);
  const [eventMenuOpen, setEventMenuOpen] = React.useState(false);
  const [mobileEventMenuOpen, setMobileEventMenuOpen] = React.useState(false);
  const [volunteerCount, setVolunteerCount] = React.useState<number | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [statsDrawerOpen, setStatsDrawerOpen] = React.useState(false);

  const isAdmin = user?.role === "ADMIN";
  const activeEventName = React.useMemo(
    () => events.find((ev) => ev.id === activeEventId)?.name ?? "Switch Event",
    [events, activeEventId]
  );

  const fetchVolunteerCount = React.useCallback(() => {
    fetch("/api/volunteers/count")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data != null && setVolunteerCount(data.count))
      .catch(() => {});
  }, []);

  const fetchActivities = React.useCallback(() => {
    fetch("/api/participants/activity")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.activities)) {
          setActivities(data.activities);
        } else {
          setActivities([]);
        }
      })
      .catch(() => setActivities([]));
  }, []);

  const fetchEvents = React.useCallback(() => {
    if (!isAdmin) return;
    fetch("/api/admin/events")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.events) ? data.events : [];
        setEvents(list);
        if (data?.activeEventId) setActiveEventId(data.activeEventId);
        else if (list[0]?.id) setActiveEventId(list[0].id);
      })
      .catch(() => {
        setEvents([]);
        setActiveEventId("");
      });
  }, [isAdmin]);

  const isPending = (p: Participant) =>
    p.status === "pending" || p.status === "on-spot" || p.status === "partially-collected";
  const isFullyCollected = (p: Participant) =>
    p.status === "collected" || p.status === "collected-by-behalf";
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectedCount = selectedIds.size;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const uniqueTeams = React.useMemo(() => {
    const teams = new Set<string>();
    for (const p of participants) {
      if (p.bulkTeam?.trim()) teams.add(p.bulkTeam.trim());
    }
    return Array.from(teams).sort();
  }, [participants]);

  const selectTeam = React.useCallback(
    (teamName: string) => {
      const ids = new Set(
        participants
          .filter((p) => p.bulkTeam === teamName && isPending(p))
          .map((p) => p.id)
      );
      setSelectedIds(ids);
      setSelectedTeam(teamName);
      setBulkTeamDropdownOpen(false);
    },
    [participants]
  );

  const clearTeamSelection = React.useCallback(() => {
    setSelectedTeam(null);
    setSelectedIds(new Set());
  }, []);


  const fetchParticipants = React.useCallback(() => {
    setLoading(true);
    const q = query.trim() ? `?q=${encodeURIComponent(query)}` : "";
    fetch(`/api/participants${q}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.participants)) {
          setParticipants(data.participants);
        } else {
          setParticipants([]);
        }
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));
  }, [query]);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const t = setTimeout(fetchParticipants, 300);
    return () => clearTimeout(t);
  }, [fetchParticipants]);

  React.useEffect(() => {
    fetch("/api/participants/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, [participants]);

  React.useEffect(() => {
    fetch("/api/event/current")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEventName(data?.name ?? null);
        setEventDate(data?.event?.eventDate ?? null);
      })
      .catch(() => {
        setEventName(null);
        setEventDate(null);
      });
  }, [participants]);

  React.useEffect(() => {
    fetchVolunteerCount();
  }, [participants, fetchVolunteerCount]);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  React.useEffect(() => {
    fetchActivities();
  }, [participants, fetchActivities]);

  React.useEffect(() => {
    const interval = setInterval(fetchVolunteerCount, 60000);
    return () => clearInterval(interval);
  }, [fetchVolunteerCount]);

  React.useEffect(() => {
    const onFocus = () => fetchVolunteerCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchVolunteerCount]);

  React.useEffect(() => {
    if (!mobileMenuOpen) {
      setMobileEventMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  async function handleKitCollect() {
    if (!showKitModalFor || collectingId) return;
    const items: ("bib" | "tshirt" | "goodies")[] = [];
    if (kitForm.bib && !showKitModalFor.bibCollected) items.push("bib");
    if (kitForm.tshirt && !showKitModalFor.tshirtCollected) items.push("tshirt");
    if (kitForm.goodies && !showKitModalFor.goodiesCollected) items.push("goodies");
    if (items.length === 0) return;
    setCollectingId(showKitModalFor.id);
    try {
      const res = await fetch(`/api/participants/${showKitModalFor.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "partial", items }),
      });
      if (res.ok) {
        setShowKitModalFor(null);
        setKitForm({ bib: false, tshirt: false, goodies: false });
        fetchParticipants();
        fetchActivities();
      }
    } finally {
      setCollectingId(null);
    }
  }

  async function handleMarkCollected(
    p: Participant,
    type: "self" | "behalf",
    extra?: { name: string; contact: string; relation: string },
    items?: ("bib" | "tshirt" | "goodies")[]
  ) {
    if (collectingId) return;
    setCollectingId(p.id);
    try {
      const body =
        type === "self"
          ? { type: "self" as const }
          : {
              type: "behalf" as const,
              behalfName: extra?.name,
              behalfContact: extra?.contact,
              behalfRelation: extra?.relation,
              ...(items && items.length > 0 && { items }),
            };
      const res = await fetch(`/api/participants/${p.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowBehalfModalFor(null);
        setBehalfForm({ name: "", contact: "", relation: "" });
        setBehalfKitForm({ bib: false, tshirt: false, goodies: false });
        setBehalfRelationOpen(false);
        fetchParticipants();
        fetchActivities();
      }
    } finally {
      setCollectingId(null);
    }
  }

  async function handleBulkCollect(e: React.FormEvent) {
    e.preventDefault();
    const hasBulkItems = bulkKitForm.bib || bulkKitForm.tshirt || bulkKitForm.goodies;
    if (selectedCount === 0 || !bulkForm.name.trim() || bulkCollecting || !hasBulkItems) return;
    setBulkCollecting(true);
    setBulkSuccessMessage(null);
    try {
      const res = await fetch("/api/participants/bulk-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: Array.from(selectedIds),
          behalfName: bulkForm.name.trim(),
          behalfContact: bulkForm.contact.trim() || undefined,
          behalfRelation: bulkForm.relation.trim() || undefined,
          idProof: bulkForm.idProof.trim() || undefined,
          items:
            bulkKitForm.bib || bulkKitForm.tshirt || bulkKitForm.goodies
              ? [
                  ...(bulkKitForm.bib ? (["bib"] as const) : []),
                  ...(bulkKitForm.tshirt ? (["tshirt"] as const) : []),
                  ...(bulkKitForm.goodies ? (["goodies"] as const) : []),
                ]
              : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkSuccessMessage(data.message ?? "Bulk collection completed successfully.");
        setSelectedIds(new Set());
        setSelectedTeam(null);
        setShowBulkModal(false);
        setBulkForm({ name: "", contact: "", relation: "", idProof: "" });
        setBulkKitForm({ bib: false, tshirt: false, goodies: false });
        setBulkRelationOpen(false);
        fetchParticipants();
        setTimeout(() => setBulkSuccessMessage(null), 5000);
      } else {
        setBulkSuccessMessage(data.error ?? "Bulk collection failed.");
      }
    } catch {
      setBulkSuccessMessage("Bulk collection failed. Please try again.");
    } finally {
      setBulkCollecting(false);
    }
  }

  async function handleUndoCollection() {
    if (!undoConfirmFor || undoingId) return;
    setUndoingId(undoConfirmFor.id);
    try {
      const res = await fetch(`/api/participants/${undoConfirmFor.id}/undo-collect`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setUndoConfirmFor(null);
        fetchParticipants();
      } else {
        setBulkSuccessMessage(data.error ?? "Undo failed.");
      }
    } catch {
      setBulkSuccessMessage("Undo failed. Please try again.");
    } finally {
      setUndoingId(null);
    }
  }

  async function handleSwitchEvent(nextEventId: string) {
    if (!isAdmin) return;
    setActiveEventId(nextEventId);
    if (!nextEventId) return;
    setSwitchingEvent(true);
    try {
      const res = await fetch("/api/admin/events/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: nextEventId }),
      });
      if (res.ok) {
        fetchParticipants();
        fetchVolunteerCount();
        fetchActivities();
      }
    } finally {
      setSwitchingEvent(false);
    }
  }

  const filtered = React.useMemo(() => {
    if (selectedTeam) {
      return participants.filter((p) => p.bulkTeam === selectedTeam);
    }
    return participants;
  }, [participants, selectedTeam]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Top nav */}
      <ScrollAwareHeader forceVisible={mobileMenuOpen}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#4C1D95] to-[#E11D48] text-xs font-semibold text-white shadow-sm">
              B
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Bib Expo</span>
              <span className="text-[0.7rem] text-slate-500">
                {isAdmin ? "Admin Dashboard" : user?.role === "ORGANIZER" ? "Organizer Dashboard" : "Volunteer Dashboard"}
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>
                {eventName ?? "No Active Event"}
                {eventDate ? ` · ${new Date(eventDate).toLocaleDateString()}` : ""}
              </span>
            </span>
            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEventMenuOpen((o) => !o)}
                  disabled={switchingEvent || events.length === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="max-w-[120px] truncate">{switchingEvent ? "Switching..." : activeEventName}</span>
                  <svg
                    className={`size-3 transition ${eventMenuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {eventMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close event menu"
                      onClick={() => setEventMenuOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      <p className="px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
                        Switch Event
                      </p>
                      <div className="max-h-64 overflow-auto">
                        {events.map((ev) => {
                          const selected = ev.id === activeEventId;
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => {
                                setEventMenuOpen(false);
                                void handleSwitchEvent(ev.id);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                selected
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate">{ev.name}</span>
                              {selected && (
                                <svg
                                  className="size-3.5 shrink-0"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 5.29a1 1 0 0 1 0 1.42l-7.29 7.29a1 1 0 0 1-1.415 0L3.29 9.29a1 1 0 1 1 1.415-1.415l4.002 4.002 6.584-6.585a1 1 0 0 1 1.414 0Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop: inline admin controls + user info */}
            {isAdmin && (
              <>
                <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-[0.7rem] font-semibold text-amber-800 md:inline-flex">
                  Admin
                </span>
                <Link
                  href="/admin/events"
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
                >
                  Event Setup
                </Link>
                <Link
                  href="/admin"
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
                >
                  Manage Users
                </Link>
                <Link
                  href="/admin/export"
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
                >
                  Export Excel
                </Link>
              </>
            )}
            {user?.role === "ORGANIZER" && (
              <Link
                href="/admin"
                className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
              >
                Manage Volunteers
              </Link>
            )}
            <div className="hidden items-end gap-2 text-xs md:flex">
              <div className="flex flex-col items-end">
                <span className="font-medium text-slate-900">
                  {user?.counterName ?? "Counter 4 – 10K"}
                </span>
                <span className="text-[0.7rem] text-slate-500">
                  {isAdmin ? "Admin" : user?.role === "ORGANIZER" ? "Organizer" : "Volunteer"}: {user?.name ?? "—"}
                </span>
              </div>
              <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {user?.name?.charAt(0)?.toUpperCase() ?? "—"}
              </span>
            </div>

            {/* Mobile/tablet: Stats button + menu toggle + dropdown */}
            <div className="relative flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setStatsDrawerOpen(true)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Expo Insights"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
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
                        {eventName ?? "No Active Event"}
                      </p>
                      {eventDate && (
                        <p className="text-[0.68rem] text-slate-500">
                          {new Date(eventDate).toLocaleDateString()}
                        </p>
                      )}
                      {isAdmin && (
                        <div className="relative mt-2">
                          <button
                            type="button"
                            onClick={() => setMobileEventMenuOpen((o) => !o)}
                            disabled={switchingEvent || events.length === 0}
                            className="inline-flex h-8 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2 text-[0.7rem] text-slate-700 shadow-sm disabled:opacity-60"
                          >
                            <span className="truncate">{switchingEvent ? "Switching..." : activeEventName}</span>
                            <svg
                              className={`size-3 transition ${mobileEventMenuOpen ? "rotate-180" : ""}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          {mobileEventMenuOpen && (
                            <div className="mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                              <div className="max-h-40 overflow-auto">
                                {events.map((ev) => {
                                  const selected = ev.id === activeEventId;
                                  return (
                                    <button
                                      key={ev.id}
                                      type="button"
                                      onClick={() => {
                                        setMobileEventMenuOpen(false);
                                        void handleSwitchEvent(ev.id);
                                      }}
                                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[0.7rem] transition ${
                                        selected
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span className="truncate">{ev.name}</span>
                                      {selected && (
                                        <svg
                                          className="size-3.5 shrink-0"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                          aria-hidden="true"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.704 5.29a1 1 0 0 1 0 1.42l-7.29 7.29a1 1 0 0 1-1.415 0L3.29 9.29a1 1 0 1 1 1.415-1.415l4.002 4.002 6.584-6.585a1 1 0 0 1 1.414 0Z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-[0.7rem] text-slate-500">
                        {user?.counterName ?? "Counter 4 – 10K"}
                      </p>
                      <p className="text-[0.7rem] text-slate-500">
                        {isAdmin ? "Admin" : user?.role === "ORGANIZER" ? "Organizer" : "Volunteer"}: {user?.name ?? "—"}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="border-b border-slate-100 px-2 py-2">
                        <span className="mb-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[0.7rem] font-semibold text-amber-800">
                          Admin
                        </span>
                        <div className="mt-2 flex flex-col gap-1">
                          <Link
                            href="/admin/events"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Event Setup
                          </Link>
                          <Link
                            href="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Manage Users
                          </Link>
                          <Link
                            href="/admin/export"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Export Excel
                          </Link>
                        </div>
                      </div>
                    )}
                    {user?.role === "ORGANIZER" && (
                      <div className="border-b border-slate-100 px-2 py-2">
                        <div className="mt-1 flex flex-col gap-1">
                          <Link
                            href="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Manage Volunteers
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
                          router.push("/");
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
                router.push("/");
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
              <span>Active Volunteers: {volunteerCount ?? "—"}</span>
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
      </ScrollAwareHeader>

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
                className="w-full flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-slate-900/5 outline-none ring-0 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200 sm:h-11 sm:py-0"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#E11D48] px-5 py-2.5 text-[0.9rem] font-semibold text-white shadow-sm transition hover:bg-[#BE123C] sm:h-11 sm:w-auto sm:px-6 sm:py-0 sm:text-sm"
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
                matches
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {uniqueTeams.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBulkTeamDropdownOpen((o) => !o)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 text-[0.75rem] font-semibold text-sky-800 shadow-sm transition hover:bg-sky-100"
                    >
                      📦 Bulk Team
                    </button>
                    {bulkTeamDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          aria-hidden="true"
                          onClick={() => setBulkTeamDropdownOpen(false)}
                        />
                        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-48 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                          {uniqueTeams.map((team) => (
                            <button
                              key={team}
                              type="button"
                              onClick={() => selectTeam(team)}
                              className="flex w-full items-center px-3 py-2 text-left text-[0.75rem] text-slate-700 hover:bg-slate-50"
                            >
                              {team}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {selectedTeam && (
                  <button
                    type="button"
                    onClick={clearTeamSelection}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[0.75rem] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Clear Team
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkKitModal(true);
                    setBulkKitForm({ bib: false, tshirt: false, goodies: false });
                  }}
                  disabled={selectedCount === 0}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#E11D48] px-4 text-[0.75rem] font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-50 disabled:pointer-events-none"
                >
                  🔴 Bulk Collection{selectedCount > 0 ? ` (${selectedCount})` : ""}
                </button>
                {selectedCount > 0 && !selectedTeam && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[0.75rem] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Clear Selection
                  </button>
                )}
                <button className="hidden text-[0.7rem] font-medium text-slate-600 underline-offset-2 hover:underline sm:inline">
                  Advanced filters (coming soon)
                </button>
              </div>
            </div>
            {bulkSuccessMessage && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {bulkSuccessMessage}
              </p>
            )}

            <div className="space-y-3">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className={`flex flex-col gap-3 rounded-2xl border px-3 py-3 text-sm shadow-sm sm:px-4 sm:py-4 ${
                    selectedTeam && p.bulkTeam === selectedTeam
                      ? "border-sky-400 bg-sky-50/50 ring-2 ring-sky-200"
                      : "border-slate-200 bg-white"
                  }`}
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
                      {(p.group || p.bulkTeam) && (
                        <p className="mt-1 text-[0.7rem] text-slate-500">
                          {p.bulkTeam && (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700">
                              {p.bulkTeam}
                            </span>
                          )}
                          {p.bulkTeam && p.group && " · "}
                          {p.group && `Group: ${p.group}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          p.status === "pending"
                            ? "inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[0.7rem] font-semibold text-amber-700 ring-1 ring-amber-100"
                            : p.status === "partially-collected"
                              ? "inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-[0.7rem] font-semibold text-sky-700 ring-1 ring-sky-100"
                              : p.status === "collected" || p.status === "collected-by-behalf"
                                ? "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                                : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-semibold text-slate-700 ring-1 ring-slate-200"
                        }
                      >
                        {p.status === "pending"
                          ? "Pending"
                          : p.status === "partially-collected"
                            ? "Partially Collected"
                            : p.status === "collected" || p.status === "collected-by-behalf"
                              ? "Collected"
                              : "On-spot"}
                      </span>
                      <label className="flex shrink-0 items-center gap-1.5 text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                          disabled={!isPending(p)}
                          className="size-4 rounded border-slate-300 text-[#E11D48] focus:ring-[#E11D48] disabled:opacity-50"
                          aria-label={`Select ${p.name} for bulk collection`}
                        />
                        <span className="sr-only">Select for bulk collection</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-xl bg-slate-50/80 p-3 text-[0.72rem] text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                    <p><span className="font-medium text-slate-700">Full Name:</span> {p.name}</p>
                    <p><span className="font-medium text-slate-700">Bib Number:</span> {p.bib}</p>
                    <p><span className="font-medium text-slate-700">Email ID:</span> {p.email || "—"}</p>
                    <p><span className="font-medium text-slate-700">Phone Number:</span> {p.phone || "—"}</p>
                    <p><span className="font-medium text-slate-700">Age:</span> {p.age || "—"}</p>
                    <p><span className="font-medium text-slate-700">Event Category:</span> {p.category || "—"}</p>
                    <p><span className="font-medium text-slate-700">Gender:</span> {p.gender || "—"}</p>
                    <p><span className="font-medium text-slate-700">T-Shirt Size:</span> {p.tShirtSize || "—"}</p>
                    <p>
                      <span className="font-medium text-slate-700">Payment Status:</span>{" "}
                      <span className={p.paymentStatus === "paid" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {p.paymentStatus === "paid" ? "Paid" : "Pending"}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">Collection Status:</span>{" "}
                      {p.status === "pending"
                        ? "Pending"
                        : p.status === "on-spot"
                          ? "On-spot"
                          : p.status === "partially-collected"
                            ? "Partially Collected"
                            : p.collectedBy
                              ? `Collected (${p.collectedBy})`
                              : "Collected"}
                    </p>
                    <div className="col-span-full rounded-lg border border-slate-200 bg-white p-2">
                      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                        Kit Status
                      </p>
                      <div className="flex flex-wrap gap-3 text-[0.72rem]">
                        <span className="inline-flex items-center gap-1.5">
                          {p.bibCollected ? (
                            <span className="text-emerald-600">Bib: ✅ Collected</span>
                          ) : (
                            <span className="text-amber-600">Bib: ⏳ Pending</span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          {p.tshirtCollected ? (
                            <span className="text-emerald-600">T-Shirt: ✅ Collected</span>
                          ) : (
                            <span className="text-amber-600">T-Shirt: ⏳ Pending</span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          {p.goodiesCollected ? (
                            <span className="text-emerald-600">Goodies: ✅ Collected</span>
                          ) : (
                            <span className="text-amber-600">Goodies: ⏳ Pending</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {p.collectedAt ? (
                      <p><span className="font-medium text-slate-700">Collected Time:</span> {p.collectedAt}</p>
                    ) : (
                      <p><span className="font-medium text-slate-700">Collected Time:</span> —</p>
                    )}
                    <p>
                      <span className="font-medium text-slate-700">Email Verification:</span>{" "}
                      <span className={p.emailVerified ? "text-emerald-600 font-medium" : "text-slate-500"}>
                        {p.emailVerified ? "Verified" : "Not verified"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1 text-[0.75rem] sm:flex-row sm:items-center sm:justify-between">
                    {p.bulkTeam ? (
                      <span className="text-[0.7rem] text-slate-500">
                        Bulk team: {p.bulkTeam}
                      </span>
                    ) : p.group ? (
                      <span className="text-[0.7rem] text-slate-500">Group: {p.group}</span>
                    ) : (
                      <span className="text-[0.7rem] text-slate-500">
                        Single participant record
                      </span>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {(p.status === "pending" || p.status === "on-spot" || p.status === "partially-collected") && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectionFlow("mark");
                              setShowKitModalFor(p);
                              setKitForm({ bib: false, tshirt: false, goodies: false });
                            }}
                            disabled={collectingId === p.id || (!!p.bibCollected && !!p.tshirtCollected && !!p.goodiesCollected)}
                            className="inline-flex items-center justify-center rounded-full bg-[#E11D48] px-3.5 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
                          >
                            {collectingId === p.id ? "..." : "Mark as Collected"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectionFlow("behalf");
                              setShowKitModalFor(p);
                              setKitForm({ bib: false, tshirt: false, goodies: false });
                              setBehalfKitForm({ bib: false, tshirt: false, goodies: false });
                            }}
                            disabled={!!collectingId || (!!p.bibCollected && !!p.tshirtCollected && !!p.goodiesCollected)}
                            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Collected on Behalf
                          </button>
                        </>
                      )}
                      {isFullyCollected(p) && (
                        <>
                          <button
                            disabled
                            className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                          >
                            ✅ Already Collected
                          </button>
                          <button
                            type="button"
                            onClick={() => setUndoConfirmFor(p)}
                            disabled={undoingId === p.id}
                            className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-[0.7rem] font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                          >
                            {undoingId === p.id ? "Undoing..." : "Undo Collection"}
                          </button>
                        </>
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
                    : selectedTeam
                      ? `No participants in team "${selectedTeam}".`
                      : "No participants match this search."}
                </p>
              )}
            </div>
          </div>

          {/* Activity feed (hidden on mobile; shown in Stats drawer) */}
          <div className="hidden space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200 sm:p-5 md:block">
            <div className="flex items-center justify-between text-sm">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>
              <span className="text-[0.7rem] text-slate-500">Last 20 actions</span>
            </div>
            <ul className="divide-y divide-slate-100 text-[0.75rem]">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <span className="text-slate-700">{a.text}</span>
                  <span className="text-slate-400">{a.time}</span>
                </li>
              ))}
              {activities.length === 0 && (
                <li className="py-4 text-center text-slate-500">No collection activity yet</li>
              )}
            </ul>
          </div>
        </section>

        {/* Right stats panel (hidden on mobile; shown in Stats drawer) */}
        <aside className="hidden w-full shrink-0 space-y-4 md:block lg:w-72">
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
            {(stats?.bulkTotal ?? 0) > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-4">
                <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                  Bulk Participants
                </p>
                <dl className="space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Total</dt>
                    <dd className="text-sm font-semibold text-white">{stats.bulkTotal}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Collected</dt>
                    <dd className="text-sm font-semibold text-emerald-400">{stats.bulkCollected ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Pending</dt>
                    <dd className="text-sm font-semibold text-amber-300">{stats.bulkPending ?? "—"}</dd>
                  </div>
                </dl>
                {stats?.bulkTeams && stats.bulkTeams.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {stats.bulkTeams.map((team) => (
                      <div key={team.name} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5">
                        <span className="truncate text-[0.7rem] font-medium text-slate-200" title={team.name}>{team.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {team.pending > 0 && (
                            <span className="text-[0.65rem] text-slate-400">{team.pending} left</span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                              team.status === "collected"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : team.status === "partially-collected"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-slate-600/50 text-slate-400"
                            }`}
                          >
                            {team.status === "collected" ? "Collected" : team.status === "partially-collected" ? "Partial" : "Pending"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 border-t border-slate-700/50 pt-4">
              <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                Individual Participants
              </p>
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Total</dt>
                  <dd className="text-sm font-semibold text-white">{stats?.individualTotal ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Collected</dt>
                  <dd className="text-sm font-semibold text-emerald-400">{stats?.individualCollected ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Pending</dt>
                  <dd className="text-sm font-semibold text-amber-300">{stats?.individualPending ?? "—"}</dd>
                </div>
              </dl>
            </div>
            {stats?.tshirtInventory && Object.keys(stats.tshirtInventory).length > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-4">
                <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                  T-Shirt Inventory
                </p>
                <dl className="space-y-1.5">
                  {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((size) => {
                    const qty = stats.tshirtInventory![size] ?? 0;
                    const indicator = qty === 0 ? "🔴" : qty <= 10 ? "🟡" : "🟢";
                    return (
                      <div key={size} className="flex items-center justify-between">
                        <dt className="text-slate-400">{size} {indicator}</dt>
                        <dd className="text-sm font-semibold text-white">{qty}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}
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

      {/* Mobile: Expo Insights bottom sheet */}
      {statsDrawerOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Expo Insights"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => setStatsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl shadow-slate-900/30 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Expo Insights</h2>
              <button
                type="button"
                onClick={() => setStatsDrawerOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-2xl bg-slate-900 px-4 py-4 text-xs text-slate-100 shadow-lg shadow-slate-900/30">
                <h3 className="text-sm font-semibold">Live Expo Stats</h3>
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
                {(stats?.bulkTotal ?? 0) > 0 && (
                  <div className="mt-4 border-t border-slate-700/50 pt-4">
                    <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                      Bulk Participants
                    </p>
                    <dl className="space-y-2">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-400">Total</dt>
                        <dd className="text-sm font-semibold text-white">{stats.bulkTotal}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-400">Collected</dt>
                        <dd className="text-sm font-semibold text-emerald-400">{stats.bulkCollected ?? "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-400">Pending</dt>
                        <dd className="text-sm font-semibold text-amber-300">{stats.bulkPending ?? "—"}</dd>
                      </div>
                    </dl>
                    {stats?.bulkTeams && stats.bulkTeams.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {stats.bulkTeams.map((team) => (
                          <div key={team.name} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5">
                            <span className="truncate text-[0.7rem] font-medium text-slate-200" title={team.name}>{team.name}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {team.pending > 0 && (
                                <span className="text-[0.65rem] text-slate-400">{team.pending} left</span>
                              )}
                              <span
                                className={`rounded px-1.5 py-0.5 text-[0.65rem] font-semibold ${
                                  team.status === "collected"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : team.status === "partially-collected"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-slate-600/50 text-slate-400"
                                }`}
                              >
                                {team.status === "collected" ? "Collected" : team.status === "partially-collected" ? "Partial" : "Pending"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 border-t border-slate-700/50 pt-4">
                  <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                    Individual Participants
                  </p>
                  <dl className="space-y-2">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400">Total</dt>
                      <dd className="text-sm font-semibold text-white">{stats?.individualTotal ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400">Collected</dt>
                      <dd className="text-sm font-semibold text-emerald-400">{stats?.individualCollected ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400">Pending</dt>
                      <dd className="text-sm font-semibold text-amber-300">{stats?.individualPending ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
                {stats?.tshirtInventory && Object.keys(stats.tshirtInventory).length > 0 && (
                  <div className="mt-4 border-t border-slate-700/50 pt-4">
                    <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                      T-Shirt Inventory
                    </p>
                    <dl className="space-y-1.5">
                      {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((size) => {
                        const qty = stats.tshirtInventory![size] ?? 0;
                        const indicator = qty === 0 ? "🔴" : qty <= 10 ? "🟡" : "🟢";
                        return (
                          <div key={size} className="flex items-center justify-between">
                            <dt className="text-slate-400">{size} {indicator}</dt>
                            <dd className="text-sm font-semibold text-white">{qty}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}
              </div>
              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                  <span className="text-[0.7rem] text-slate-500">Last 20 actions</span>
                </div>
                <ul className="divide-y divide-slate-100 text-[0.75rem]">
                  {activities.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5">
                      <span className="text-slate-700">{a.text}</span>
                      <span className="text-slate-400">{a.time}</span>
                    </li>
                  ))}
                  {activities.length === 0 && (
                    <li className="py-4 text-center text-slate-500">No collection activity yet</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kit Collection modal */}
      {showKitModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">Kit Collection</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select items to collect for {showKitModalFor.name} {showKitModalFor.bib}
            </p>
            <div className="mt-4 space-y-3">
              <label className={`flex items-center gap-3 rounded-lg border p-3 ${showKitModalFor.bibCollected ? "cursor-default border-emerald-200 bg-emerald-50" : "cursor-pointer border-slate-200 hover:bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={!!showKitModalFor.bibCollected || kitForm.bib}
                  onChange={(e) => setKitForm((f) => ({ ...f, bib: e.target.checked }))}
                  disabled={!!showKitModalFor.bibCollected}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-70"
                />
                <span className={`text-sm font-medium ${showKitModalFor.bibCollected ? "text-emerald-700" : "text-slate-700"}`}>
                  {showKitModalFor.bibCollected ? "Bib: Already Collected ✓" : "☐ Bib Collect"}
                </span>
              </label>
              {(() => {
                const size = showKitModalFor.tshirtSizeCategory;
                const qty = size && stats?.tshirtInventory ? (stats.tshirtInventory[size] ?? 0) : null;
                const tshirtOutOfStock = size != null && qty !== null && qty <= 0 && !showKitModalFor.tshirtCollected;
                return (
                  <label className={`flex flex-col gap-1 rounded-lg border p-3 ${showKitModalFor.tshirtCollected ? "cursor-default border-emerald-200 bg-emerald-50" : tshirtOutOfStock ? "cursor-default border-amber-200 bg-amber-50/50" : "cursor-pointer border-slate-200 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!showKitModalFor.tshirtCollected || kitForm.tshirt}
                        onChange={(e) => setKitForm((f) => ({ ...f, tshirt: e.target.checked }))}
                        disabled={!!showKitModalFor.tshirtCollected || !!tshirtOutOfStock}
                        className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-70"
                      />
                      <span className={`text-sm font-medium ${showKitModalFor.tshirtCollected ? "text-emerald-700" : tshirtOutOfStock ? "text-amber-800" : "text-slate-700"}`}>
                        {showKitModalFor.tshirtCollected ? "T-Shirt: Already Collected ✓" : tshirtOutOfStock ? `☐ T-Shirt Collect (${size} out of stock)` : "☐ T-Shirt Collect"}
                      </span>
                    </div>
                    {tshirtOutOfStock && (
                      <p className="text-xs font-medium text-amber-700">⚠ {size} size T-shirts are out of stock</p>
                    )}
                  </label>
                );
              })()}
              <label className={`flex items-center gap-3 rounded-lg border p-3 ${showKitModalFor.goodiesCollected ? "cursor-default border-emerald-200 bg-emerald-50" : "cursor-pointer border-slate-200 hover:bg-slate-50"}`}>
                <input
                  type="checkbox"
                  checked={!!showKitModalFor.goodiesCollected || kitForm.goodies}
                  onChange={(e) => setKitForm((f) => ({ ...f, goodies: e.target.checked }))}
                  disabled={!!showKitModalFor.goodiesCollected}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-70"
                />
                <span className={`text-sm font-medium ${showKitModalFor.goodiesCollected ? "text-emerald-700" : "text-slate-700"}`}>
                  {showKitModalFor.goodiesCollected ? "Goodies: Already Collected ✓" : "☐ Goodies Collect"}
                </span>
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowKitModalFor(null);
                  setKitForm({ bib: false, tshirt: false, goodies: false });
                  setCollectionFlow("mark");
                  setBehalfKitForm({ bib: false, tshirt: false, goodies: false });
                }}
                disabled={!!collectingId}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              {collectionFlow === "behalf" ? (
                <button
                  type="button"
                  onClick={() => {
                    const hasAny =
                      (kitForm.bib && !showKitModalFor.bibCollected) ||
                      (kitForm.tshirt && !showKitModalFor.tshirtCollected) ||
                      (kitForm.goodies && !showKitModalFor.goodiesCollected);
                    if (!hasAny) return;
                    setBehalfKitForm(kitForm);
                    setShowBehalfModalFor(showKitModalFor);
                    setShowKitModalFor(null);
                    setCollectionFlow("mark");
                  }}
                  disabled={
                    !((kitForm.bib && !showKitModalFor.bibCollected) ||
                      (kitForm.tshirt && !showKitModalFor.tshirtCollected) ||
                      (kitForm.goodies && !showKitModalFor.goodiesCollected))
                  }
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#E11D48] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
                >
                  Continue to Collector Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleKitCollect}
                  disabled={
                    collectingId === showKitModalFor.id ||
                    !((kitForm.bib && !showKitModalFor.bibCollected) ||
                      (kitForm.tshirt && !showKitModalFor.tshirtCollected) ||
                      (kitForm.goodies && !showKitModalFor.goodiesCollected))
                  }
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#E11D48] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
                >
                  {collectingId === showKitModalFor.id ? "Collecting…" : "Confirm Collection"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo confirmation modal */}
      {undoConfirmFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">Confirm Undo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to undo this collection? This action will revert the participant&apos;s status back to Pending.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Participant: <span className="font-medium text-slate-700">{undoConfirmFor.name}</span>
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setUndoConfirmFor(null)}
                disabled={!!undoingId}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUndoCollection}
                disabled={undoingId === undoConfirmFor.id}
                className="inline-flex h-9 items-center justify-center rounded-full bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
              >
                {undoingId === undoConfirmFor.id ? "Undoing..." : "Confirm Undo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Kit selection modal (step 1 before Bulk Collection form) */}
      {showBulkKitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">Kit Collection</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select items to collect for <span className="font-semibold">{selectedCount}</span> participant(s)
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={bulkKitForm.bib}
                  onChange={(e) => setBulkKitForm((f) => ({ ...f, bib: e.target.checked }))}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">☐ Bib Collect</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={bulkKitForm.tshirt}
                  onChange={(e) => setBulkKitForm((f) => ({ ...f, tshirt: e.target.checked }))}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">☐ T-Shirt Collect</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={bulkKitForm.goodies}
                  onChange={(e) => setBulkKitForm((f) => ({ ...f, goodies: e.target.checked }))}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">☐ Goodies Collect</span>
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowBulkKitModal(false);
                  setBulkKitForm({ bib: false, tshirt: false, goodies: false });
                }}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bulkKitForm.bib && !bulkKitForm.tshirt && !bulkKitForm.goodies) return;
                  setShowBulkKitModal(false);
                  setShowBulkModal(true);
                }}
                disabled={!bulkKitForm.bib && !bulkKitForm.tshirt && !bulkKitForm.goodies}
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#E11D48] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#BE123C] disabled:opacity-60"
              >
                Continue to Collector Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk collection modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/25">
            <h2 className="text-base font-semibold text-slate-900">Bulk Collection</h2>
            <p className="mt-1 text-xs text-slate-500">
              Mark <span className="font-semibold text-slate-700">{selectedCount}</span> selected participant(s) as collected on behalf. Enter the person collecting the kits.
            </p>
            <form
              className="mt-4 space-y-3 text-sm"
              onSubmit={handleBulkCollect}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Name of person collecting</label>
                <input
                  required
                  value={bulkForm.name}
                  onChange={(e) => setBulkForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Phone number <span className="text-slate-400">(optional)</span></label>
                <input
                  value={bulkForm.contact}
                  onChange={(e) => setBulkForm((f) => ({ ...f, contact: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="+91 ..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Relation <span className="text-slate-400">(optional)</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBulkRelationOpen((o) => !o)}
                    className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm transition-colors hover:border-slate-300 hover:bg-white focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                  >
                    <span className={bulkForm.relation ? "text-slate-800" : "text-slate-500"}>
                      {bulkForm.relation || "Select relation"}
                    </span>
                    <svg
                      className={`size-4 shrink-0 text-slate-500 transition ${bulkRelationOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {bulkRelationOpen && (
                    <>
                      <button type="button" aria-label="Close" onClick={() => setBulkRelationOpen(false)} className="fixed inset-0 z-[100]" />
                      <div className="absolute left-0 right-0 top-full z-[101] mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        <p className="px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Relation</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkForm((f) => ({ ...f, relation: "" }));
                            setBulkRelationOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${!bulkForm.relation ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          Select relation
                          {!bulkForm.relation && (
                            <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.29 7.29a1 1 0 01-1.415 0L3.29 9.29a1 1 0 111.415-1.415l4.002 4.002 6.584-6.585a1 1 0 011.414 0Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        {["Friend", "Family", "Coach", "Other"].map((opt) => {
                          const selected = bulkForm.relation === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setBulkForm((f) => ({ ...f, relation: opt }));
                                setBulkRelationOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${selected ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              {opt}
                              {selected && (
                                <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.29 7.29a1 1 0 01-1.415 0L3.29 9.29a1 1 0 111.415-1.415l4.002 4.002 6.584-6.585a1 1 0 011.414 0Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">ID proof <span className="text-slate-400">(optional)</span></label>
                <input
                  value={bulkForm.idProof}
                  onChange={(e) => setBulkForm((f) => ({ ...f, idProof: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  placeholder="e.g. Aadhar last 4 digits"
                />
              </div>
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkForm({ name: "", contact: "", relation: "", idProof: "" });
                    setBulkKitForm({ bib: false, tshirt: false, goodies: false });
                    setBulkRelationOpen(false);
                  }}
                  disabled={bulkCollecting}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    bulkCollecting ||
                    selectedCount === 0 ||
                    !bulkForm.name.trim() ||
                    (!bulkKitForm.bib && !bulkKitForm.tshirt && !bulkKitForm.goodies)
                  }
                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#E11D48] px-4 font-semibold text-white shadow-sm hover:bg-[#BE123C] disabled:opacity-60"
                >
                  {bulkCollecting ? "Marking..." : "Confirm Bulk Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                const items: ("bib" | "tshirt" | "goodies")[] = [];
                if (behalfKitForm.bib && !showBehalfModalFor.bibCollected) items.push("bib");
                if (behalfKitForm.tshirt && !showBehalfModalFor.tshirtCollected) items.push("tshirt");
                if (behalfKitForm.goodies && !showBehalfModalFor.goodiesCollected) items.push("goodies");
                handleMarkCollected(showBehalfModalFor, "behalf", behalfForm, items.length > 0 ? items : undefined);
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
                <label className="text-xs font-medium text-slate-700">Relation <span className="text-slate-400">(optional)</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBehalfRelationOpen((o) => !o)}
                    className="flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm transition-colors hover:border-slate-300 hover:bg-white focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
                  >
                    <span className={behalfForm.relation ? "text-slate-800" : "text-slate-500"}>
                      {behalfForm.relation || "Select relation"}
                    </span>
                    <svg
                      className={`size-4 shrink-0 text-slate-500 transition ${behalfRelationOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {behalfRelationOpen && (
                    <>
                      <button type="button" aria-label="Close" onClick={() => setBehalfRelationOpen(false)} className="fixed inset-0 z-[100]" />
                      <div className="absolute left-0 right-0 top-full z-[101] mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        <p className="px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">Relation</p>
                        <button
                          type="button"
                          onClick={() => {
                            setBehalfForm((f) => ({ ...f, relation: "" }));
                            setBehalfRelationOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${!behalfForm.relation ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          Select relation
                          {!behalfForm.relation && (
                            <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.29 7.29a1 1 0 01-1.415 0L3.29 9.29a1 1 0 111.415-1.415l4.002 4.002 6.584-6.585a1 1 0 011.414 0Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        {["Friend", "Family", "Coach", "Other"].map((opt) => {
                          const selected = behalfForm.relation === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setBehalfForm((f) => ({ ...f, relation: opt }));
                                setBehalfRelationOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${selected ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              {opt}
                              {selected && (
                                <svg className="size-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.29 7.29a1 1 0 01-1.415 0L3.29 9.29a1 1 0 111.415-1.415l4.002 4.002 6.584-6.585a1 1 0 011.414 0Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowBehalfModalFor(null);
                    setBehalfForm({ name: "", contact: "", relation: "" });
                    setBehalfKitForm({ bib: false, tshirt: false, goodies: false });
                    setBehalfRelationOpen(false);
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

