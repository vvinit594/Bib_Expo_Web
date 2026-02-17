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
    const count = await prisma.volunteer.count();
    return NextResponse.json({ count });
  } catch (err) {
    console.error("Volunteer count error:", err);
    return NextResponse.json(
      { error: "Failed to fetch volunteer count" },
      { status: 500 }
    );
  }
}
