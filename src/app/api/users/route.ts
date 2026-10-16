






import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const SORTABLE_FIELDS = new Set(["name", "email", "position", "group", "createdAt"]);

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const page = Math.max(1, Number(searchParams.get("page") ?? 1));
//   const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 8)));
//   const search = (searchParams.get("search") ?? "").trim();
//   const sortByRaw = searchParams.get("sortBy") ?? "name";
//   const sortBy = SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : "name";
//   const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

//   const where = search
//     ? {
//         OR: [
//           { name: { contains: search, mode: "insensitive" as const } },
//           { email: { contains: search, mode: "insensitive" as const } },
//           { position: { contains: search, mode: "insensitive" as const } },
//           { group: { contains: search, mode: "insensitive" as const } },
//         ],
//       }
//     : {};

//   const [total, rows] = await Promise.all([
//     prisma.user.count({ where }),
//     prisma.user.findMany({
//       where,
//       orderBy: { [sortBy]: sortDir },
//       skip: (page - 1) * pageSize,
//       take: pageSize,
//     }),
//   ]);

//   return NextResponse.json({ rows, total, page, pageSize });
// }

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const text = await (file as File).text();
  const records = parseCsv(text);

  if (records.length === 0) {
    return NextResponse.json({ error: "CSV file is empty." }, { status: 400 });
  }

  const prepared = records
    .map((r) => ({
      name: (r.name ?? "").trim(),
      email: (r.email ?? "").trim().toLowerCase(),
      position: (r.position ?? "").trim() || null,
      group: (r.group ?? "").trim() || null,
    }))
    .filter((r) => r.name && r.email);

  if (prepared.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found. Make sure the CSV has name and email columns." },
      { status: 400 }
    );
  }

  const seen = new Set<string>();
  const unique = prepared.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  const result = await prisma.user.createMany({ data: unique, skipDuplicates: true });
  const skipped = prepared.length - result.count;
  const totalParticipants = await prisma.user.count();

  return NextResponse.json({
    totalRowsInFile: records.length,
    inserted: result.count,
    skipped,
    totalParticipants,
  });
}

export async function DELETE() {
  const result = await prisma.user.deleteMany({});
  return NextResponse.json({ deleted: result.count });
}

// export async function GETUSERS() {
//   try {
//     const winners = await prisma.userWinner.findMany({ select: { email: true } });
//     const winnerEmails = winners.map((w) => w.email);

//     const users = await prisma.user.findMany({
//       where: winnerEmails.length > 0 ? { email: { notIn: winnerEmails } } : undefined,
//       orderBy: { id: "asc" },
//     });

//     return NextResponse.json(users);
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
//   }
// }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Raffle request
  const raffle = searchParams.get("raffle") === "true";

  if (raffle) {
    try {
      const winners = await prisma.userWinner.findMany({
        select: { email: true },
      });

      const winnerEmails = winners.map((w) => w.email);

      const users = await prisma.user.findMany({
        where:
          winnerEmails.length > 0
            ? { email: { notIn: winnerEmails } }
            : undefined,
        orderBy: { id: "asc" },
      });

      return NextResponse.json(users);
    } catch (err) {
      console.error(err);

      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }
  }

  // Existing users-table GET
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") ?? 8))
  );

  const search = (searchParams.get("search") ?? "").trim();
  const sortByRaw = searchParams.get("sortBy") ?? "name";
  const sortBy = SORTABLE_FIELDS.has(sortByRaw) ? sortByRaw : "name";
  const sortDir =
    searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { position: { contains: search, mode: "insensitive" as const } },
          { group: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    rows,
    total,
    page,
    pageSize,
  });
}



