import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { sendCollectionEmail } from "@/lib/emailService";
import { extractTshirtSizeCategory } from "@/lib/tshirt";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

const bulkCollectSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1, "At least one participant required"),
  behalfName: z.string().min(1, "Collector name is required"),
  behalfContact: z.string().optional(),
  behalfRelation: z.string().optional(),
  idProof: z.string().optional(),
});

function queueBulkCollectionEmail(params: {
  participantId: string;
  participantName: string;
  participantEmail: string;
  bibNumber: number;
  eventName: string;
  collectorName: string;
}) {
  void (async () => {
    try {
      await sendCollectionEmail({
        participantName: params.participantName,
        participantEmail: params.participantEmail,
        bibNumber: params.bibNumber,
        eventName: params.eventName,
        collectionType: "BULK",
        collectorName: params.collectorName,
      });

      await prisma.participant.update({
        where: { id: params.participantId },
        data: {
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
    } catch (emailErr) {
      console.error("Bulk collection email send failed:", emailErr);
    }
  })();
}

export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof requireAuth>>;
  try {
    auth = await requireAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
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

    const body = await request.json();
    const parsed = bulkCollectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const {
      participantIds,
      behalfName,
      behalfContact,
      behalfRelation,
      idProof,
    } = parsed.data;
    const relationText = [
      behalfRelation?.trim(),
      idProof?.trim() ? `ID: ${idProof.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || null;

    let updated = 0;
    let skipped = 0;

    for (const id of participantIds) {
      const participant = await prisma.participant.findFirst({
        where: { id, ...eventFilter },
        include: {
          expoEvent: {
            select: { name: true },
          },
        },
      });
      if (!participant) {
        skipped += 1;
        continue;
      }
      const fullyCollected = participant.bibCollected && participant.tshirtCollected && participant.goodiesCollected;
      if (fullyCollected) {
        skipped += 1;
        continue;
      }
      if (!participant.tshirtCollected && participant.eventId) {
        const size = extractTshirtSizeCategory(participant.tShirtSize);
        if (size) {
          const event = await prisma.expoEvent.findUnique({
            where: { id: participant.eventId },
            select: { tshirtInventory: true },
          });
          const inv = (event?.tshirtInventory as Record<string, number> | null) ?? {};
          const current = typeof inv[size] === "number" ? inv[size] : 0;
          if (current <= 0) {
            skipped += 1;
            continue;
          }
          await prisma.expoEvent.update({
            where: { id: participant.eventId },
            data: { tshirtInventory: { ...inv, [size]: Math.max(0, current - 1) } },
          });
        }
      }
      const now = new Date();
      await prisma.participant.update({
        where: { id },
        data: {
          collectionStatus: "Collected_By_Behalf",
          collectedByType: "Behalf",
          collectionMethod: "BULK",
          collectedByName: behalfName.trim(),
          collectedByContact: behalfContact?.trim() ?? null,
          collectedByRelation: relationText,
          collectedByVolunteerId: auth.id,
          collectedAt: now,
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
          bibCollectedAt: now,
          tshirtCollectedAt: now,
          goodiesCollectedAt: now,
          bibCollectedBy: behalfName.trim(),
          tshirtCollectedBy: behalfName.trim(),
          goodiesCollectedBy: behalfName.trim(),
        },
      });

      if (participant.email && !participant.emailSent) {
        queueBulkCollectionEmail({
          participantId: participant.id,
          participantName: participant.name,
          participantEmail: participant.email,
          bibNumber: participant.bibNumber,
          eventName: participant.expoEvent?.name ?? "Bib Expo",
          collectorName: behalfName.trim(),
        });
      }

      updated += 1;
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      message: `Bulk collection completed. ${updated} marked as collected.${skipped > 0 ? ` ${skipped} skipped (already collected or not found).` : ""}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
