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

    const mapped = filtered.map((p) => ({
      id: p.id,
      bib: `#${p.bibNumber}`,
      bibNumber: p.bibNumber,
      name: p.name,
      category: p.category ?? "",
      status: p.collectionStatus.toLowerCase().replace("_", "-"),
      group: p.groupName ?? undefined,
      registeredOn: p.registeredOn ?? "",
      emailVerified: p.emailVerified,
      paymentStatus: p.paymentStatus,
      collectedAt: p.collectedAt
        ? p.collectedAt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
      collectedBy: p.collectedByType === "Self"
        ? "Self"
        : p.collectedByType === "Behalf" && p.collectedByName
          ? `Behalf (${p.collectedByName})`
          : p.collectedByType ?? undefined,
    }));

    return NextResponse.json({ participants: mapped });
  } catch (err) {
    console.error("Participants list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
