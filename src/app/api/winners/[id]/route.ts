import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  try {
    await prisma.userWinner.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Winner not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}


