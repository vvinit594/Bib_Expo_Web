import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth;
  try {
    auth = await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const { id } = await params;

    const volunteer = await prisma.volunteer.findUnique({
      where: { id },
    });

    if (!volunteer || volunteer.role !== "VOLUNTEER") {
      return NextResponse.json(
        { error: "Volunteer not found" },
        { status: 404 }
      );
    }

    // Prevent admin from deleting themselves
    if (volunteer.id === auth.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.participant.updateMany({
        where: { collectedByVolunteerId: id },
        data: { collectedByVolunteerId: null },
      }),
      prisma.volunteer.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) {
      throw err;
    }
    console.error("Delete volunteer error:", err);
    return NextResponse.json(
      { error: "Failed to delete volunteer" },
      { status: 500 }
    );
  }
}
