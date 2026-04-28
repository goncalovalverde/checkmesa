import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VERSION = process.env.npm_package_version ?? "unknown";
const START_TIME = Date.now();

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", uptime: uptimeSeconds() },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    version: VERSION,
    db: "ok",
    uptime: uptimeSeconds(),
  });
}

function uptimeSeconds(): number {
  return Math.floor((Date.now() - START_TIME) / 1000);
}
