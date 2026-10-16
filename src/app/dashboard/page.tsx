

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DataTable, Column } from "@/components/DataTable";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { UploadPanel, UploadPanelHandle } from "@/components/UploadPanel";

type Participant = { id: number; name: string; email: string; position: string | null; group: string | null };
type Winner = {
  id: number;
  timestamp: string;
  name: string;
  email: string;
  group: string | null;
  position: string | null;
};

export default function UploadPage() {
  const [view, setView] = useState<"participants" | "winners">("participants");
  const [refreshToken, setRefreshToken] = useState(0);
  const [participantTotal, setParticipantTotal] = useState(0);
  const [winnerTotal, setWinnerTotal] = useState(0);
  const uploadRef = useRef<UploadPanelHandle>(null);

  const todayStamp = new Date().toISOString().slice(0, 10);

  const participantColumns: Column<Participant>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "position", label: "Position", sortable: true },
    {
      key: "group",
      label: "Group",
      sortable: true,
      render: (row) =>
        row.group ? (
          <span className="rounded-full bg-pwc-gray-100 px-2.5 py-1 text-xs font-medium text-pwc-gray-600">{row.group}</span>
        ) : (
          "—"
        ),
    },
  ];

  const winnerColumns: Column<Winner>[] = [
    { key: "timestamp", label: "Time", sortable: true, render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "group",
      label: "Group",
      sortable: true,
      render: (row) =>
        row.group ? (
          <span className="rounded-full bg-pwc-yellow/15 px-2.5 py-1 text-xs font-medium text-pwc-orange">{row.group}</span>
        ) : (
          "—"
        ),
    },
    { key: "position", label: "Position", sortable: true },
  ];

  return (
    <div className="min-h-screen bg-pwc-gray-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top bar: view toggle + draw raffle link (always visible) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ToggleSwitch
            value={view}
            onChange={setView}
            options={[
              { value: "participants", label: "Participants" },
              { value: "winners", label: "Winners" },
            ]}
          />
          <Link
            href="/raffle"
            className="inline-flex items-center gap-2 rounded-lg bg-pwc-yellow px-4 py-2 text-sm font-semibold text-pwc-black shadow-sm hover:bg-pwc-tangerine"
          >
            🎲 Draw raffle
          </Link>
        </div>

        {/* Section header: title + count badge + contextual actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-pwc-black">
              {view === "participants" ? "Participants" : "Winners"}
            </h1>
            <span className="rounded-full bg-pwc-orange/10 px-3 py-1 text-xs font-semibold text-pwc-orange">
              {view === "participants" ? participantTotal : winnerTotal} total
            </span>
          </div>

          {/* <div className="flex items-center gap-2">
            {view === "participants" ? (
              <>
                <a
                  href="/api/users/template"
                  className="rounded-lg border border-pwc-gray-200 bg-white px-3 py-2 text-sm font-medium text-pwc-gray-600 hover:bg-pwc-gray-50"
                >
                  ⭳ CSV template
                </a>
                <button
                  onClick={() => uploadRef.current?.open()}
                  className="rounded-lg bg-pwc-orange px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pwc-tangerine"
                >
                  ⭱ Upload CSV
                </button>
              </>
            ) : (
              <a
                href="/api/winners/download"
                className="rounded-lg bg-pwc-orange px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pwc-tangerine"
              >
                ⭳ Download winners CSV
              </a>
            )}
          </div> */}

          <div className="flex items-center gap-2">
          {view === "participants" ? (
            <>
              <Link
                href="/api/users/template"
                className="rounded-lg border border-[#EDEDED] bg-white px-3 py-2 text-sm font-medium text-[#464646] transition-colors hover:bg-[#FAFAFA]"
              >
                ⭳ CSV template
              </Link>

              <button
                type="button"
                onClick={() => uploadRef.current?.open()}
                className="rounded-lg bg-[#D04A02] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#EB8C00]"
              >
                ⭱ Upload CSV
              </button>
            </>
          ) : (
            <Link
              href="/api/winners/download"
              className="rounded-lg bg-[#D04A02] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#EB8C00]"
            >
              ⭳ Download winners CSV
            </Link>
          )}
        </div>
        </div>

        {view === "participants" && (
          <UploadPanel ref={uploadRef} onUploaded={() => setRefreshToken((t) => t + 1)} />
        )}

        {view === "participants" ? (
          <DataTable<Participant>
            key="participants"
            title="All participants"
            fetchUrl="/api/users"
            columns={participantColumns}
            defaultSort={{ by: "name", dir: "asc" }}
            searchPlaceholder="Search name or email"
            refreshToken={refreshToken}
            emptyLabel="No participants yet — upload a CSV to get started."
            onTotalChange={setParticipantTotal}
            rowActions={{
              exportHeaders: ["name", "email", "position", "group"],
              exportRow: (row) => ({
                name: row.name,
                email: row.email,
                position: row.position ?? "",
                group: row.group ?? "",
              }),
              exportFilename: (row) => `participant_${row.email}_${todayStamp}.csv`,
              confirmTitle: "Delete this participant?",
              confirmDescription: (row) => (
                <>
                  <strong>{row.name}</strong> ({row.email}) will be exported as a CSV backup, then permanently
                  removed from the drawing. This cannot be undone.
                </>
              ),
              onDelete: async (row) => {
                const res = await fetch(`/api/users/${row.id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete participant.");
              },
            }}
            bulkDelete={{
              label: "Delete all",
              exportUrl: "/api/users/export",
              exportFilename: `participants_backup_${todayStamp}.csv`,
              confirmTitle: "Delete all participants?",
              onDeleteAll: async () => {
                const res = await fetch("/api/users", { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete participants.");
              },
            }}
          />
        ) : (
          <DataTable<Winner>
            key="winners"
            title="All winners"
            fetchUrl="/api/winners"
            columns={winnerColumns}
            defaultSort={{ by: "timestamp", dir: "asc" }}
            searchPlaceholder="Search name or email"
            emptyLabel="No winners drawn yet."
            onTotalChange={setWinnerTotal}
            rowActions={{
              exportHeaders: ["timestamp", "name", "email", "group", "position"],
              exportRow: (row) => ({
                timestamp: row.timestamp,
                name: row.name,
                email: row.email,
                group: row.group ?? "",
                position: row.position ?? "",
              }),
              exportFilename: (row) => `winner_${row.email}_${todayStamp}.csv`,
              confirmTitle: "Delete this winner?",
              confirmDescription: (row) => (
                <>
                  <strong>{row.name}</strong> ({row.email}) will be exported as a CSV backup, then permanently
                  removed from the winners list. This cannot be undone.
                </>
              ),
              onDelete: async (row) => {
                const res = await fetch(`/api/winners/${row.id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete winner.");
              },
            }}
            bulkDelete={{
              label: "Delete all",
              exportUrl: "/api/winners/download",
              exportFilename: `winners_backup_${todayStamp}.csv`,
              confirmTitle: "Delete all winners?",
              onDeleteAll: async () => {
                const res = await fetch("/api/winners", { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete winners.");
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
