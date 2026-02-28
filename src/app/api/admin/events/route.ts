import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-server";

const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const [eventRows, cookieStore] = await Promise.all([
      prisma.$queryRaw<{ id: string; name: string; createdAt: Date }[]>`
        SELECT id, name, "createdAt" FROM "ExpoEvent" ORDER BY "createdAt" DESC
      `,
      cookies(),
    ]);

    const activeEventId = cookieStore.get(ACTIVE_EVENT_COOKIE_NAME)?.value ?? null;
    return NextResponse.json({
      events: eventRows.map((e) => ({
        id: e.id,
        name: e.name,
        createdAt: e.createdAt.toISOString(),
      })),
      activeEventId,
    });
  } catch (err) {
    console.error("Events list error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const rows = await prisma.$queryRaw<{ id: string; name: string; createdAt: Date }[]>`
      INSERT INTO "ExpoEvent" (id, name, "createdAt")
      VALUES (gen_random_uuid(), ${name}, NOW())
      RETURNING id, name, "createdAt"
    `;
    const event = rows[0] ?? null;
    if (!event) {
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name,
        createdAt: event.createdAt.toISOString(),
      },
    });
    response.cookies.set(ACTIVE_EVENT_COOKIE_NAME, event.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    console.error("Create event error:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
