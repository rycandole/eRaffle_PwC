


"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebounceValue";
import { ConfirmModal } from "@/components/ConfirmModal";
import { downloadCsv, downloadFromUrl } from "@/lib/downloadCsv";

export type Column<T> = {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

export type RowActionsConfig<T> = {
  exportHeaders: string[];
  exportRow: (row: T) => Record<string, string>;
  exportFilename: (row: T) => string;
  onDelete: (row: T) => Promise<void>;
  confirmTitle?: string;
  confirmDescription?: (row: T) => React.ReactNode;
};

export type BulkDeleteConfig = {
  label?: string;
  exportUrl: string;
  exportFilename: string;
  onDeleteAll: () => Promise<void>;
  confirmTitle?: string;
  confirmDescription?: React.ReactNode;
};

type FetchResponse<T> = { rows: T[]; total: number };

export function DataTable<T extends { id: number | string }>({
  title,
  columns,
  fetchUrl,
  pageSize = 8,
  searchPlaceholder = "Search…",
  defaultSort,
  refreshToken,
  emptyLabel = "No records found.",
  onTotalChange,
  rowActions,
  bulkDelete,
}: {
  title: React.ReactNode;
  columns: Column<T>[];
  fetchUrl: string;
  pageSize?: number;
  searchPlaceholder?: string;
  defaultSort: { by: string; dir: "asc" | "desc" };
  refreshToken?: number;
  emptyLabel?: string;
  onTotalChange?: (total: number) => void;
  rowActions?: RowActionsConfig<T>;
  bulkDelete?: BulkDeleteConfig;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const [resetKey, setResetKey] = useState({
    search: debouncedSearch,
    sortBy: sort.by,
    sortDir: sort.dir,
    fetchUrl,
  });

  if (
    resetKey.search !== debouncedSearch ||
    resetKey.sortBy !== sort.by ||
    resetKey.sortDir !== sort.dir ||
    resetKey.fetchUrl !== fetchUrl
  ) {
    setResetKey({ search: debouncedSearch, sortBy: sort.by, sortDir: sort.dir, fetchUrl });
    setPage(1);
  }

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional loading flag for async fetch; standard data-fetching pattern.
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search: debouncedSearch,
      sortBy: sort.by,
      sortDir: sort.dir,
    });

    fetch(`${fetchUrl}?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: FetchResponse<T>) => {
        if (controller.signal.aborted) return;
        setRows(data.rows);
        setTotal(data.total);
        onTotalChange?.(data.total);
        if (data.rows.length === 0 && page > 1 && data.total > 0) {
          setPage(1);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("Failed to load table data:", err);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onTotalChange intentionally excluded to avoid refetch loops from inline parent callbacks.
  }, [fetchUrl, page, pageSize, debouncedSearch, sort.by, sort.dir, refreshToken, version]);

  function toggleSort(key: string) {
    setSort((prev) =>
      prev.by === key ? { by: key, dir: prev.dir === "asc" ? "desc" : "asc" } : { by: key, dir: "asc" }
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function renderCell(row: T, col: Column<T>): React.ReactNode {
    if (col.render) return col.render(row);
    const value = row[col.key];
    if (value === null || value === undefined || value === "") return "—";
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
  }

  function requestRowDelete(row: T) {
    setActionError(null);
    setPendingDelete(row);
  }

  function cancelRowDelete() {
    setActionError(null);
    setPendingDelete(null);
  }

  function openDeleteAll() {
    setActionError(null);
    setConfirmAllOpen(true);
  }

  function cancelDeleteAll() {
    setActionError(null);
    setConfirmAllOpen(false);
  }

  async function handleConfirmRowDelete() {
    if (!pendingDelete || !rowActions) return;
    setDeleting(true);
    setActionError(null);
    try {
      downloadCsv(
        rowActions.exportFilename(pendingDelete),
        rowActions.exportHeaders,
        [rowActions.exportRow(pendingDelete)]
      );
      await rowActions.onDelete(pendingDelete);
      setVersion((v) => v + 1);
      setPendingDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete record.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmDeleteAll() {
    if (!bulkDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await downloadFromUrl(bulkDelete.exportUrl, bulkDelete.exportFilename);
      await bulkDelete.onDeleteAll();
      setVersion((v) => v + 1);
      setConfirmAllOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete records.");
    } finally {
      setDeleting(false);
    }
  }

  const colSpan = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pwc-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-pwc-black">{title}</h2>
        <div className="flex items-center gap-2">
          {bulkDelete && (
            <button
              type="button"
              onClick={openDeleteAll}
              disabled={total === 0}
              className="rounded-lg border border-pwc-red/30 px-3 py-2 text-xs font-medium text-pwc-red hover:bg-pwc-red/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bulkDelete.label ?? "Delete all"}
            </button>
          )}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pwc-gray-600">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-64 rounded-lg border text-pwc-gray-600 border-pwc-gray-200 bg-pwc-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-pwc-orange/40 focus:bg-white focus:ring-2 focus:ring-pwc-orange/10"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-pwc-gray-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={[
                    "px-5 py-3 font-medium select-none",
                    col.sortable ? "cursor-pointer hover:text-pwc-gray-600" : "",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-[10px]">
                        {sort.by === col.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {rowActions && <th className="px-5 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-pwc-gray-100">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-5 py-10 text-center text-pwc-gray-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-5 py-10 text-center text-pwc-gray-400">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-pwc-gray-50/70">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3 text-pwc-gray-600">
                      {renderCell(row, col)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => requestRowDelete(row)}
                        className="rounded-lg px-2 py-1 text-pwc-red hover:bg-pwc-red/5"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-sm text-pwc-gray-600">
        <span>{total} total</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg px-2 py-1 disabled:opacity-30 hover:bg-pwc-gray-100"
          >
            ‹
          </button>
          <span className="rounded-lg bg-pwc-orange px-3 py-1 text-xs font-semibold text-white">
            {page}
          </span>
          <span>of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg px-2 py-1 disabled:opacity-30 hover:bg-pwc-gray-100"
          >
            ›
          </button>
        </div>
      </div>

      {rowActions && (
        <ConfirmModal
          open={pendingDelete !== null}
          title={rowActions.confirmTitle ?? "Delete this record?"}
          description={
            <>
              {pendingDelete
                ? rowActions.confirmDescription?.(pendingDelete) ?? (
                    <>A CSV backup of this record will download, then it will be permanently removed. This cannot be undone.</>
                  )
                : null}
              {actionError && <p className="mt-2 font-medium text-pwc-red">{actionError}</p>}
            </>
          }
          confirmLabel="Delete"
          destructive
          loading={deleting}
          onConfirm={handleConfirmRowDelete}
          onCancel={cancelRowDelete}
        />
      )}

      {bulkDelete && (
        <ConfirmModal
          open={confirmAllOpen}
          title={bulkDelete.confirmTitle ?? "Delete all records?"}
          description={
            <>
              {bulkDelete.confirmDescription ?? (
                <>
                  All {total} record{total === 1 ? "" : "s"} will be exported as a CSV backup first, then permanently removed. This cannot be undone.
                </>
              )}
              {actionError && <p className="mt-2 font-medium text-pwc-red">{actionError}</p>}
            </>
          }
          confirmLabel="Delete all"
          destructive
          loading={deleting}
          onConfirm={handleConfirmDeleteAll}
          onCancel={cancelDeleteAll}
        />
      )}
    </div>
  );
}
