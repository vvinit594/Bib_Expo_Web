import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { extractTshirtSizeCategory } from "@/lib/tshirt";
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

    const eventId = auth.role === "ADMIN" ? adminEventId : auth.eventId;
    const event = eventId
      ? await prisma.expoEvent.findUnique({
          where: { id: eventId },
          select: { tshirtInventory: true },
        })
      : null;
    let tshirtInventory = (event?.tshirtInventory as Record<string, number> | null) ?? null;

    // Fallback for events created before auto-compute: derive from participants
    if (!tshirtInventory && eventId) {
      const participants = await prisma.participant.findMany({
        where: { eventId },
        select: { tShirtSize: true },
      });
      const base: Record<string, number> = { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 };
      for (const p of participants) {
        const size = extractTshirtSizeCategory(p.tShirtSize);
        if (size && size in base) base[size]++;
      }
      const collected = await prisma.kitCollectionLog.findMany({
        where: { eventId, itemType: "tshirt" },
        select: { itemSize: true },
      });
      for (const c of collected) {
        const size = (c.itemSize ?? "").trim().toUpperCase() || null;
        if (size && size in base && base[size] > 0) base[size]--;
      }
      tshirtInventory = Object.keys(base).length > 0 ? base : null;
    }

    const bulkFilter = { ...eventFilter, bulkTeam: { not: null } };
    const individualFilter = { ...eventFilter, OR: [{ bulkTeam: null }, { bulkTeam: "" }] };

    const [
      total,
      collectedSelf,
      collectedBehalf,
      pending,
      onSpot,
      bulkTotal,
      bulkCollected,
      bulkPending,
      individualTotal,
      individualCollected,
      individualPending,
    ] = await Promise.all([
      prisma.participant.count({ where: eventFilter }),
      prisma.participant.count({
        where: {
          ...eventFilter,
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
          collectionStatus: "Collected",
        },
      }),
      prisma.participant.count({
        where: {
          ...eventFilter,
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
          collectionStatus: "Collected_By_Behalf",
        },
      }),
      prisma.participant.count({
        where: {
          ...eventFilter,
          OR: [
            { bibCollected: false },
            { tshirtCollected: false },
            { goodiesCollected: false },
          ],
        },
      }),
      prisma.participant.count({ where: { ...eventFilter, source: "ON_SPOT" } }),
      prisma.participant.count({ where: bulkFilter }),
      prisma.participant.count({
        where: {
          ...bulkFilter,
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
        },
      }),
      prisma.participant.count({
        where: {
          ...bulkFilter,
          OR: [
            { bibCollected: false },
            { tshirtCollected: false },
            { goodiesCollected: false },
          ],
        },
      }),
      prisma.participant.count({ where: individualFilter }),
      prisma.participant.count({
        where: {
          ...individualFilter,
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
        },
      }),
      prisma.participant.count({
        where: {
          ...individualFilter,
          OR: [
            { bibCollected: false },
            { tshirtCollected: false },
            { goodiesCollected: false },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      total,
      collected: collectedSelf + collectedBehalf,
      pending,
      onSpot,
      bulkTotal,
      bulkCollected,
      bulkPending,
      individualTotal,
      individualCollected,
      individualPending,
      tshirtInventory,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
