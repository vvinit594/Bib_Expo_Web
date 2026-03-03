import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME, ACTIVE_EVENT_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  password: z.string().min(1, "Password is required"),
});

const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 hours

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

function setActiveEventCookie(response: NextResponse, eventId: string | null) {
  if (!eventId) {
    response.cookies.set(ACTIVE_EVENT_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    return;
  }
  response.cookies.set(ACTIVE_EVENT_COOKIE_NAME, eventId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { phone, password } = parsed.data;
    const normalizedPhone = phone.trim();

    const volunteer = await prisma.volunteer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!volunteer) {
      return NextResponse.json(
        { error: "Account not found or has been removed." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, volunteer.password);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Organizer login only
    if (volunteer.role !== "ORGANIZER") {
      return NextResponse.json(
        { error: "Use the appropriate login page for your role." },
        { status: 403 }
      );
    }

    const token = signToken({
      id: volunteer.id,
      phone: volunteer.phone,
      role: volunteer.role,
      counterName: volunteer.counterName,
      eventId: volunteer.eventId ?? null,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: volunteer.id,
        name: volunteer.name,
        phone: volunteer.phone,
        role: volunteer.role,
        counterName: volunteer.counterName,
        eventId: volunteer.eventId ?? null,
      },
    });

    setAuthCookie(response, token);
    setActiveEventCookie(response, volunteer.eventId ?? null);

    return response;
  } catch (err) {
    console.error("Organizer login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
