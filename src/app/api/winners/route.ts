// import { prisma } from "@/lib/prisma";
// import { NextResponse } from "next/server";



// export async function GET() {
//   try {
//     const winners = await prisma.userWinner.findMany({ orderBy: { timestamp: "desc" } });
//     return NextResponse.json(winners);
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
//   }
// }






import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = new Set(["name", "email", "group", "position", "timestamp"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 8)));
  const search = (searchParams.get("search") ?? "").trim();
  const sortByRaw = searchParams.get("sortBy") ?? "timestamp";
  const sortBy = SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : "timestamp";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { group: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.userWinner.count({ where }),
    prisma.userWinner.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ rows, total, page, pageSize });
}

export async function DELETE() {
  const result = await prisma.userWinner.deleteMany({});
  return NextResponse.json({ deleted: result.count });
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent duplicate winner records for the same person
    const existing = await prisma.userWinner.findFirst({ where: { email: user.email } });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const winner = await prisma.userWinner.create({
      data: {
        name: user.name,
        email: user.email,
        position: user.position,
        group: user.group,
      },
    });

    return NextResponse.json(winner, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save winner" }, { status: 500 });
  }
}
