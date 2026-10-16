import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  const csv = toCsv(
    ["name", "email", "position", "group"],
    users.map((u) => ({
      name: u.name,
      email: u.email,
      position: u.position ?? "",
      group: u.group ?? "",
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participants_backup_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
