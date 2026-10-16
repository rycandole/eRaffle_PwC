


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const winners = await prisma.userWinner.findMany({ orderBy: { timestamp: "desc" } });

  const csv = toCsv(
    ["timestamp", "name", "email", "group", "position"],
    winners.map((w) => ({
      timestamp: w.timestamp.toISOString(),
      name: w.name,
      email: w.email,
      group: w.group ?? "",
      position: w.position ?? "",
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="winners_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}


