import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma";
import { requireOrganizerOrAdmin } from "@/lib/auth-server";

export async function GET() {
  let auth;
  try {
    auth = await requireOrganizerOrAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const isOrganizer = auth.role === "ORGANIZER";
    const isSuperOrganizer = auth.role === "SUPER_ORGANIZER";
    const where = isOrganizer
      ? { role: Role.VOLUNTEER, eventId: auth.eventId ?? "__none__" }
      : isSuperOrganizer
        ? { role: { in: [Role.VOLUNTEER, Role.ORGANIZER] }, eventId: auth.eventId ?? "__none__" }
        : { role: { in: [Role.VOLUNTEER, Role.ORGANIZER, Role.SUPER_ORGANIZER] } };
    const volunteers = await prisma.volunteer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        counterName: true,
        createdAt: true,
        role: true,
        eventId: true,
      },
    });

    const eventRows = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM "ExpoEvent"
    `;
    const eventNameById = new Map(eventRows.map((e) => [e.id, e.name]));

    const list = volunteers.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      role: v.role,
      eventId: v.eventId ?? null,
      eventName: v.eventId ? (eventNameById.get(v.eventId) ?? "—") : "—",
      counterName: v.counterName ?? "—",
      createdAt: v.createdAt.toISOString(),
      status: "Active",
    }));

    return NextResponse.json({ volunteers: list });
  } catch (err) {
    if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) {
      throw err;
    }
    console.error("List volunteers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}
