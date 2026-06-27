"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PnlChart } from "@/components/pnl-chart";
import { EmailViewer } from "@/components/email-viewer";
import type { StrategyDetail, Report } from "@/types";

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

export default function StrategyPage() {
  const params = useParams();
  const id = params.id as string;

  const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/strategies/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setStrategy(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-zinc-500">Loading strategy details...</div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error || "Strategy not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          &larr; Back to Overview
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {strategy.display_name}
        </h1>
        <p className="text-zinc-400 mt-1">
          {strategy.reports.length} report{strategy.reports.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Avg P&L (%)"
          value={formatPercent(strategy.avg_pnl_pct)}
          color={
            (strategy.avg_pnl_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
          }
        />
        <StatCard
          label="Avg Return (%)"
          value={formatPercent(strategy.avg_return_pct)}
          color={
            (strategy.avg_return_pct ?? 0) >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }
        />
        <StatCard
          label="Best P&L (%)"
          value={formatPercent(strategy.best_pnl_pct)}
          color="text-emerald-400"
        />
        <StatCard
          label="Worst P&L (%)"
          value={formatPercent(strategy.worst_pnl_pct)}
          color="text-red-400"
        />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-8">
        <PnlChart reports={strategy.reports} />
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">All Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  P&L ($)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  P&L (%)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Return (%)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Positions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Capital
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {strategy.reports.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800">
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {r.report_date}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <PnlValue value={r.unrealized_pnl_abs} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <PnlValue value={r.unrealized_pnl_pct} suffix="%" />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <PnlValue value={r.total_account_return_pct} suffix="%" />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {r.open_positions ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {r.current_capital_estimate
                      ? formatCurrency(r.current_capital_estimate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedReport(r)}
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                    >
                      View Email
                    </button>
                  </td>
                </tr>
              ))}
              {strategy.reports.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <EmailViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function PnlValue({
  value,
  suffix = "",
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null) return <span className="text-zinc-500">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  const formatted = `${value >= 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
  return <span className={color}>{formatted}</span>;
}
