import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

    const participants = await prisma.participant.findMany({
      orderBy: { bibNumber: "asc" },
      include: {
        collectedByVolunteer: { select: { name: true } },
      },
    });

    let filtered = participants;
    if (q) {
      filtered = participants.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.bibNumber.toString().includes(q) ||
          (p.category?.toLowerCase().includes(q)) ||
          (p.groupName?.toLowerCase().includes(q)) ||
          (p.email?.toLowerCase().includes(q))
      );
    }

    const mapped = filtered.map((p) => {
      // Normalized status for UI:
      // - Pending + EXCEL  -> "pending"
      // - Pending + ON_SPOT -> "on-spot"
      // - Collected / Collected_By_Behalf -> "collected"
      const status =
        p.collectionStatus === "Pending"
          ? p.source === "ON_SPOT"
            ? "on-spot"
            : "pending"
          : "collected";

      const collectedAt = p.collectedAt
        ? p.collectedAt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined;

      let collectedBy: string | undefined;
      if (p.collectionStatus !== "Pending" && p.collectedByName) {
        // Prefer the new collectionMethod field when present
        if (p.collectionMethod === "BULK") {
          collectedBy = `Bulk (${p.collectedByName})`;
        } else if (p.collectionMethod === "BEHALF") {
          collectedBy = `Behalf (${p.collectedByName})`;
        } else if (p.collectionMethod === "SELF") {
          collectedBy = "Self";
        } else {
          // Backwards compatibility: fall back to collectedByType for old records
          if (p.collectedByType === "Self") collectedBy = "Self";
          else if (p.collectedByType === "Behalf") collectedBy = `Behalf (${p.collectedByName})`;
        }
      } else if (p.collectionStatus !== "Pending" && p.collectedByType === "Self") {
        collectedBy = "Self";
      }

      return {
        id: p.id,
        bib: `#${p.bibNumber}`,
        bibNumber: p.bibNumber,
        name: p.name,
        category: p.category ?? "",
        status,
        group: p.groupName ?? undefined,
        registeredOn: p.registeredOn ?? "",
        emailVerified: p.emailVerified,
        paymentStatus: p.paymentStatus,
        collectedAt,
        collectedBy,
      };
    });

    return NextResponse.json({ participants: mapped });
  } catch (err) {
    console.error("Participants list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
