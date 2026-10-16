import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// ⚠️ If your project already has a shared Prisma singleton (e.g. "@/lib/prisma"),
// replace the two lines below with: import { prisma } from "@/lib/prisma";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET() {
  try {
    const winners = await prisma.userWinner.findMany({
      orderBy: [{ batchNumber: "desc" }, { timestamp: "desc" }],
    });
    return NextResponse.json(winners);
  } catch (err) {
    console.error("Failed to fetch multi-draw winners:", err);
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { winnerIds, prize } = body as { winnerIds: number[]; prize: string };

    if (!Array.isArray(winnerIds) || winnerIds.length === 0) {
      return NextResponse.json({ error: "winnerIds is required" }, { status: 400 });
    }
    if (!prize || !prize.trim()) {
      return NextResponse.json({ error: "Prize is required" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: winnerIds } },
    });

    if (users.length !== winnerIds.length) {
      return NextResponse.json(
        { error: "Some participants were not found" },
        { status: 404 }
      );
    }

    // Atomically compute next batch number + insert all winners in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const agg = await tx.userWinner.aggregate({ _max: { batchNumber: true } });
      const batchNumber = (agg._max.batchNumber ?? 0) + 1;

      const created = await Promise.all(
        users.map((u) =>
          tx.userWinner.create({
            data: {
              name: u.name,
              email: u.email,
              group: u.group,
              position: u.position,
              prize: prize.trim(),
              batchNumber,
            },
          })
        )
      );

      return { batchNumber, winners: created };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to save multi-draw winners:", err);
    return NextResponse.json({ error: "Failed to save winners" }, { status: 500 });
  }
}
