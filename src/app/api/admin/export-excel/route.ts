import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const participants = await prisma.participant.findMany({
      orderBy: { bibNumber: "asc" },
      include: {
        collectedByVolunteer: {
          select: { name: true },
        },
      },
    });

    const rows = [
      [
        "Bib Number",
        "Name",
        "Email",
        "Phone",
        "Age",
        "Category",
        "Gender",
        "T-Shirt Size",
        "Group",
        "Payment Status",
        "Collection Status",
        "Collected By (Self/Behalf)",
        "Collected By Name",
        "Collected By Contact",
        "Collected By Relation",
        "Volunteer Name",
        "Collected At",
      ],
      ...participants.map((p) => [
        p.bibNumber,
        p.name,
        p.email ?? "",
        p.phone ?? "",
        p.age ?? "",
        p.category ?? "",
        p.gender ?? "",
        p.tShirtSize ?? "",
        p.groupName ?? "",
        p.paymentStatus,
        p.collectionStatus,
        p.collectedByType ?? "",
        p.collectedByName ?? "",
        p.collectedByContact ?? "",
        p.collectedByRelation ?? "",
        p.collectedByVolunteer?.name ?? "",
        p.collectedAt ? p.collectedAt.toISOString() : "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bib-expo-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Excel export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
