import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

// Use the same adapter-based client as the app
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

// Change these if you want a different default
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "9987688443";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function main() {
  const existing = await prisma.volunteer.findUnique({
    where: { phone: ADMIN_PHONE },
  });

  if (existing) {
    console.log("Admin already exists with phone:", ADMIN_PHONE);
    return;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.volunteer.create({
    data: {
      name: "Super Admin",
      phone: ADMIN_PHONE,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin created successfully:");
  console.log("  Phone:", ADMIN_PHONE);
  console.log("  Password:", ADMIN_PASSWORD);
  console.log("  Id:", admin.id);
}

main()
  .catch((err) => {
    console.error("Create-admin error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

