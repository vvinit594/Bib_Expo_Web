import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function POST() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const result = await prisma.participant.deleteMany({});
    await prisma.$executeRaw`DELETE FROM "ExpoEvent"`;
    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} participant(s). System ready for next event.`,
    });
  } catch (err) {
    console.error("Delete event data error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
