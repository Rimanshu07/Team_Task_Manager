import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let prismaInstance: PrismaClient;

// Use self-contained SQLite / LibSQL for a robust, self-contained, 100% reliable local and production deployment!
const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

console.log("Database Connection: Initializing LibSQL/SQLite Driver Adapter...");
const adapter = new PrismaLibSql({
  url: databaseUrl.startsWith("file:") ? databaseUrl : `file:${databaseUrl}`,
});

prismaInstance = new PrismaClient({ adapter });

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
