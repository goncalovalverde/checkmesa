import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VERSION = process.env.npm_package_version ?? "unknown";
const START_TIME = Date.now();

type MigrationCount = { count: bigint };

export async function GET() {
  // 1. DB reachability
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", migrations: "unknown", uptime: uptimeSeconds() },
      { status: 503 }
    );
  }

  // 2. Migration completeness
  try {
    const [pending] = await prisma.$queryRaw<MigrationCount[]>`
      SELECT COUNT(*) AS count FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `;
    if (Number(pending.count) > 0) {
      return NextResponse.json(
        { status: "error", db: "ok", migrations: "pending", uptime: uptimeSeconds() },
        { status: 503 }
      );
    }

    const [failed] = await prisma.$queryRaw<MigrationCount[]>`
      SELECT COUNT(*) AS count FROM _prisma_migrations
      WHERE rolled_back_at IS NOT NULL
    `;
    if (Number(failed.count) > 0) {
      return NextResponse.json(
        { status: "error", db: "ok", migrations: "failed", uptime: uptimeSeconds() },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      { status: "error", db: "ok", migrations: "unknown", uptime: uptimeSeconds() },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    version: VERSION,
    db: "ok",
    migrations: "ok",
    uptime: uptimeSeconds(),
  });
}

function uptimeSeconds(): number {
  return Math.floor((Date.now() - START_TIME) / 1000);
}
