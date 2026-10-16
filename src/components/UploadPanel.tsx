

"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export type UploadPanelHandle = { open: () => void };

export const UploadPanel = forwardRef<UploadPanelHandle, { onUploaded: () => void }>(
  function UploadPanel({ onUploaded }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingRowCount, setPendingRowCount] = useState<number | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }));

    async function stageFile(file: File) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setStatus("error");
        setMessage("Please upload a .csv file.");
        return;
      }

      const text = await file.text();
      const lineCount = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== "").length;
      const rowCount = Math.max(0, lineCount - 1);

      setPendingFile(file);
      setPendingRowCount(rowCount);
      setStatus("idle");
      setMessage("");
      setConfirmOpen(true);
    }

    async function confirmUpload() {
      if (!pendingFile) return;
      setStatus("uploading");
      setMessage("Uploading…");

      const formData = new FormData();
      formData.append("file", pendingFile);

      try {
        const res = await fetch("/api/users", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Upload failed.");
          return;
        }

        setStatus("success");
        setMessage(
          `Added ${data.inserted} participant${data.inserted === 1 ? "" : "s"}` +
            (data.skipped ? `, skipped ${data.skipped} duplicate${data.skipped === 1 ? "" : "s"}.` : ".")
        );
        onUploaded();
      } catch {
        setStatus("error");
        setMessage("Upload failed. Please try again.");
      } finally {
        setConfirmOpen(false);
        setPendingFile(null);
        setPendingRowCount(null);
      }
    }

    function cancelUpload() {
      setConfirmOpen(false);
      setPendingFile(null);
      setPendingRowCount(null);
    }

    return (
      <>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) stageFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex items-center justify-between gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-colors",
            isDragging ? "border-pwc-orange bg-pwc-orange/5" : "border-pwc-orange/20 bg-pwc-orange/5 hover:bg-pwc-orange/10",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-white p-2 shadow-sm">📄</div>
            <div>
              <p className="text-sm font-medium text-pwc-gray-800">
                Upload a .csv with one participant per row
              </p>
              <p className="text-xs text-pwc-gray-600">
                Use <code>name, email, position, group</code> as headers. Duplicate emails are skipped automatically.
              </p>
              {message && (
                <p
                  className={[
                    "mt-1 text-xs font-medium",
                    status === "error" ? "text-pwc-red" : status === "success" ? "text-emerald-600" : "text-pwc-gray-600",
                  ].join(" ")}
                >
                  {message}
                </p>
              )}
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) stageFile(file);
              e.target.value = "";
            }}
          />

          <span className="shrink-0 text-xs font-medium text-pwc-orange">
            {status === "uploading" ? "Uploading…" : "Drop file or click to browse"}
          </span>
        </div>

        <ConfirmModal
          open={confirmOpen}
          title="Upload participants?"
          description={
            <>
              You&apos;re about to upload <strong>{pendingFile?.name}</strong>
              {pendingRowCount !== null && (
                <>
                  {" "}— approximately <strong>{pendingRowCount}</strong> row{pendingRowCount === 1 ? "" : "s"} detected.
                </>
              )}{" "}
              Duplicate emails will be skipped automatically.
            </>
          }
          confirmLabel="Upload"
          cancelLabel="Cancel"
          loading={status === "uploading"}
          onConfirm={confirmUpload}
          onCancel={cancelUpload}
        />
      </>
    );
  }
);
