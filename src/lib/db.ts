import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to your .env file.");
  }
  try {
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  } catch (e) {
    throw new Error(`Database connection failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
