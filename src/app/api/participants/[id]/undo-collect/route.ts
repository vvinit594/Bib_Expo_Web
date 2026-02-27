import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      select: {
        id: true,
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

    const revertedBy = actor?.name?.trim() || (auth.role === "ADMIN" ? "Admin" : "Volunteer");

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
          emailSent: false,
          emailSentAt: null,
        },
      }),
      prisma.collectionRevertLog.create({
        data: {
          participantId: participant.id,
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
