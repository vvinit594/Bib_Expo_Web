import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [total, collectedSelf, pending, collectedBehalf, onSpot] = await Promise.all([
      prisma.participant.count(),
      prisma.participant.count({ where: { collectionStatus: "Collected" } }),
      prisma.participant.count({ where: { collectionStatus: "Pending" } }),
      prisma.participant.count({ where: { collectionStatus: "Collected_By_Behalf" } }),
      prisma.participant.count({ where: { source: "ON_SPOT" } }),
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
