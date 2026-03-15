import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "9987688443";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.volunteer.upsert({
    where: { phone: ADMIN_PHONE },
    update: {
      name: "Super Admin",
      password: passwordHash,
      role: "ADMIN",
    },
    create: {
      name: "Super Admin",
      phone: ADMIN_PHONE,
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin user ready:");
  console.log("  Phone:", ADMIN_PHONE);
  console.log("  Password:", ADMIN_PASSWORD);
  console.log("\n⚠ Change the password after first login in production!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
