import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { sendCollectionEmail } from "@/lib/emailService";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

const collectSchema = z.object({
  type: z.enum(["self", "behalf", "partial"]),
  behalfName: z.string().optional(),
  behalfContact: z.string().optional(),
  behalfRelation: z.string().optional(),
  items: z.array(z.enum(["bib", "tshirt", "goodies"])).optional(),
});

function queueCollectionEmail(params: {
  participantId: string;
  participantName: string;
  participantEmail: string;
  bibNumber: number;
  eventName: string;
  collectionType: "SELF" | "BEHALF";
  collectorName?: string;
}) {
  void (async () => {
    try {
      await sendCollectionEmail({
        participantName: params.participantName,
        participantEmail: params.participantEmail,
        bibNumber: params.bibNumber,
        eventName: params.eventName,
        collectionType: params.collectionType,
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
      console.error("Collection email send failed:", emailErr);
    }
  })();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "ADMIN" && !auth.eventId) {
      return NextResponse.json({ error: "Event assignment required" }, { status: 403 });
    }
    const { id } = await params;

    const body = await request.json();
    const parsed = collectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { type, behalfName, behalfContact, behalfRelation, items } = parsed.data;

    if (type === "partial" && (!items || items.length === 0)) {
      return NextResponse.json(
        { error: "At least one item (bib, tshirt, goodies) is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const adminEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null;
    const eventFilter =
      auth.role === "ADMIN"
        ? adminEventId ? { eventId: adminEventId } : {}
        : { eventId: auth.eventId };

    const participant = await prisma.participant.findFirst({
      where: { id, ...eventFilter },
      include: {
        expoEvent: {
          select: { name: true },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const isFullyCollected = (p: typeof participant) =>
      p.bibCollected && p.tshirtCollected && p.goodiesCollected;

    if (type !== "partial" && participant.collectionStatus !== "Pending") {
      return NextResponse.json(
        { error: "Participant already collected" },
        { status: 400 }
      );
    }
    if (type === "partial" && isFullyCollected(participant)) {
      return NextResponse.json(
        { error: "Participant kit already fully collected" },
        { status: 400 }
      );
    }

    if (type === "behalf" && !behalfName?.trim()) {
      return NextResponse.json(
        { error: "Collected-by name is required for behalf collection" },
        { status: 400 }
      );
    }

    const counterName = auth.counterName ?? `Counter ${auth.phone.slice(-4)}` ?? "Counter";

    if (type === "partial") {
      const now = new Date();
      const data: {
        bibCollected?: boolean;
        bibCollectedAt?: Date;
        bibCollectedBy?: string;
        tshirtCollected?: boolean;
        tshirtCollectedAt?: Date;
        tshirtCollectedBy?: string;
        goodiesCollected?: boolean;
        goodiesCollectedAt?: Date;
        goodiesCollectedBy?: string;
      } = {};
      if (items!.includes("bib") && !participant.bibCollected) {
        data.bibCollected = true;
        data.bibCollectedAt = now;
        data.bibCollectedBy = counterName;
      }
      if (items!.includes("tshirt") && !participant.tshirtCollected) {
        data.tshirtCollected = true;
        data.tshirtCollectedAt = now;
        data.tshirtCollectedBy = counterName;
      }
      if (items!.includes("goodies") && !participant.goodiesCollected) {
        data.goodiesCollected = true;
        data.goodiesCollectedAt = now;
        data.goodiesCollectedBy = counterName;
      }
      if (Object.keys(data).length > 0) {
        const after = await prisma.participant.update({
          where: { id },
          data,
        });
        const allTrue = after.bibCollected && after.tshirtCollected && after.goodiesCollected;
        if (allTrue) {
          await prisma.participant.update({
            where: { id },
            data: {
              collectionStatus: "Collected",
              collectedByType: "Self",
              collectionMethod: "SELF",
              collectedByVolunteerId: auth.id,
              collectedAt: now,
            },
          });
        }
        for (const item of items!) {
          const key = item === "bib" ? "bibCollected" : item === "tshirt" ? "tshirtCollected" : "goodiesCollected";
          const prev = participant[key as keyof typeof participant];
          if (!prev) {
            await prisma.kitCollectionLog.create({
              data: {
                eventId: participant.eventId,
                participantId: participant.id,
                bibNumber: participant.bibNumber,
                participantName: participant.name,
                itemType: item,
                collectedBy: counterName,
                counterName: auth.counterName ?? null,
              },
            });
          }
        }
      }
    } else {
      await prisma.participant.update({
        where: { id },
        data: {
          collectionStatus: type === "self" ? "Collected" : "Collected_By_Behalf",
          collectedByType: type === "self" ? "Self" : "Behalf",
          collectionMethod: type === "self" ? "SELF" : "BEHALF",
          collectedByName: type === "behalf" ? behalfName?.trim() : null,
          collectedByContact: type === "behalf" ? behalfContact?.trim() ?? null : null,
          collectedByRelation: type === "behalf" ? behalfRelation?.trim() ?? null : null,
          collectedByVolunteerId: auth.id,
          collectedAt: new Date(),
          bibCollected: true,
          tshirtCollected: true,
          goodiesCollected: true,
          bibCollectedAt: new Date(),
          tshirtCollectedAt: new Date(),
          goodiesCollectedAt: new Date(),
          bibCollectedBy: type === "self" ? counterName : behalfName?.trim() ?? null,
          tshirtCollectedBy: type === "self" ? counterName : behalfName?.trim() ?? null,
          goodiesCollectedBy: type === "self" ? counterName : behalfName?.trim() ?? null,
        },
      });
    }

    if (type !== "partial" && participant.email && !participant.emailSent) {
      queueCollectionEmail({
        participantId: participant.id,
        participantName: participant.name,
        participantEmail: participant.email,
        bibNumber: participant.bibNumber,
        eventName: participant.expoEvent?.name ?? "Bib Expo",
        collectionType: type === "self" ? "SELF" : "BEHALF",
        collectorName: type === "self" ? undefined : behalfName?.trim(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
