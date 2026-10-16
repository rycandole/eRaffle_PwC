


import { toCsv } from "@/lib/csv";

/** Build and download a CSV from in-memory rows (e.g. a single record before deleting it). */
export function downloadCsv(filename: string, headers: string[], rows: Record<string, string>[]) {
  const csv = toCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Fetch a CSV export endpoint and download it, awaiting completion before resolving. */
export async function downloadFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to export backup CSV. Deletion was cancelled.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}



