import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

const collectSchema = z.object({
  type: z.enum(["self", "behalf"]),
  behalfName: z.string().optional(),
  behalfContact: z.string().optional(),
  behalfRelation: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const parsed = collectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { type, behalfName, behalfContact, behalfRelation } = parsed.data;

    const participant = await prisma.participant.findUnique({
      where: { id },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (participant.collectionStatus !== "Pending") {
      return NextResponse.json(
        { error: "Participant already collected" },
        { status: 400 }
      );
    }

    if (type === "behalf" && !behalfName?.trim()) {
      return NextResponse.json(
        { error: "Collected-by name is required for behalf collection" },
        { status: 400 }
      );
    }

    await prisma.participant.update({
      where: { id },
      data: {
        collectionStatus:
          type === "self" ? "Collected" : "Collected_By_Behalf",
        collectedByType: type === "self" ? "Self" : "Behalf",
        collectionMethod: type === "self" ? "SELF" : "BEHALF",
        collectedByName: type === "behalf" ? behalfName?.trim() : null,
        collectedByContact: type === "behalf" ? behalfContact?.trim() ?? null : null,
        collectedByRelation: type === "behalf" ? behalfRelation?.trim() ?? null : null,
        collectedByVolunteerId: auth.id,
        collectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
