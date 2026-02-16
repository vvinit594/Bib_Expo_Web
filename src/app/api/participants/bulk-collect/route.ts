import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

const bulkCollectSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1, "At least one participant required"),
  behalfName: z.string().min(1, "Collector name is required"),
  behalfContact: z.string().optional(),
  behalfRelation: z.string().optional(),
  idProof: z.string().optional(),
});

export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof requireAuth>>;
  try {
    auth = await requireAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  try {
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
      const participant = await prisma.participant.findUnique({
        where: { id },
      });
      if (!participant) {
        skipped += 1;
        continue;
      }
      if (participant.collectionStatus !== "Pending") {
        skipped += 1;
        continue;
      }
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
          collectedAt: new Date(),
        },
      });
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
