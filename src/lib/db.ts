import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prismaInstance: PrismaClient;

const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
  // 1. Production PostgreSQL (Railway)
  console.log("Database Connection: Initializing PostgreSQL Driver Adapter...");
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
} else {
  // 2. Development LibSQL / SQLite (Local)
  console.log("Database Connection: Initializing LibSQL/SQLite Driver Adapter...");
  const adapter = new PrismaLibSql({
    url: databaseUrl.startsWith("file:") ? databaseUrl : `file:${databaseUrl}`,
  });
  prismaInstance = new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || prismaInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
