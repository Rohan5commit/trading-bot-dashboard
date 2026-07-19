"use client";

import Link from "next/link";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import type { StrategyWithMetrics } from "@/types";

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function PnlCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-500">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  return <span className={color}>{formatCurrency(value)}</span>;
}

function ReturnCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-500">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  return <span className={color}>{formatPercent(value)}</span>;
}

function MiniSparkline({ data }: { data: { date: string; pnl: number }[] }) {
  if (!data.length) return <span className="text-zinc-500">—</span>;
  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="#818cf8"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  strategies: StrategyWithMetrics[];
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
  positiveOnly: boolean;
  onTogglePositive: () => void;
}

export function StrategyTable({
  strategies,
  sortBy,
  sortDir,
  onSort,
  positiveOnly,
  onTogglePositive,
}: Props) {
  const sorted = [...strategies].sort((a, b) => {
    let aVal: number | string | null;
    let bVal: number | string | null;
    switch (sortBy) {
      case "name":
        aVal = a.display_name;
        bVal = b.display_name;
        return sortDir === "asc"
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      case "pnl":
        aVal = a.latest_unrealized_pnl_abs;
        bVal = b.latest_unrealized_pnl_abs;
        break;
      case "return":
        aVal = a.latest_total_account_return_pct;
        bVal = b.latest_total_account_return_pct;
        break;
      case "date":
        aVal = a.latest_report_date;
        bVal = b.latest_report_date;
        break;
      default:
        return 0;
    }
    const aNum = aVal ?? -Infinity;
    const bNum = bVal ?? -Infinity;
    return sortDir === "asc"
      ? (aNum as number) - (bNum as number)
      : (bNum as number) - (aNum as number);
  });

  const filtered = positiveOnly
    ? sorted.filter(
        (s) =>
          s.latest_unrealized_pnl_abs !== null &&
          s.latest_unrealized_pnl_abs > 0
      )
    : sorted;

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    const active = sortBy === field;
    const arrow = active ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none"
        onClick={() => onSort(field)}
      >
        {children}
        {arrow}
      </th>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={positiveOnly}
            onChange={onTogglePositive}
            className="rounded border-zinc-600 bg-zinc-800"
          />
          Show only positive P&L
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800">
          <thead className="bg-zinc-900">
            <tr>
              <SortHeader field="name">Strategy</SortHeader>
              <SortHeader field="date">Last Date</SortHeader>
              <SortHeader field="pnl">Unrealized P&L ($)</SortHeader>
              <SortHeader field="pnl">Unrealized P&L (%)</SortHeader>
              <SortHeader field="return">Total Return (%)</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No strategies found. Run the email ingestion worker to populate data.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/strategy/${s.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {s.display_name}
                    </Link>
                    {s.has_error && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400 border border-amber-700/50">
                        Warning
                      </span>
                    )}
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {s.report_count} report{s.report_count !== 1 ? "s" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {s.latest_report_date ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <PnlCell value={s.latest_unrealized_pnl_abs} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <ReturnCell value={s.latest_unrealized_pnl_pct} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <ReturnCell value={s.latest_total_account_return_pct} />
                  </td>
                  <td className="px-4 py-3">
                    <MiniSparkline data={s.recent_pnl} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
