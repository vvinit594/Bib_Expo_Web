import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM "ExpoEvent" ORDER BY "createdAt" DESC LIMIT 1
    `;
    const expoEvent = rows[0] ?? null;
    if (!expoEvent) {
      return NextResponse.json({ event: null, name: null });
    }
    return NextResponse.json({ event: { id: expoEvent.id, name: expoEvent.name }, name: expoEvent.name });
  } catch (err) {
    console.error("Current event error:", err);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
