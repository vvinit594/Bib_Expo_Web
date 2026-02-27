import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-server";

const createVolunteerSchema = z.object({
  name: z.string().min(1, "Username is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  counterName: z.string().min(1, "Counter name is required"),
});

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
    const parsed = createVolunteerSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, phone, password, counterName } = parsed.data;
    const normalizedPhone = phone.trim();

    const existing = await prisma.volunteer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Volunteer with this phone number already exists" },
        { status: 409 }
      );
    }

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Phone number must be a valid 10-digit Indian mobile number" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.volunteer.create({
      data: {
        name: name.trim(),
        phone: normalizedPhone,
        password: passwordHash,
        role: "VOLUNTEER",
        counterName: counterName.trim(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Volunteer created successfully",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) {
      throw err;
    }
    console.error("Create volunteer error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
