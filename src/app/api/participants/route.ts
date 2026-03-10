import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-server";
import { extractTshirtSizeCategory } from "@/lib/tshirt";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: Request) {
  let auth;
  try {
    auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (auth.role !== "ADMIN" && !auth.eventId) {
      return NextResponse.json({ error: "Event assignment required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
    const team = searchParams.get("team")?.trim() ?? null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const cookieStore = await cookies();
    const adminEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null;
    const eventFilter: Record<string, unknown> =
      auth.role === "ADMIN"
        ? adminEventId ? { eventId: adminEventId } : {}
        : { eventId: auth.eventId };

    const searchOr: Record<string, unknown>[] = [];
    if (q) {
      searchOr.push(
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { category: { contains: q, mode: "insensitive" as const } },
        { groupName: { contains: q, mode: "insensitive" as const } }
      );
      const bibNum = parseInt(q, 10);
      if (!Number.isNaN(bibNum)) searchOr.push({ bibNumber: bibNum });
    }

    const where = {
      ...eventFilter,
      ...(team ? { bulkTeam: team } : {}),
      ...(searchOr.length > 0 ? { OR: searchOr } : {}),
    };

    const [totalCount, participants] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.findMany({
        where,
        orderBy: { bibNumber: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          collectedByVolunteer: { select: { name: true } },
        },
      }),
    ]);

    const mapped = participants.map((p) => {
      const allKitCollected = p.bibCollected && p.tshirtCollected && p.goodiesCollected;
      const anyKitCollected = p.bibCollected || p.tshirtCollected || p.goodiesCollected;
      // Normalized status for UI:
      // - All kit items collected -> "collected" or "collected-by-behalf"
      // - Some kit items collected -> "partially-collected"
      // - Pending + EXCEL -> "pending"
      // - Pending + ON_SPOT -> "on-spot"
      let status: string;
      if (allKitCollected) {
        status =
          p.collectionStatus === "Collected_By_Behalf" ? "collected-by-behalf" : "collected";
      } else if (anyKitCollected) {
        status = "partially-collected";
      } else {
        status = p.source === "ON_SPOT" ? "on-spot" : "pending";
      }

      const collectedAt = p.collectedAt
        ? p.collectedAt.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined;

      let collectedBy: string | undefined;
      if (p.collectionStatus !== "Pending" && p.collectedByName) {
        // Prefer the new collectionMethod field when present
        if (p.collectionMethod === "BULK_TEAM" && p.collectedByName) {
          collectedBy = `Bulk Team (${p.collectedByName})`;
        } else if (p.collectionMethod === "BULK") {
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
        email: p.email ?? "",
        phone: p.phone ?? "",
        age: p.age ?? "",
        category: p.category ?? "",
        gender: p.gender ?? "",
        tShirtSize: p.tShirtSize ?? "",
        status,
        collectionStatus: p.collectionStatus,
        group: p.groupName ?? undefined,
        bulkTeam: p.bulkTeam ?? undefined,
        registeredOn: p.registeredOn ?? "",
        emailVerified: p.emailVerified,
        paymentStatus: p.paymentStatus,
        collectedAt,
        collectedBy,
        bibCollected: p.bibCollected,
        tshirtCollected: p.tshirtCollected,
        goodiesCollected: p.goodiesCollected,
        tshirtSizeCategory: extractTshirtSizeCategory(p.tShirtSize) ?? undefined,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    return NextResponse.json({
      participants: mapped,
      totalCount,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error("Participants list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}
