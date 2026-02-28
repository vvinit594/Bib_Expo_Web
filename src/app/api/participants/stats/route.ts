import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  let auth;
  try {
    auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (auth.role !== "ADMIN" && !auth.eventId) {
      return NextResponse.json({ error: "Event assignment required" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const adminEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null;
    const eventFilter =
      auth.role === "ADMIN"
        ? adminEventId ? { eventId: adminEventId } : {}
        : { eventId: auth.eventId };

    const [total, collectedSelf, pending, collectedBehalf, onSpot] = await Promise.all([
      prisma.participant.count({ where: eventFilter }),
      prisma.participant.count({ where: { ...eventFilter, collectionStatus: "Collected" } }),
      prisma.participant.count({ where: { ...eventFilter, collectionStatus: "Pending" } }),
      prisma.participant.count({ where: { ...eventFilter, collectionStatus: "Collected_By_Behalf" } }),
      prisma.participant.count({ where: { ...eventFilter, source: "ON_SPOT" } }),
    ]);

    return NextResponse.json({
      total,
      collected: collectedSelf + collectedBehalf,
      pending,
      onSpot,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
