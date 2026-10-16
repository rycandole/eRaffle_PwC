import { NextResponse } from "next/server";
export async function GET() {
  const csv = "name,email,position,group\nJane Doe,jane.doe@example.com,Software Engineer,Group A\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="participants_template.csv"',
    },
  });
}
