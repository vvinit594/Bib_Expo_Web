import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const volunteers = await prisma.volunteer.findMany({
      where: { role: { in: ["VOLUNTEER", "ORGANIZER"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        counterName: true,
        createdAt: true,
        role: true,
        eventId: true,
        expoEvent: {
          select: { name: true },
        },
      },
    });

    const list = volunteers.map((v) => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      role: v.role,
      eventId: v.eventId ?? null,
      eventName: v.expoEvent?.name ?? "—",
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
