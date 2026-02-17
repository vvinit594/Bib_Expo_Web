import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const volunteer = await prisma.volunteer.findUnique({
      where: { email: normalizedEmail },
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

    // Admin login only — volunteers must use /volunteer-login
    if (volunteer.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Use the volunteer login page to sign in." },
        { status: 403 }
      );
    }

    const token = signToken({
      id: volunteer.id,
      email: volunteer.email,
      role: volunteer.role,
      counterName: volunteer.counterName,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: volunteer.id,
        name: volunteer.name,
        email: volunteer.email,
        role: volunteer.role,
        counterName: volunteer.counterName,
      },
    });

    setAuthCookie(response, token);

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
