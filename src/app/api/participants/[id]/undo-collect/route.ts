import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "ADMIN" && !auth.eventId) {
      return NextResponse.json({ error: "Event assignment required" }, { status: 403 });
    }
    const { id } = await params;

    const cookieStore = await cookies();
    const adminEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null;
    const eventFilter =
      auth.role === "ADMIN"
        ? adminEventId ? { eventId: adminEventId } : {}
        : { eventId: auth.eventId };

    const participant = await prisma.participant.findFirst({
      where: { id, ...eventFilter },
      select: {
        id: true,
        eventId: true,
        name: true,
        category: true,
        collectionStatus: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (participant.collectionStatus === "Pending") {
      return NextResponse.json(
        { error: "Collection already reverted" },
        { status: 400 }
      );
    }

    const actor = await prisma.volunteer.findUnique({
      where: { id: auth.id },
      select: { name: true },
    });

    const revertedBy = auth.role === "ADMIN"
      ? "Admin"
      : actor?.name?.trim() || "Volunteer";

    await prisma.$transaction([
      prisma.participant.update({
        where: { id },
        data: {
          collectionStatus: "Pending",
          collectedByType: null,
          collectionMethod: null,
          collectedByName: null,
          collectedByContact: null,
          collectedByRelation: null,
          collectedByVolunteerId: null,
          collectedAt: null,
          bibCollected: false,
          tshirtCollected: false,
          goodiesCollected: false,
          bibCollectedAt: null,
          tshirtCollectedAt: null,
          goodiesCollectedAt: null,
          bibCollectedBy: null,
          tshirtCollectedBy: null,
          goodiesCollectedBy: null,
          emailSent: false,
          emailSentAt: null,
        },
      }),
      prisma.collectionRevertLog.create({
        data: {
          participantId: participant.id,
          eventId: participant.eventId ?? null,
          participantName: participant.name,
          participantCategory: participant.category ?? null,
          revertedBy,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
